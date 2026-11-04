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

const CAT = require('./public/catalog.js');   // shared with the game: items, prices, levels, rewards
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ------------------------------------------------------------------ */
/* Database                                                            */
/*  - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set: accounts   */
/*    live in Upstash Redis (free, permanent; use this on Render).      */
/*  - otherwise: one JSON file in DATA_DIR (fine on your own PC; on     */
/*    Render's free plan this file is wiped whenever the server sleeps).*/
/* ------------------------------------------------------------------ */
let db = { users: {}, sessions: {} };
const UP_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const STORAGE = UP_URL && UP_TOKEN ? 'upstash' : 'file';
const SESSION_DAYS = 180;
const dirtyUsers = new Set(), dirtySessions = new Set(), droppedSessions = new Set(), deletedUsers = new Set();

async function upstash(path, body) {
  const r = await fetch(UP_URL + path, { method: 'POST', headers: { Authorization: 'Bearer ' + UP_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Upstash HTTP ' + r.status);
  return r.json();
}
async function upstashScan(prefix) {
  const out = {}; let cursor = '0';
  do {
    const { result } = await upstash('', ['SCAN', cursor, 'MATCH', prefix + '*', 'COUNT', '500']);
    cursor = String(result[0]);
    const keys = result[1] || [];
    if (keys.length) {
      const got = await upstash('', ['MGET', ...keys]);
      keys.forEach((k, n) => { const v = got.result[n]; if (v) { try { out[k.slice(prefix.length)] = JSON.parse(v); } catch (e) {} } });
    }
  } while (cursor !== '0');
  return out;
}
async function loadDb() {
  if (STORAGE === 'upstash') {
    db.users = await upstashScan('pr:u:');
    db.sessions = await upstashScan('pr:s:');
  } else {
    try {
      const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db.users = d.users || {}; db.sessions = d.sessions || {};
    } catch (e) { /* first run */ }
  }
  for (const u of Object.values(db.users)) {
    CAT.normalize(u); u.look = baseLook(u.look);
    for (const k of ['friends', 'reqIn', 'reqOut']) if (!Array.isArray(u[k])) u[k] = [];
  }
  // older versions added friends one-way: keep mutual pairs, turn the rest into pending requests
  for (const [key, u] of Object.entries(db.users)) {
    u.friends = u.friends.filter((k) => {
      const f = db.users[k]; if (!f) return false;
      if (f.friends.includes(key)) return true;
      if (!u.reqOut.includes(k)) u.reqOut.push(k);
      if (!f.reqIn.includes(key)) f.reqIn.push(key);
      return false;
    });
  }
  const cutoff = Date.now() - SESSION_DAYS * 864e5;
  for (const [t, s] of Object.entries(db.sessions)) if (!s || s.created < cutoff || !db.users[s.user]) delete db.sessions[t];
}
let saveTimer = null, saving = false;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}
const touchUser = (u) => { if (u) dirtyUsers.add(u.username.toLowerCase()); persist(); };
const touchSession = (t) => { dirtySessions.add(t); droppedSessions.delete(t); persist(); };
const dropSession = (t) => { delete db.sessions[t]; dirtySessions.delete(t); droppedSessions.add(t); persist(); };
async function flush() {
  if (saving) { persist(); return; }
  saving = true;
  try {
    if (STORAGE === 'upstash') {
      const cmds = [];
      for (const k of dirtyUsers) if (db.users[k]) cmds.push(['SET', 'pr:u:' + k, JSON.stringify(db.users[k])]);
      for (const k of deletedUsers) if (!db.users[k]) cmds.push(['DEL', 'pr:u:' + k]);
      deletedUsers.clear();
      for (const t of dirtySessions) if (db.sessions[t]) cmds.push(['SET', 'pr:s:' + t, JSON.stringify(db.sessions[t]), 'EX', String(SESSION_DAYS * 86400)]);
      for (const t of droppedSessions) cmds.push(['DEL', 'pr:s:' + t]);
      const users = [...dirtyUsers], sess = [...dirtySessions], drops = [...droppedSessions];
      dirtyUsers.clear(); dirtySessions.clear(); droppedSessions.clear();
      if (cmds.length) {
        try {
          const res = await upstash('/pipeline', cmds);
          if (Array.isArray(res) && res.some((x) => x && x.error)) throw new Error(res.find((x) => x.error).error);
        } catch (e) {
          // keep everything queued and try again shortly, so nothing is lost
          users.forEach((k) => dirtyUsers.add(k)); sess.forEach((t) => dirtySessions.add(t)); drops.forEach((t) => droppedSessions.add(t));
          console.error('Database save failed, retrying:', e.message);
          setTimeout(persist, 3000);
        }
      }
    } else {
      dirtyUsers.clear(); dirtySessions.clear(); droppedSessions.clear();
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DB_FILE);
    }
  } catch (e) { console.error('Could not save database:', e.message); }
  saving = false;
}

const USER_RE = /^[A-Za-z0-9_]{3,14}$/;

function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
// account appearance stores only the body; worn items live in equip
function baseLook(l) { const c = CAT.cleanLook(l); return { gender: c.gender, skin: c.skin, hair: c.hair, hairStyle: c.hairStyle, body: c.body, height: c.height, nation: c.nation }; }
function wornLook(u) { return CAT.cleanLook(Object.assign({}, u.look, u.equip)); }
function publicUser(u) {
  const lv = CAT.levelInfo(u.xp);
  return {
    username: u.username, mmr: u.mmr, peak: u.peak, wins: u.wins, losses: u.losses,
    bestRally: u.bestRally || 0, history: (u.history || []).slice(0, 20), look: u.look, created: u.created,
    coins: u.coins, xp: u.xp, level: lv.level, owned: u.owned, equip: u.equip, beaten: u.beaten, keys: u.keys | 0,
    stats: u.stats || {}, ach: u.ach || [], ch: u.ch || null, season: { id: u.season, ends: CAT.seasonEnds(), peak: u.seasonPeak }, seasons: u.seasons || [],
    seasonNote: u.seasonNote || null, hasRecovery: !!u.recHash, owner: isOwner(u), openMatch: !!u.open,
    trophies: u.trophies || {}, tour: u.tour || null, tutorialDone: !!u.tutorialDone,
  };
}
/* ---------- profiles + friends ---------- */
function notifyUser(key, msg) { for (const c of clients) if (c.meta && c.meta.user === key) send(c, msg); }
function onlineSet() { const s = new Set(); for (const c of clients) if (c.meta && c.meta.user) s.add(c.meta.user); return s; }
function profileOf(u, online) {
  const lv = CAT.levelInfo(u.xp), d = CAT.dupr(u.mmr);
  return { trophies: u.trophies || {}, ach: (u.ach || []).length, reports: (u.reports || []).length, banned: !!u.banned, username: u.username, level: lv.level, mmr: u.mmr, peak: u.peak, dupr: +d.toFixed(3), tier: CAT.duprTier(d), wins: u.wins, losses: u.losses,
    bestRally: u.bestRally || 0, look: wornLook(u), history: (u.history || []).slice(0, 5), created: u.created, online: online ? online.has(u.username.toLowerCase()) : false };
}
function applyResult(u, delta, entry) {
  u.mmr = Math.max(0, u.mmr + delta);
  u.peak = Math.max(u.peak || 0, u.mmr);
  if (entry.win) u.wins++; else u.losses++;
  u.history = [Object.assign({ delta, mmr: u.mmr, t: Date.now() }, entry)].concat(u.history || []).slice(0, 20);
}
function userFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  const s = db.sessions[token];
  if (!s) return null;
  if (s.created < Date.now() - SESSION_DAYS * 864e5) { dropSession(token); return null; }
  return db.users[s.user] || null;
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
/* ---------- rate limits (in memory) ---------- */
const LIMITS = new Map();
function ipOf(req) { return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(); }
function limitHit(key, max, windowMs) {      // count one event; true when over the limit
  const now = Date.now(); let r = LIMITS.get(key);
  if (!r || now - r.first > windowMs) { r = { n: 0, first: now, win: windowMs }; LIMITS.set(key, r); }
  r.n++; return r.n > max;
}
function limitLeft(key, max) { const r = LIMITS.get(key); if (!r || Date.now() - r.first > r.win || r.n < max) return 0; return Math.ceil((r.first + r.win - Date.now()) / 60000); }
setInterval(() => { const now = Date.now(); for (const [k, r] of LIMITS) if (now - r.first > r.win) LIMITS.delete(k); }, 60000).unref();
/* ---------- recovery codes: shown once at signup, stored only as a hash ---------- */
const REC_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRecovery(u) {
  let code = ''; for (let i = 0; i < 12; i++) code += REC_ABC[crypto.randomInt(REC_ABC.length)];
  code = code.match(/.{4}/g).join('-');
  u.recSalt = crypto.randomBytes(12).toString('hex'); u.recHash = hashPassword(code.replace(/-/g, ''), u.recSalt);
  return code;
}
const OWNER = String(process.env.OWNER_USERNAME || '').trim().toLowerCase();
const isOwner = (u) => !!u && !!OWNER && u.username.toLowerCase() === OWNER;
function rollSeason(u) { const r = CAT.seasonRoll(u); if (r) { u.seasonNote = r; touchUser(u); } CAT.ensureChallenges(u); return r; }
// a ranked match that was started but never finished counts as a loss (quitting)
function settleAbandoned(u, maxAgeMs) {
  if (!u.open || Date.now() - u.open.t < (maxAgeMs || 0)) return null;
  const o = u.open; u.open = null;
  const r = CAT.applyMatch(u, o.ai, false, 'Quit', o.mode === 'doubles');
  if (typeof r === 'string') return null;
  if (r.practice) { touchUser(u); return { delta: 0, practice: true }; }      // leaving practice costs nothing
  u.mmr = Math.max(0, u.mmr - 10);                 // extra penalty for leaving
  if (u.history && u.history[0]) { u.history[0].delta -= 10; u.history[0].mmr = u.mmr; u.history[0].score = 'Quit'; }
  touchUser(u);
  return { delta: r.delta - 10 };
}
function authUser(req) {
  const h = req.headers.authorization || '';
  const u = userFromToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (u && u.banned) return null;
  return u;
}
function newSession(u) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { user: u.username.toLowerCase(), created: Date.now() };
  touchSession(token);
  return token;
}

async function handleApi(req, res, url) {
  const route = url.pathname;
  if (route === '/api/health') return json(res, 200, { ok: true, game: 'pickle-rush', players: Object.keys(db.users).length, storage: STORAGE, temporary: STORAGE === 'file' && !!process.env.RENDER });

  if (route === '/api/leaderboard' && req.method === 'GET') {
    for (const x of Object.values(db.users)) rollSeason(x);
    const rows = Object.values(db.users).filter((x) => !x.banned && !x.flagged)
      .sort((a, b) => b.mmr - a.mmr || b.wins - a.wins)
      .slice(0, 100)
      .map((u) => ({ username: u.username, mmr: u.mmr, wins: u.wins, losses: u.losses, peak: u.peak, level: CAT.levelInfo(u.xp).level, dupr: +CAT.dupr(u.mmr).toFixed(3), nation: (u.look && u.look.nation) || '' }));
    return json(res, 200, { rows });
  }

  const pm = route.match(/^\/api\/player\/([A-Za-z0-9_]{3,14})$/);
  if (pm && req.method === 'GET') {
    const u = db.users[pm[1].toLowerCase()];
    return u ? json(res, 200, { player: profileOf(u, onlineSet()) }) : json(res, 404, { error: 'No player with that name' });
  }
  if (route === '/api/friends' && req.method === 'GET') {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: 'Sign in first' });
    const on = onlineSet();
    for (const k of ['friends', 'reqIn', 'reqOut']) if (!Array.isArray(u[k])) u[k] = [];
    const list = (u.friends || []).map((k) => db.users[k]).filter(Boolean).map((f) => profileOf(f, on)).sort((a, b) => (b.online - a.online) || b.mmr - a.mmr);
    const incoming = (u.reqIn || []).map((k) => db.users[k]).filter(Boolean).map((f) => profileOf(f, on));
    const outgoing = (u.reqOut || []).map((k) => db.users[k]).filter(Boolean).map((f) => f.username);
    return json(res, 200, { friends: list, incoming, outgoing });
  }
  if (route === '/api/me' && req.method === 'GET') {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: 'Not signed in' });
    rollSeason(u); settleAbandoned(u, 30 * 60000);
    const out = publicUser(u); if (u.seasonNote) { u.seasonNote = null; touchUser(u); }
    return json(res, 200, { user: out });
  }

  if (req.method !== 'POST') return json(res, 404, { error: 'Not found' });
  const body = await readBody(req);
  if (!body) return json(res, 413, { error: 'Request too large' });

  if (route === '/api/clientError') {
    if (!limitHit('err:' + ipOf(req), 20, 3600000)) console.log('[client error]', JSON.stringify({ msg: String(body.msg || '').slice(0, 300), at: String(body.at || '').slice(0, 300), ua: String(body.ua || '').slice(0, 160), page: String(body.page || '').slice(0, 60) }));
    return json(res, 200, { ok: true });
  }
  if (route === '/api/signup') {
    const name = String(body.username || '').trim();
    const pw = String(body.password || '');
    if (!USER_RE.test(name)) return json(res, 400, { error: 'Usernames are 3–14 letters, numbers or _' });
    if (CAT.badName(name)) return json(res, 400, { error: 'Please pick a different username' });
    if (pw.length < 4 || pw.length > 64) return json(res, 400, { error: 'Passwords need 4 to 64 characters' });
    if (limitHit('signup:' + ipOf(req), 6, 3600000)) return json(res, 429, { error: 'Too many new accounts from this connection. Try again later.' });
    const key = name.toLowerCase();
    if (db.users[key]) return json(res, 409, { error: 'That username is taken' });
    const salt = crypto.randomBytes(16).toString('hex');
    const u = Object.assign({ username: name, salt, pass: hashPassword(pw, salt), look: baseLook(body.look), created: Date.now() }, CAT.newProgress());
    const recovery = newRecovery(u); CAT.ensureChallenges(u); u.season = CAT.seasonId(); u.seasonPeak = 0;
    db.users[key] = u; touchUser(u);
    const token = newSession(u);
    return json(res, 200, { token, user: publicUser(u), recovery });
  }
  if (route === '/api/recover') {
    const key = String(body.username || '').trim().toLowerCase(), u = db.users[key];
    const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), pw = String(body.password || '');
    if (limitHit('recover:' + ipOf(req), 10, 3600000)) return json(res, 429, { error: 'Too many tries. Try again in an hour.' });
    if (pw.length < 4 || pw.length > 64) return json(res, 400, { error: 'Passwords need 4 to 64 characters' });
    if (!u || !u.recHash || hashPassword(code, u.recSalt) !== u.recHash) return json(res, 401, { error: 'That username and recovery code don’t match' });
    if (u.banned) return json(res, 403, { error: 'This account is banned' });
    u.salt = crypto.randomBytes(16).toString('hex'); u.pass = hashPassword(pw, u.salt);
    for (const [t, ss] of Object.entries(db.sessions)) if (ss.user === key) dropSession(t);      // log out everywhere else
    const recovery = newRecovery(u); touchUser(u); LIMITS.delete('login:' + key);
    return json(res, 200, { token: newSession(u), user: publicUser(u), recovery });
  }

  if (route === '/api/login') {
    const key = String(body.username || '').trim().toLowerCase(), ip = ipOf(req);
    const wait = Math.max(limitLeft('login:' + key, 5), limitLeft('loginip:' + ip, 30));
    if (wait) return json(res, 429, { error: `Too many wrong passwords. Try again in ${wait} minute${wait > 1 ? 's' : ''}, or use your recovery code.` });
    const u = db.users[key];
    const fail = () => { limitHit('login:' + key, 5, 600000); limitHit('loginip:' + ip, 30, 600000); return json(res, 401, { error: 'Wrong username or password' }); };
    if (!u) return fail();
    const a = Buffer.from(hashPassword(body.password || '', u.salt), 'hex');
    const b = Buffer.from(u.pass, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail();
    if (u.banned) return json(res, 403, { error: 'This account is banned' });
    LIMITS.delete('login:' + key); rollSeason(u);
    const token = newSession(u);
    return json(res, 200, { token, user: publicUser(u) });
  }

  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'Sign in first' });

  if (route === '/api/logout') {
    const h = req.headers.authorization || '';
    dropSession(h.slice(7));
    return json(res, 200, { ok: true });
  }
  if (route === '/api/look') {
    u.look = baseLook(body.look); touchUser(u);
    return json(res, 200, { user: publicUser(u) });
  }
  if (route === '/api/ranked/start') {
    const ai = String(body.ai || '');
    if (!CAT.aiUnlocked(u.beaten, ai)) return json(res, 400, { error: 'That opponent is still locked' });
    const quit = settleAbandoned(u, 0);            // an unfinished earlier match counts as a loss
    u.open = { id: crypto.randomBytes(8).toString('hex'), ai, mode: body.mode === 'doubles' ? 'doubles' : 'singles', t: Date.now() };
    touchUser(u);
    return json(res, 200, { matchId: u.open.id, quit, user: publicUser(u) });
  }
  if (route === '/api/ranked/abandon') {
    if (!u.open || u.open.id !== body.matchId) return json(res, 200, { ok: true, delta: 0 });
    const q = settleAbandoned(u, 0);
    return json(res, 200, { ok: true, delta: q ? q.delta : 0, user: publicUser(u) });
  }
  if (route === '/api/ranked') {
    // the result must belong to a match the server saw start, take a believable time and have a real final score
    const o = u.open, ai = String(body.ai || ''), won = !!body.won;
    if (!o || o.id !== body.matchId || o.ai !== ai) return json(res, 400, { error: 'This match wasn’t started properly, so it doesn’t count.' });
    const sc = CAT.parseScore(body.score), secs = (Date.now() - o.t) / 1000;
    if (!sc || (won !== (sc.a > sc.b))) { u.open = null; touchUser(u); return json(res, 400, { error: 'That score isn’t a finished game.' }); }
    if (secs < Math.max(40, (sc.a + sc.b) * 3.5)) { u.open = null; touchUser(u); return json(res, 400, { error: 'That match was too short to count.' }); }
    u.recentWins = (u.recentWins || []).filter((t) => Date.now() - t < 3600000);
    if (won && u.recentWins.length >= 20) return json(res, 429, { error: 'That’s a lot of wins this hour! Take a break and try again soon.' });
    u.open = null;
    const r = CAT.applyMatch(u, ai, won, `${sc.a}–${sc.b}`, o.mode === 'doubles');
    if (typeof r === 'string') return json(res, 400, { error: r });
    if (won) u.recentWins.push(Date.now());
    const prog = CAT.trackStats(u, Object.assign({}, body.stats, { matches: 1, rankedWins: won && !r.practice ? 1 : 0, online: 0, points: sc.a }));
    touchUser(u);
    return json(res, 200, { user: publicUser(u), result: r, delta: r.delta, prog });
  }
  if (route === '/api/progress') {
    // stats from unranked matches (local, rally, online) for challenges and achievements
    const now = Date.now();
    if (now - (u.lastProg || 0) < 30000) return json(res, 200, { user: publicUser(u), prog: null });
    u.lastProg = now;
    const prog = CAT.trackStats(u, Object.assign({}, body.stats, { rankedWins: 0, online: 0, matches: body.match ? 1 : 0 }));
    touchUser(u);
    return json(res, 200, { user: publicUser(u), prog });
  }
  if (route === '/api/password') {
    const a = Buffer.from(hashPassword(String(body.current || ''), u.salt), 'hex'), b = Buffer.from(u.pass, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return json(res, 401, { error: 'Your current password is wrong' });
    const pw = String(body.password || ''); if (pw.length < 4 || pw.length > 64) return json(res, 400, { error: 'Passwords need 4 to 64 characters' });
    u.salt = crypto.randomBytes(16).toString('hex'); u.pass = hashPassword(pw, u.salt);
    const me = u.username.toLowerCase(), keep = (req.headers.authorization || '').slice(7);
    for (const [t, ss] of Object.entries(db.sessions)) if (ss.user === me && t !== keep) dropSession(t);    // other devices are logged out
    touchUser(u);
    return json(res, 200, { ok: true });
  }
  if (route === '/api/account/delete') {
    if (isOwner(u)) return json(res, 400, { error: 'The owner account can’t be deleted here' });
    const a = Buffer.from(hashPassword(String(body.password || ''), u.salt), 'hex'), b = Buffer.from(u.pass, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return json(res, 401, { error: 'Wrong password' });
    const me = u.username.toLowerCase();
    for (const x of Object.values(db.users)) {
      let changed = false;
      for (const k of ['friends', 'reqIn', 'reqOut']) if (Array.isArray(x[k]) && x[k].includes(me)) { x[k] = x[k].filter((y) => y !== me); changed = true; }
      if (changed) touchUser(x);
    }
    for (const [t, ss] of Object.entries(db.sessions)) if (ss.user === me) dropSession(t);
    delete db.users[me]; dirtyUsers.delete(me); deletedUsers.add(me); persist();
    return json(res, 200, { ok: true });
  }
  if (route === '/api/tutorial') {
    if (u.tutorialDone) return json(res, 200, { user: publicUser(u), reward: null });
    u.tutorialDone = true; const reward = CAT.addRewards(u, { coins: 200, xp: 50 }); u.keys = (u.keys | 0) + 1; touchUser(u);
    return json(res, 200, { user: publicUser(u), reward });
  }
  if (route === '/api/tour/start') {
    const cup = String(body.cup || '');
    if (!CAT.CUP_BY[cup]) return json(res, 400, { error: 'Unknown tournament' });
    const t = CAT.tourEnter(u, cup, body.teamName, (u.look && u.look.nation) || '');     // pays the ticket
    if (typeof t === 'string') return json(res, 400, { error: t });
    touchUser(u);
    return json(res, 200, { tour: u.tour, user: publicUser(u) });
  }
  if (route === '/api/tour/result') {
    const t = u.tour, won = !!body.won;
    if (!t || t.id !== body.id || !t.alive) return json(res, 400, { error: 'That tournament isn’t running' });
    const sc = CAT.parseScore(body.score), secs = (Date.now() - t.t) / 1000;
    if (!sc || won !== (sc.a > sc.b)) return json(res, 400, { error: 'That score isn’t a finished game' });
    if (secs < Math.max(40, (sc.a + sc.b) * 3.5)) return json(res, 400, { error: 'That match was too short to count' });
    const r = CAT.tourResult(u, t, won, `${sc.a}-${sc.b}`);
    if (typeof r === 'string') return json(res, 400, { error: r });
    const prog = CAT.trackStats(u, Object.assign({}, body.stats, { matches: 1, rankedWins: 0, online: 0, points: sc.a }));
    touchUser(u);
    return json(res, 200, { tour: t, res: r, prog, user: publicUser(u) });
  }
  if (route === '/api/tour/watch') {
    const t = u.tour;
    if (!t || t.id !== body.id) return json(res, 400, { error: 'That tournament isn’t running' });
    const err = CAT.tourDecide(t, String(body.key || ''), body.winner | 0);
    if (err) return json(res, 400, { error: err });
    touchUser(u);
    return json(res, 200, { tour: t, user: publicUser(u) });
  }
  if (route === '/api/tour/quit') { if (u.tour) { u.tour.alive = false; touchUser(u); } return json(res, 200, { ok: true, user: publicUser(u) }); }
  if (route === '/api/recovery/new') return json(res, 200, { recovery: (() => { const c = newRecovery(u); touchUser(u); return c; })() });
  if (route === '/api/report') {
    const key = String(body.username || '').trim().toLowerCase(), t = db.users[key], me = u.username.toLowerCase();
    if (!t || key === me) return json(res, 400, { error: 'Can’t report that player' });
    if (limitHit('report:' + me, 10, 3600000)) return json(res, 429, { error: 'Too many reports. Try again later.' });
    t.reports = (t.reports || []).filter((r) => r.by !== me).concat([{ by: me, reason: String(body.reason || 'name').slice(0, 40), t: Date.now() }]).slice(-50);
    if (new Set(t.reports.map((r) => r.by)).size >= 3 && !t.cleared) t.flagged = true;   // hidden from the leaderboard until reviewed
    touchUser(t);
    return json(res, 200, { ok: true });
  }
  if (route === '/api/mod/list') {
    if (!isOwner(u)) return json(res, 403, { error: 'Owner only' });
    const list = Object.values(db.users).filter((x) => !isOwner(x) && ((x.reports || []).length || x.banned)).map((x) => ({ username: x.username, reports: (x.reports || []).length, reasons: [...new Set((x.reports || []).map((r) => r.reason))], flagged: !!x.flagged, banned: !!x.banned }));
    return json(res, 200, { list });
  }
  if (route === '/api/mod/action') {
    if (!isOwner(u)) return json(res, 403, { error: 'Owner only' });
    const t = db.users[String(body.username || '').toLowerCase()];
    if (!t || isOwner(t)) return json(res, 400, { error: 'Can’t do that' });
    if (body.action === 'ban'){ t.banned = true; for (const [k, ss] of Object.entries(db.sessions)) if (ss.user === t.username.toLowerCase()) dropSession(k); }
    if (body.action === 'unban') t.banned = false;
    if (body.action === 'clear'){ t.reports = []; t.flagged = false; t.cleared = true; }
    touchUser(t);
    return json(res, 200, { ok: true });
  }
  if (route === '/api/rally') {
    const n = Math.max(0, Math.min(500, body.returns | 0));
    const now = Date.now();
    let rew = null;
    if (now - (u.lastRally || 0) > 8000 && n > 0) { u.lastRally = now; rew = CAT.addRewards(u, CAT.rallyRewards(n)); CAT.trackStats(u, { longRally: Math.min(n, 200) }); }
    if (n > (u.bestRally || 0)) u.bestRally = n;
    touchUser(u);
    return json(res, 200, { user: publicUser(u), result: rew });
  }
  const fm = route.match(/^\/api\/friends\/(add|accept|decline|cancel|remove)$/);
  if (fm) {
    const key = String(body.username || '').trim().toLowerCase(), me = u.username.toLowerCase();
    const f = db.users[key];
    if (!f) return json(res, 404, { error: 'No player with that name' });
    if (key === me) return json(res, 400, { error: 'That’s you!' });
    for (const x of [u, f]) for (const k of ['friends', 'reqIn', 'reqOut']) if (!Array.isArray(x[k])) x[k] = [];
    const drop = (arr, k) => { const i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); };
    const befriend = () => { if (!u.friends.includes(key)) u.friends.push(key); if (!f.friends.includes(me)) f.friends.push(me); drop(u.reqIn, key); drop(u.reqOut, key); drop(f.reqIn, me); drop(f.reqOut, me); };
    let status;
    switch (fm[1]) {
      case 'add':
        if (u.friends.includes(key)) { status = 'friends'; break; }
        if (u.reqIn.includes(key)) { befriend(); status = 'friends'; notifyUser(key, { t: 'notify', kind: 'accepted', from: u.username }); break; }   // they already asked you
        if (u.friends.length >= 100) return json(res, 400, { error: 'Friend list is full' });
        if (!u.reqOut.includes(key)) u.reqOut.push(key);
        if (!f.reqIn.includes(me)) f.reqIn.push(me);
        status = 'pending'; notifyUser(key, { t: 'notify', kind: 'request', from: u.username });
        break;
      case 'accept':
        if (!u.reqIn.includes(key)) return json(res, 400, { error: 'No request from that player' });
        befriend(); status = 'friends'; notifyUser(key, { t: 'notify', kind: 'accepted', from: u.username });
        break;
      case 'decline': drop(u.reqIn, key); drop(f.reqOut, me); status = 'none'; break;
      case 'cancel': drop(u.reqOut, key); drop(f.reqIn, me); status = 'none'; notifyUser(key, { t: 'notify', kind: 'update' }); break;
      case 'remove': drop(u.friends, key); drop(f.friends, me); status = 'none'; notifyUser(key, { t: 'notify', kind: 'update' }); break;
    }
    CAT.checkAchievements(u); CAT.checkAchievements(f);
    touchUser(u); touchUser(f);
    return json(res, 200, { ok: true, status });
  }
  if (route === '/api/chest') {
    const r = CAT.openChest(u, String(body.id || ''), !!body.key);
    if (typeof r === 'string') return json(res, 400, { error: r });
    r.achievements = CAT.checkAchievements(u);
    touchUser(u);
    return json(res, 200, { user: publicUser(u), result: r });
  }
  if (route === '/api/daily') {
    const got = CAT.claimDaily(u);
    if (got) touchUser(u);
    return json(res, 200, { user: publicUser(u), bonus: got });
  }
  if (route === '/api/buy') {
    const err = CAT.buy(u, String(body.id || ''));
    if (err) return json(res, 400, { error: err });
    touchUser(u);
    return json(res, 200, { user: publicUser(u) });
  }
  if (route === '/api/equip') {
    const err = CAT.equip(u, String(body.slot || ''), String(body.id || ''));
    if (err) return json(res, 400, { error: err });
    touchUser(u);
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
    if (/(privacy|terms)\.html$/.test(file) && process.env.CONTACT_EMAIL) buf = Buffer.from(String(buf).split('YOUR-EMAIL@example.com').join(String(process.env.CONTACT_EMAIL).replace(/[<>&"]/g, '')));
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ['.html', '.js', '.webmanifest', '.json', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=3600' });
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
const COURTS = CAT.ITEMS.filter((i) => i.slot === 'court').map((i) => i.id);
function roomInfo(room) {
  return {
    code: room.code, name: room.name, mode: room.mode, state: room.state, host: slotOf(room, room.host), court: room.court || 'random', tour: tourInfo(room), tourMode: room.tourMode || null,
    slots: room.slots.map((c) => c ? { name: c.meta.name, look: c.meta.look, account: !!c.meta.user, mmr: c.meta.user && db.users[c.meta.user] ? db.users[c.meta.user].mmr : null,
      ready: c === room.host || !!c.meta.ready, level: c.meta.user && db.users[c.meta.user] ? CAT.levelInfo(db.users[c.meta.user].xp).level : null,
      away: !!c.away, awayLeft: c.away ? Math.max(0, Math.ceil((c.until - Date.now()) / 1000)) : 0 } : null),
  };
}
/* Reconnection: a dropped player keeps their slot for GRACE ms and can come back with their rejoin id. */
const GRACE = 30000;
const newRid = () => crypto.randomBytes(12).toString('hex');
function markAway(ws) {
  const room = ws.meta.room;
  if (!room) return;
  const i = slotOf(room, ws);
  if (i < 0) return;
  const ph = { away: true, readyState: 3, meta: Object.assign({}, ws.meta, { room }), until: Date.now() + GRACE, send() {} };
  ph.timer = setTimeout(() => expireAway(room, ph), GRACE);
  room.slots[i] = ph;
  if (room.host === ws) room.host = ph;
  ws.meta.room = null;
  broadcastRoom(room); broadcastRooms();
}
function expireAway(room, ph) {
  const i = room.slots.indexOf(ph);
  if (i < 0) return;
  quitPenalty(room, ph.meta);
  room.slots[i] = null;
  if (room.host === ph) {
    room.slots.forEach((c) => { if (c && !c.away) { c.meta.room = null; send(c, { t: 'closed', reason: 'The host didn’t reconnect in time.' }); } else if (c) clearTimeout(c.timer); });
    rooms.delete(room.code);
  } else broadcastRoom(room);
  broadcastRooms();
}
function roomList() {
  return [...rooms.values()].map((r) => ({ code: r.code, name: r.name, mode: r.mode, state: r.state, quick: !!r.quick, count: r.slots.filter(Boolean).length, max: r.slots.length,
    host: r.host && r.host.meta ? r.host.meta.name : '' }));
}
function broadcastRooms() {
  const msg = JSON.stringify({ t: 'rooms', rooms: roomList() });
  for (const ws of clients) if (!ws.meta.room) send(ws, msg);
}
function broadcastRoom(room) {
  const info = roomInfo(room);
  room.slots.forEach((c, i) => { if (c && !c.away) send(c, { t: 'room', room: info, you: i, rid: c.meta.rid }); });
}
function quitPenalty(room, meta) {
  if (!room || room.state !== 'playing' || room.ranked === room.matchId || !meta || !meta.user) return;
  const u = db.users[meta.user]; if (!u) return;
  applyResult(u, -15, { opp: 'Left an online match', mode: room.mode === '2v2' ? 'Online 2v2' : 'Online 1v1', score: 'Quit', win: false });
  touchUser(u);
}
function leaveRoom(ws, notice) {
  const room = ws.meta.room;
  if (!room) return;
  quitPenalty(room, ws.meta);
  ws.meta.room = null;
  const i = slotOf(room, ws);
  if (i >= 0) room.slots[i] = null;
  if (room.host === ws) {
    room.slots.forEach((c) => { if (c && !c.away) { c.meta.room = null; send(c, { t: 'closed', reason: notice || 'The host left the room.' }); } else if (c) clearTimeout(c.timer); });
    rooms.delete(room.code);
  } else {
    broadcastRoom(room);
  }
  broadcastRooms();
}
function cleanName(n) {
  const s = String(n || '').replace(/[^\w \-]/g, '').trim().slice(0, 14);
  return s && !CAT.badName(s) ? s : 'Guest' + crypto.randomInt(100, 999);
}

/* an online result only counts if it is a real finished game that took a believable time */
function onlineResultOk(room, winTeam, score) {
  const sc = CAT.parseScore(score), secs = (Date.now() - (room.startT || 0)) / 1000;
  if (!sc) return 'not a finished game';
  if ((winTeam === 1) !== (sc.a > sc.b)) return 'score and winner don’t match';
  if (secs < Math.max(40, (sc.a + sc.b) * 3.5)) return 'too short';
  return null;
}
function tourInfo(room) {
  const t = room.tour; if (!t) return null;
  const o = CAT.tourOpp(t);
  return { cup: t.cup, round: t.round, alive: t.alive, champion: t.champion, opp: o ? { name: o.name, nation: o.nation, ai: o.ai } : null, teams: t.teams.map((x) => x.you ? { you: true } : { name: x.name, nation: x.nation }), path: t.path, qf: t.qf, sf: t.sf };
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
  const avg = (list) => list.reduce((s, m) => s + (m.u ? m.u.mmr : 0), 0) / list.length;
  const before = { 1: avg(t1), 2: avg(t2) };
  const names = (team) => members.filter((m) => m.team === team).map((m) => (m.c ? m.c.meta.name : 'CPU')).join(' & ');
  for (const m of members) {
    if (!m.u) { if (m.c) send(m.c, { t: 'mmr', ranked: false }); continue; }
    const won = m.team === winTeam;
    m.u.recentWins = (m.u.recentWins || []).filter((t) => Date.now() - t < 3600000);
    if (won && m.u.recentWins.length >= 20) { send(m.c, { t: 'mmr', ranked: false, msg: 'That’s a lot of wins this hour, so this one isn’t ranked.' }); continue; }
    if (won) m.u.recentWins.push(Date.now());
    const delta = CAT.elo(m.u.mmr, before[m.team === 1 ? 2 : 1], won);
    applyResult(m.u, delta, { opp: names(m.team === 1 ? 2 : 1), mode: room.mode === '2v2' ? 'Online 2v2' : 'Online 1v1', score: String(score || '').slice(0, 9), win: won });
    const rew = CAT.addRewards(m.u, CAT.onlineRewards(won));
    rew.prog = CAT.trackStats(m.u, { matches: 1, online: 1 });
    send(m.c, { t: 'mmr', ranked: true, delta, user: publicUser(m.u), result: rew });
    touchUser(m.u);
  }
}

function onConnection(ws) {
  ws.meta = { id: nextId++, user: null, name: 'Guest', look: CAT.cleanLook({}), room: null, alive: true };
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
        ws.meta.look = u ? wornLook(u) : CAT.cleanLook(m.look);
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
        r.slots[0] = ws; ws.meta.room = r; ws.meta.rid = newRid(); rooms.set(r.code, r);
        broadcastRoom(r); broadcastRooms();
        break;
      }
      case 'join': {
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!r) return send(ws, { t: 'error', msg: 'No room with that code.' });
        if (r.state !== 'lobby') return send(ws, { t: 'error', msg: 'That match has already started.' });
        const free = r.tourMode && r.slots[2] === null ? 2 : r.slots.indexOf(null);     // a friend joining a tournament room joins team 1
        if (free < 0) return send(ws, { t: 'error', msg: 'That room is full.' });
        leaveRoom(ws);
        r.slots[free] = ws; ws.meta.room = r; ws.meta.rid = newRid(); ws.meta.ready = false;
        broadcastRoom(r); broadcastRooms();
        break;
      }
      case 'rejoin': {
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        const i = r ? r.slots.findIndex((c) => c && c.away && c.meta.rid && c.meta.rid === m.rid) : -1;
        if (i < 0) return send(ws, { t: 'rejoinFail', msg: 'That match has ended or your spot was given away.' });
        const ph = r.slots[i];
        clearTimeout(ph.timer);
        if (ws.meta.room) leaveRoom(ws);
        // keep the identity this player had in the room
        Object.assign(ws.meta, { user: ph.meta.user, name: ph.meta.name, look: ph.meta.look, rid: ph.meta.rid, room: r });
        r.slots[i] = ws;
        if (r.host === ph) r.host = ws;
        const info = roomInfo(r);
        if (r.state === 'playing') send(ws, { t: 'start', room: info, you: i, rejoin: true });
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
      case 'tourMode': {
        if (!room || room.host !== ws || room.state !== 'lobby' || room.mode !== '2v2') return;
        const cup = CAT.CUP_BY[m.v];
        room.tourMode = cup && !cup.singles && cup.rounds === 3 ? m.v : null; broadcastRoom(room);
        break;
      }
      case 'court': {
        if (!room || room.host !== ws || room.state !== 'lobby') return;
        room.court = m.v === 'random' || COURTS.includes(m.v) ? m.v : 'random'; broadcastRoom(room);
        break;
      }
      case 'invite': {
        // invite a signed-in friend to the room you are in
        if (!room) return;
        const to = String(m.to || '').toLowerCase();
        let sent = false;
        for (const c of clients) if (c.meta && c.meta.user === to && c !== ws) { send(c, { t: 'invited', from: ws.meta.name, code: room.code, mode: room.mode }); sent = true; }
        send(ws, { t: 'inviteSent', to: m.to, ok: sent });
        break;
      }
      case 'ready': {
        if (!room || room.state !== 'lobby') return;
        ws.meta.ready = !!m.v; broadcastRoom(room);
        break;
      }
      case 'quick': {
        // matchmaking: join an open room of that mode, or open a new one and wait
        const mode = m.mode === '2v2' ? '2v2' : '1v1';
        const open = [...rooms.values()].filter((r) => r.state === 'lobby' && r.mode === mode && r.quick && r.slots.includes(null) && r !== ws.meta.room)
          .sort((a, b) => b.slots.filter(Boolean).length - a.slots.filter(Boolean).length)[0];
        leaveRoom(ws);
        if (open) {
          const free = open.slots.indexOf(null);
          open.slots[free] = ws; ws.meta.room = open; ws.meta.rid = newRid(); ws.meta.ready = true;
          broadcastRoom(open);
        } else {
          const r = { code: makeCode(), name: 'Quick match', mode, state: 'lobby', host: ws, quick: true, slots: new Array(mode === '2v2' ? 4 : 2).fill(null) };
          r.slots[0] = ws; ws.meta.room = r; ws.meta.rid = newRid(); ws.meta.ready = true; rooms.set(r.code, r);
          broadcastRoom(r);
        }
        broadcastRooms();
        break;
      }
      case 'start': {
        if (!room || room.host !== ws) return;
        const waiting = room.slots.filter((c) => c && c !== room.host && !c.away && !c.meta.ready).length;
        if (waiting && !m.force) return send(ws, { t: 'error', msg: `Waiting for ${waiting} player${waiting > 1 ? 's' : ''} to ready up.` });
        // team tournament: both people play on team 1 (slots 1P and 3P), the AI teams fill team 2
        if (m.tour && room.mode === '2v2' && !(room.tour && room.tour.alive)) {
          const cup = String(m.tour), hostU = ws.meta.user && db.users[ws.meta.user];
          if (!CAT.CUP_BY[cup]) return send(ws, { t: 'error', msg: 'Unknown tournament.' });
          if (room.slots[1] || room.slots[3]) return send(ws, { t: 'error', msg: 'For a tournament, both players go on Team 1 (1P and 3P). Leave 2P and 4P empty.' });
          if (CAT.CUP_BY[cup].singles) return send(ws, { t: 'error', msg: 'That challenge is solo only.' });
          if (!hostU) return send(ws, { t: 'error', msg: 'Sign in to host a tournament (the host buys the ticket).' });
          if (!CAT.cupUnlocked(hostU, cup)) return send(ws, { t: 'error', msg: 'The host needs to unlock that tournament first.' });
          const c = CAT.CUP_BY[cup]; if ((hostU.coins | 0) < c.ticket) return send(ws, { t: 'error', msg: `The ticket costs ${c.ticket} coins.` });
          hostU.coins -= c.ticket; touchUser(hostU); send(ws, { t: 'me', user: publicUser(hostU) });
          room.tour = CAT.tourNew(cup, null, '');
          room.tour.teams[0].name = CAT.cleanTeamName(m.teamName) || room.name;
        }
        if (!m.tour && room.tour && !room.tour.alive) room.tour = null;
        if (m.tour && room.tour && !room.tour.alive) return send(ws, { t: 'error', msg: 'That tournament is over.' });
        room.state = 'playing'; room.startT = Date.now();
        room.matchId = (room.matchId || 0) + 1;
        const info = roomInfo(room);
        room.slots.forEach((c, i) => c && send(c, { t: 'start', room: info, you: i }));
        broadcastRooms();
        break;
      }
      case 'lobby': {
        if (!room || room.host !== ws) return;
        room.state = 'lobby';
        if (room.tour && !room.tour.alive) room.tour = null;
        room.slots.forEach((c) => { if (c && c.meta) c.meta.ready = false; });
        broadcastRoom(room); broadcastRooms();
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
        const winTeam = m.win === 2 ? 2 : 1, bad = onlineResultOk(room, winTeam, m.score);
        if (bad) { room.slots.forEach((c) => c && send(c, { t: 'mmr', ranked: false, msg: `This result wasn’t counted (${bad}).` })); break; }
        if (room.tour && room.tour.alive) {
          // everyone on team 1 who has an account gets the tournament rewards
          const t = room.tour, round = t.round, won = winTeam === 1;
          CAT.tourAdvance(t, won);
          room.slots.forEach((c, i) => {
            if (!c || c.away) return;
            const u = c.meta && c.meta.user && db.users[c.meta.user];
            const res = u && i % 2 === 0 ? CAT.tourReward(u, t.cup, round, won) : null;
            if (u) { CAT.trackStats(u, { matches: 1, online: 1 }); touchUser(u); }
            send(c, { t: 'tourResult', tour: tourInfo(room), res, user: u ? publicUser(u) : null });
          });
          break;
        }
        rankOnline(room, winTeam, m.score);
        break;
      }
      case 'ping': send(ws, { t: 'pong', ts: m.ts }); break;
      case 'emote': {
        if (!room || Date.now() - (ws.meta.emoteT || 0) < 1500) return;
        ws.meta.emoteT = Date.now();
        const i = slotOf(room, ws), e = Math.max(0, Math.min(7, m.e | 0));
        room.slots.forEach((c) => c && c !== ws && send(c, { t: 'emote', s: i, e }));
        break;
      }
    }
  });

  ws.on('close', () => markAway(ws));   // dropped connections get a grace period; 'leave' leaves for real
}

setInterval(() => {
  for (const ws of clients) {
    if (!ws.meta.alive) { ws.terminate(); continue; }
    ws.meta.alive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 10000);

/* Owner account: set OWNER_USERNAME and OWNER_PASSWORD (Render → Environment) and this account
   is created or updated on every start with everything unlocked. The password never lives in the code. */
function ensureOwner() {
  const name = String(process.env.OWNER_USERNAME || '').trim(), pw = String(process.env.OWNER_PASSWORD || '');
  if (!name || !pw) return;
  if (!USER_RE.test(name)) { console.warn('  OWNER_USERNAME must be 3-14 letters, numbers or _'); return; }
  const key = name.toLowerCase();
  let u = db.users[key], fresh = false;
  if (!u) {
    u = Object.assign({ username: name, look: baseLook({ gender: 'boy', hairStyle: 'spiky' }), created: Date.now() }, CAT.newProgress());
    db.users[key] = u; fresh = true;
  }
  const ok = u.salt && u.pass && hashPassword(pw, u.salt) === u.pass;
  if (!ok) { u.salt = crypto.randomBytes(16).toString('hex'); u.pass = hashPassword(pw, u.salt); }
  u.owned = CAT.ITEMS.map((i) => i.id);
  u.beaten = CAT.LADDER.map((a) => a.key);
  u.coins = Math.max(u.coins || 0, 99999);
  u.keys = Math.max(u.keys | 0, 10);
  u.xp = Math.max(u.xp || 0, CAT.xpForLevel(30));
  if (fresh) Object.assign(u.equip, { head: 'crown_gold', top: 'kit_gold', bottom: 'track_white', shoes: 'kicks_gold', paddle: 'pad_phoenix', ball: 'ball_gold', court: 'court_royal', partner: 'mate_zen' });
  touchUser(u);
  console.log(`  Owner account ready: ${u.username} (everything unlocked)`);
}
async function start() {
  // join src/*.js into public/app.js, so the server always serves the latest game code
  try { const b = require('./build.js').build(); console.log(`  Built public/app.js from ${b.files} source files`); }
  catch (e) { console.error('  Could not build public/app.js:', e.message); }
  for (let attempt = 1; ; attempt++) {
    try { await loadDb(); break; }
    catch (e) { console.error(`Could not load the database (attempt ${attempt}): ${e.message}. Retrying in 5 s…`); await new Promise((r) => setTimeout(r, 5000)); }
  }
  ensureOwner();
  console.log(`  Storage: ${STORAGE === 'upstash' ? 'Upstash Redis (permanent)' : 'file ' + DB_FILE}  ·  ${Object.keys(db.users).length} accounts`);
  if (STORAGE === 'file' && process.env.RENDER) console.warn('  WARNING: on Render the file is wiped when the server sleeps. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep accounts.');
  server.listen(PORT, '0.0.0.0', onListen);
}
function onListen() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  }
  console.log('\n  Pickle Rush is running!\n');
  console.log(`  On this computer:   http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`  On your Wi-Fi (LAN): http://${ip}:${PORT}`));
  console.log('\n  Open the LAN address on phones, iPads and other PCs on the same Wi-Fi.');
  console.log('  Press Ctrl+C to stop.\n');
}
start();
