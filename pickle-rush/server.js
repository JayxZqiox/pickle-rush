'use strict';
/*
 * Pickle Rush server
 *  - serves the game from /public
 *  - JSON-file database (data/db.json) for accounts, MMR and match history
 *  - REST API: /api/signup /api/login /api/me /api/logout /api/look /api/ranked /api/rally /api/leaderboard
 *  - WebSocket rooms on /ws for LAN / online 1v1 and 2v2 (host-authoritative relay)
 *  No npm packages needed: the WebSocket server below is built in.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { EventEmitter } = require('events');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ------------------------------------------------------------------ */
/* Database: one JSON file, written atomically, debounced              */
/* ------------------------------------------------------------------ */
let db = { users: {}, sessions: {} };
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.users = db.users || {};
  db.sessions = db.sessions || {};
} catch (e) { /* first run */ }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DB_FILE);
    } catch (e) { console.error('Could not save database:', e.message); }
  }, 150);
}

/* AI ratings live on the server so a client can't claim a fake opponent rating */
const AI = {
  rookie: ['Rookie Rex', 650], amateur: ['Amateur Amy', 850], club: ['Club Casey', 1000], pro: ['Pro Paula', 1250],
  veteran: ['Veteran Victor', 1450], elite: ['Elite Elena', 1600], legend: ['Legend Leo', 1800],
  champion: ['Champion Kai', 2050], grandmaster: ['Grandmaster Mira', 2350], nightmare: ['Nightmare Nova', 2700],
};

const USER_RE = /^[A-Za-z0-9_]{3,14}$/;
const OUTFITS = ['classic', 'sunset', 'neon', 'ocean', 'royal', 'shadow', 'sakura', 'forest'];

function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
function cleanLook(l) {
  l = l && typeof l === 'object' ? l : {};
  return {
    gender: l.gender === 'girl' ? 'girl' : 'boy',
    skin: Math.max(0, Math.min(3, l.skin | 0)),
    hair: Math.max(0, Math.min(4, l.hair | 0)),
    outfit: OUTFITS.includes(l.outfit) ? l.outfit : 'classic',
  };
}
function publicUser(u) {
  return {
    username: u.username, mmr: u.mmr, peak: u.peak, wins: u.wins, losses: u.losses,
    bestRally: u.bestRally || 0, history: (u.history || []).slice(0, 20), look: u.look, created: u.created,
  };
}
function elo(mmr, opp, won) {
  const exp = 1 / (1 + Math.pow(10, (opp - mmr) / 400));
  let d = Math.round(40 * ((won ? 1 : 0) - exp));
  if (won && d < 3) d = 3;
  if (!won && d > -3) d = -3;
  return d;
}
function applyResult(u, delta, entry) {
  u.mmr = Math.max(0, u.mmr + delta);
  u.peak = Math.max(u.peak || 1000, u.mmr);
  if (entry.win) u.wins++; else u.losses++;
  u.history = [Object.assign({ delta, mmr: u.mmr, t: Date.now() }, entry)].concat(u.history || []).slice(0, 20);
}
function userFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  const s = db.sessions[token];
  return s ? db.users[s.user] || null : null;
}

/* ------------------------------------------------------------------ */
/* HTTP: API + static files                                            */
/* ------------------------------------------------------------------ */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 32 * 1024) { req.destroy(); resolve(null); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve(null));
  });
}
function authUser(req) {
  const h = req.headers.authorization || '';
  return userFromToken(h.startsWith('Bearer ') ? h.slice(7) : '');
}
function newSession(u) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { user: u.username.toLowerCase(), created: Date.now() };
  persist();
  return token;
}

async function handleApi(req, res, url) {
  const route = url.pathname;
  if (route === '/api/health') return json(res, 200, { ok: true, game: 'pickle-rush', players: Object.keys(db.users).length });

  if (route === '/api/leaderboard' && req.method === 'GET') {
    const rows = Object.values(db.users)
      .sort((a, b) => b.mmr - a.mmr || b.wins - a.wins)
      .slice(0, 100)
      .map((u) => ({ username: u.username, mmr: u.mmr, wins: u.wins, losses: u.losses, peak: u.peak, outfit: u.look && u.look.outfit }));
    return json(res, 200, { rows });
  }

  if (route === '/api/me' && req.method === 'GET') {
    const u = authUser(req);
    return u ? json(res, 200, { user: publicUser(u) }) : json(res, 401, { error: 'Not signed in' });
  }

  if (req.method !== 'POST') return json(res, 404, { error: 'Not found' });
  const body = await readBody(req);
  if (!body) return json(res, 413, { error: 'Request too large' });

  if (route === '/api/signup') {
    const name = String(body.username || '').trim();
    const pw = String(body.password || '');
    if (!USER_RE.test(name)) return json(res, 400, { error: 'Usernames are 3–14 letters, numbers or _' });
    if (pw.length < 4 || pw.length > 64) return json(res, 400, { error: 'Passwords need 4 to 64 characters' });
    const key = name.toLowerCase();
    if (db.users[key]) return json(res, 409, { error: 'That username is taken' });
    const salt = crypto.randomBytes(16).toString('hex');
    const u = {
      username: name, salt, pass: hashPassword(pw, salt), mmr: 1000, peak: 1000, wins: 0, losses: 0,
      bestRally: 0, history: [], look: cleanLook(body.look), created: Date.now(),
    };
    db.users[key] = u;
    const token = newSession(u);
    return json(res, 200, { token, user: publicUser(u) });
  }

  if (route === '/api/login') {
    const key = String(body.username || '').trim().toLowerCase();
    const u = db.users[key];
    if (!u) return json(res, 401, { error: 'Wrong username or password' });
    const a = Buffer.from(hashPassword(body.password || '', u.salt), 'hex');
    const b = Buffer.from(u.pass, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return json(res, 401, { error: 'Wrong username or password' });
    const token = newSession(u);
    return json(res, 200, { token, user: publicUser(u) });
  }

  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'Sign in first' });

  if (route === '/api/logout') {
    const h = req.headers.authorization || '';
    delete db.sessions[h.slice(7)]; persist();
    return json(res, 200, { ok: true });
  }
  if (route === '/api/look') {
    u.look = cleanLook(body.look); persist();
    return json(res, 200, { user: publicUser(u) });
  }
  if (route === '/api/ranked') {
    const ai = AI[body.ai];
    if (!ai) return json(res, 400, { error: 'Unknown opponent' });
    const won = !!body.won;
    const delta = elo(u.mmr, ai[1], won);
    const doubles = body.mode === 'doubles';
    applyResult(u, delta, { opp: doubles ? ai[0] + ' pair' : ai[0], mode: doubles ? 'Doubles' : 'Singles', score: String(body.score || '').slice(0, 9), win: won });
    persist();
    return json(res, 200, { user: publicUser(u), delta });
  }
  if (route === '/api/rally') {
    const best = Math.max(0, Math.min(9999, body.best | 0));
    if (best > (u.bestRally || 0)) { u.bestRally = best; persist(); }
    return json(res, 200, { user: publicUser(u) });
  }
  return json(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((e) => { console.error(e); json(res, 500, { error: 'Server error' }); });
  } else if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url);
  } else { res.writeHead(405); res.end(); }
});

/* ------------------------------------------------------------------ */
/* WebSocket rooms                                                     */
/* ------------------------------------------------------------------ */
/* Minimal WebSocket (RFC 6455) server, so the project has zero dependencies */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 64 * 1024;
class Sock extends EventEmitter {
  constructor(socket, head) {
    super();
    this.socket = socket; this.readyState = 1; this.buf = head && head.length ? Buffer.from(head) : Buffer.alloc(0); this.frag = [];
    socket.on('data', (d) => this._data(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
    if (this.buf.length) setImmediate(() => this._data(Buffer.alloc(0)));
  }
  _frame(op, payload) {
    const len = payload.length; let h;
    if (len < 126) h = Buffer.from([0x80 | op, len]);
    else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
    try { this.socket.write(Buffer.concat([h, payload])); } catch (e) { this._closed(); }
  }
  send(text) { if (this.readyState === 1) this._frame(0x1, Buffer.from(String(text), 'utf8')); }
  ping() { if (this.readyState === 1) this._frame(0x9, Buffer.alloc(0)); }
  terminate() { this.socket.destroy(); this._closed(); }
  _data(d) {
    if (d.length) this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > MAX_FRAME) return this.terminate();
      const maskAt = off; if (masked) off += 4;
      if (this.buf.length < off + len) return;
      let payload = Buffer.from(this.buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= this.buf[maskAt + (i & 3)];
      this.buf = this.buf.subarray(off + len);
      if (op === 0x8) { this._frame(0x8, Buffer.alloc(0)); this.socket.end(); return this._closed(); }
      if (op === 0x9) { this._frame(0xA, payload); continue; }
      if (op === 0xA) { this.emit('pong'); continue; }
      this.frag.push(payload);
      if (this.frag.reduce((n, b) => n + b.length, 0) > MAX_FRAME) return this.terminate();
      if (fin) { const msg = Buffer.concat(this.frag).toString('utf8'); this.frag = []; this.emit('message', msg); }
    }
  }
  _closed() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
}
const clients = new Set();
server.on('upgrade', (req, socket, head) => {
  let pathname = '';
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch (e) {}
  const key = req.headers['sec-websocket-key'];
  if (pathname !== '/ws' || String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || !key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const ws = new Sock(socket, head);
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  onConnection(ws);
});
const rooms = new Map();
let nextId = 1;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function send(ws, obj) { if (ws.readyState === 1) ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); }
function makeCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join(''); } while (rooms.has(c));
  return c;
}
function slotOf(room, ws) { return room.slots.indexOf(ws); }
function roomInfo(room) {
  return {
    code: room.code, name: room.name, mode: room.mode, state: room.state, host: slotOf(room, room.host),
    slots: room.slots.map((c) => c ? { name: c.meta.name, look: c.meta.look, account: !!c.meta.user, mmr: c.meta.user ? db.users[c.meta.user].mmr : null } : null),
  };
}
function roomList() {
  return [...rooms.values()].map((r) => ({ code: r.code, name: r.name, mode: r.mode, state: r.state, count: r.slots.filter(Boolean).length, max: r.slots.length }));
}
function broadcastRooms() {
  const msg = JSON.stringify({ t: 'rooms', rooms: roomList() });
  for (const ws of clients) if (!ws.meta.room) send(ws, msg);
}
function broadcastRoom(room) {
  const info = roomInfo(room);
  room.slots.forEach((c, i) => { if (c) send(c, { t: 'room', room: info, you: i }); });
}
function leaveRoom(ws, notice) {
  const room = ws.meta.room;
  if (!room) return;
  ws.meta.room = null;
  const i = slotOf(room, ws);
  if (i >= 0) room.slots[i] = null;
  if (room.host === ws) {
    room.slots.forEach((c) => { if (c) { c.meta.room = null; send(c, { t: 'closed', reason: notice || 'The host left the room.' }); } });
    rooms.delete(room.code);
  } else {
    broadcastRoom(room);
  }
  broadcastRooms();
}
function cleanName(n) {
  const s = String(n || '').replace(/[^\w \-]/g, '').trim().slice(0, 14);
  return s || 'Guest' + crypto.randomInt(100, 999);
}

function rankOnline(room, winTeam, score) {
  // slots 0 and 2 are the near team (team 1), slots 1 and 3 the far team (team 2)
  const teamOf = (i) => (i % 2 === 0 ? 1 : 2);
  const members = room.slots.map((c, i) => ({ c, i, team: teamOf(i), u: c && c.meta.user ? db.users[c.meta.user] : null }));
  const t1 = members.filter((m) => m.team === 1), t2 = members.filter((m) => m.team === 2);
  if (!t1.some((m) => m.u) || !t2.some((m) => m.u)) {
    room.slots.forEach((c) => c && send(c, { t: 'mmr', ranked: false }));
    return;
  }
  const avg = (list) => list.reduce((s, m) => s + (m.u ? m.u.mmr : 1000), 0) / list.length;
  const before = { 1: avg(t1), 2: avg(t2) };
  const names = (team) => members.filter((m) => m.team === team).map((m) => (m.c ? m.c.meta.name : 'CPU')).join(' & ');
  for (const m of members) {
    if (!m.u) { if (m.c) send(m.c, { t: 'mmr', ranked: false }); continue; }
    const won = m.team === winTeam;
    const delta = elo(m.u.mmr, before[m.team === 1 ? 2 : 1], won);
    applyResult(m.u, delta, { opp: names(m.team === 1 ? 2 : 1), mode: room.mode === '2v2' ? 'Online 2v2' : 'Online 1v1', score: String(score || '').slice(0, 9), win: won });
    send(m.c, { t: 'mmr', ranked: true, delta, user: publicUser(m.u) });
  }
  persist();
}

function onConnection(ws) {
  ws.meta = { id: nextId++, user: null, name: 'Guest', look: cleanLook({}), room: null, alive: true };
  ws.on('pong', () => { ws.meta.alive = true; });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    const room = ws.meta.room;

    switch (m.t) {
      case 'hello': {
        const u = userFromToken(m.token);
        ws.meta.user = u ? u.username.toLowerCase() : null;
        ws.meta.name = u ? u.username : cleanName(m.name);
        ws.meta.look = cleanLook(m.look || (u && u.look));
        send(ws, { t: 'welcome', id: ws.meta.id, name: ws.meta.name, account: !!u });
        send(ws, { t: 'rooms', rooms: roomList() });
        if (room) broadcastRoom(room);
        break;
      }
      case 'list': send(ws, { t: 'rooms', rooms: roomList() }); break;
      case 'create': {
        leaveRoom(ws);
        const mode = m.mode === '2v2' ? '2v2' : '1v1';
        const r = { code: makeCode(), name: cleanName(m.name || ws.meta.name + '’s room'), mode, state: 'lobby', host: ws, slots: new Array(mode === '2v2' ? 4 : 2).fill(null) };
        r.slots[0] = ws; ws.meta.room = r; rooms.set(r.code, r);
        broadcastRoom(r); broadcastRooms();
        break;
      }
      case 'join': {
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!r) return send(ws, { t: 'error', msg: 'No room with that code.' });
        if (r.state !== 'lobby') return send(ws, { t: 'error', msg: 'That match has already started.' });
        const free = r.slots.indexOf(null);
        if (free < 0) return send(ws, { t: 'error', msg: 'That room is full.' });
        leaveRoom(ws);
        r.slots[free] = ws; ws.meta.room = r;
        broadcastRoom(r); broadcastRooms();
        break;
      }
      case 'slot': {
        if (!room || room.state !== 'lobby') return;
        const to = m.i | 0;
        if (to < 0 || to >= room.slots.length || room.slots[to]) return;
        room.slots[slotOf(room, ws)] = null; room.slots[to] = ws;
        broadcastRoom(room);
        break;
      }
      case 'leave': leaveRoom(ws); send(ws, { t: 'rooms', rooms: roomList() }); break;
      case 'start': {
        if (!room || room.host !== ws) return;
        room.state = 'playing';
        room.matchId = (room.matchId || 0) + 1;
        const info = roomInfo(room);
        room.slots.forEach((c, i) => c && send(c, { t: 'start', room: info, you: i }));
        broadcastRooms();
        break;
      }
      case 'lobby': {
        if (!room || room.host !== ws) return;
        room.state = 'lobby'; broadcastRoom(room); broadcastRooms();
        break;
      }
      case 'in': {
        // guest input -> host
        if (!room || room.host === ws) return;
        m.s = slotOf(room, ws);
        send(room.host, m);
        break;
      }
      case 'st': {
        // host snapshot -> everyone else in the room (forward the raw text)
        if (!room || room.host !== ws) return;
        room.slots.forEach((c) => { if (c && c !== ws) send(c, raw); });
        break;
      }
      case 'result': {
        if (!room || room.host !== ws || room.state !== 'playing' || room.ranked === room.matchId) return;
        room.ranked = room.matchId;
        rankOnline(room, m.win === 2 ? 2 : 1, m.score);
        break;
      }
      case 'ping': send(ws, { t: 'pong', ts: m.ts }); break;
    }
  });

  ws.on('close', () => leaveRoom(ws));
}

setInterval(() => {
  for (const ws of clients) {
    if (!ws.meta.alive) { ws.terminate(); continue; }
    ws.meta.alive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 20000);

server.listen(PORT, '0.0.0.0', () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  }
  console.log('\n  Pickle Rush is running!\n');
  console.log(`  On this computer:   http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`  On your Wi-Fi (LAN): http://${ip}:${PORT}`));
  console.log('\n  Open the LAN address on phones, iPads and other PCs on the same Wi-Fi.');
  console.log('  Press Ctrl+C to stop.\n');
});
