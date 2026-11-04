/* ---------- shots ---------- */
const SHOT = {
  drive: { rest:.6,  fric:.88, t0:.50, tk:.035, req:1.02, color:'#ffffff' },
  slice: { rest:.36, fric:.60, t0:.62, tk:.034, req:.96,  color:'#38bdf8' },
  curve: { rest:.58, fric:.86, t0:.58, tk:.038, req:1.05, color:'#c084fc' },
  dink:  { rest:.50, fric:.50, t0:.90, tk:.025, req:1.12, color:'#a3e635' },
  smash: { rest:.66, fric:.95, t0:.28, tk:.020, req:.95,  color:'#fb923c' },
  spike: { rest:.70, fric:.98, t0:.24, tk:.018, req:.91,  color:'#ff3d81' },
  serve: { rest:.6,  fric:.88, t0:.72, tk:.036, req:1.08, color:'#ffffff' },
};
const TYPES = Object.keys(SHOT);
const ARMS = ['drive', 'slice', 'curve', 'dink', 'spike'];
const LABEL = { drive:'Drive', slice:'Slice', curve:'Curve', dink:'Dink', smash:'Smash', spike:'Spike' };
const netH = x => .86 + .05 * Math.pow(Math.min(1, Math.abs(x) / HW), 2);
function quality(q){ if (q >= PG0 && q <= PG1) return 'perfect'; if (q > PG1) return 'late'; if (q >= .5) return 'good'; return 'weak'; }
const QCOL = { perfect:'#4ade80', good:'#f4f8ff', weak:'#cbd5e1', late:'#f87171' };

function physics(b, dt){
  const ev = { bounce:false, net:false };
  if (b.rolling){ const k = Math.max(0, 1 - 2.2 * dt); b.vx *= k; b.vy *= k; b.x += b.vx * dt; b.y += b.vy * dt; return ev; }
  const py = b.y;
  if (b.bounces === 0) b.vx += b.ax * dt;
  b.vz -= GRAV * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (!b.netHit && (py - NET) * (b.y - NET) <= 0 && py !== b.y && Math.abs(b.x) < HW + .3 && b.z < netH(b.x) + .02){
    b.netHit = true; b.y = NET + Math.sign(py - NET) * .06; b.vy = -b.vy * .15; b.vx *= .3; if (b.vz > 0) b.vz = 0; ev.net = true;
  }
  if (b.z <= 0 && b.vz < 0){
    const S = SHOT[b.type] || SHOT.drive;
    b.z = 0; b.vz = -b.vz * (b.bounces === 0 ? S.rest : .55); b.vx *= S.fric; b.vy *= S.fric;
    if (b.bounces === 0 && b.type === 'curve') b.vx += b.ax * .14;
    b.ax = 0;
    if (b.vz < .6){ b.vz = 0; b.rolling = true; }
    b.bounces++; ev.bounce = true;
  }
  return ev;
}

/* ---------- game state ---------- */
const G = { mode:'demo', diff:null, doubles:false, players:[], ball:null, state:'idle', timer:0, score:[0,0], server:1, serverP:null, rally:0, over:null,
  paused:false, fx:[], rings:[], texts:[], trail:[], confetti:[], shake:0, time:0, spin:0, trailTick:0, pred:null, demoFlip:false, camX:0,
  netRole:null, netEv:[], stats:null, bfx:[], court:'court_stadium', flashes:[], hitstop:0, punch:0, whiteFlash:0, lastWin:0 };
const newBall = () => ({ x:0, y:0, z:1, vx:0, vy:0, vz:0, ax:0, type:'drive', bounces:0, hitCount:0, lastHitter:0, lastP:null, netHit:false, rolling:false, live:false, serveSign:1 });
function randomLook(){
  const pick = a => a[(Math.random() * a.length) | 0];
  const gender = Math.random() < .5 ? 'boy' : 'girl', l = { name:'', gender, skin:(Math.random() * SKINS.length) | 0, hair:(Math.random() * 4) | 0, hairStyle:pick(CAT.HAIR_STYLES[gender]) };
  for (const sl of ['head', 'top', 'bottom', 'shoes', 'paddle', 'wrist']) l[sl] = pick(itemsOf(sl).filter(i => i.lvl < 9)).id;
  if (gender === 'boy' && IT(l.bottom).style === 'skirt') l.bottom = 'shorts_black';
  l.ball = 'ball_classic';
  return l;
}
function makePlayer(o){
  return Object.assign({ team:1, lane:0, look:randomLook(), name:'AI', x:0, y:0, vx:0, vy:0, swing:0, run:0, moving:false, energy:20, armed:'drive',
    inX:0, inY:0, ai:null, human:null, serveType:'volley', charging:false, charge:0, swingT:0, power:0, meterT:0, meterQ:0, padX:0, padY:0, padPrev:[], netIn:{ x:0, y:0, h:0 } }, o);
}
const mkAI = d => ({ d, react:d.react, plannedFor:-1, target:null, leave:false, serveT:1 });
const other = t => t === 1 ? 2 : 1;
const team = t => G.players.filter(p => p.team === t);
const teamName = t => team(t).map(p => p.name).join(' & ');
const HCOL = { p1:'#e8ff3d', p2:'#ff8a5b', p3:'#22d3ee', p4:'#ff5c9a' };
const lookP3 = () => Object.assign(myLook(), { head:'cap_red', top:'polo_orange', bottom:'shorts_red' }), lookP4 = () => Object.assign(p2Look(), { head:'visor_white', top:'jersey_red', bottom:'skirt_pink' });

function buildPlayers(mode, diff){
  const H = (set, o, alt = false, pad = 0) => makePlayer(Object.assign({ human:{ set, alt, pad, tag:set.toUpperCase(), color:HCOL[set] } }, o));
  const AI = (key, o, nm) => {
    const p = makePlayer(Object.assign({ name:nm || AIS[key].name }, o)); p.ai = mkAI(AIS[key]);
    p.look = Object.assign({}, aiLook(p.name), p.look);
    if (LADDER.includes(key)) Object.assign(p.look, aiGear(key));
    return p;
  };
  const n1 = myName(), n2 = data.p2.name || 'Player 2';
  switch (mode){
    case 'demo':
      G.demoFlip = !G.demoFlip;
      return G.demoFlip ? [AI('pro', { team:1 }), AI('legend', { team:2 })]
        : [AI('pro', { team:1, lane:-1 }), AI('mate_ace', { team:1, lane:1, look:MATE_LOOK.mate_nova }), AI('legend', { team:2, lane:1 }), AI('pro', { team:2, lane:-1 })];
    case '1p': return [H('p1', { team:1, look:myLook(), name:n1 }, true), AI(diff, { team:2 })];
    case 'rally': return [H('p1', { team:1, look:myLook(), name:n1 }, true), AI('coach', { team:2 })];
    case 'tour': {
      const mk = (getAcc() && getAcc().equip.partner) || 'mate_ace', o = (TOUR.cur && TOUR.cur.opp) || { nation:'' }, nl = () => Object.assign(randomLook(), { nation:o.nation });
      return [H('p1', { team:1, lane:-1, look:myLook(), name:n1 }, true), AI(mk, { team:1, lane:1, look:MATE_LOOK[mk] }), AI(diff, { team:2, lane:1, look:nl() }), AI(diff, { team:2, lane:-1, look:nl() }, AIS[diff].name2)];
    }
    case '2p': return [H('p1', { team:1, look:myLook(), name:n1 }, false, 0), H('p2', { team:2, look:p2Look(), name:n2 }, false, 1)];
    case 'duo-ai': { const mk = (getAcc() && getAcc().equip.partner) || 'mate_ace'; return [H('p1', { team:1, lane:-1, look:myLook(), name:n1 }, true), AI(mk, { team:1, lane:1, look:MATE_LOOK[mk] }), AI(diff, { team:2, lane:1 }), AI(diff, { team:2, lane:-1 }, AIS[diff].name2)]; }
    case 'duo-coop': return [H('p1', { team:1, lane:-1, look:myLook(), name:n1 }, false, 0), H('p2', { team:1, lane:1, look:p2Look(), name:n2 }, false, 1), AI(diff, { team:2, lane:1 }), AI(diff, { team:2, lane:-1 }, AIS[diff].name2)];
    case 'duo-vs': return [H('p1', { team:1, lane:-1, look:myLook(), name:n1 }, false, 0), AI('mate_ace', { team:1, lane:1, look:MATE_LOOK.mate_ace }), H('p2', { team:2, lane:1, look:p2Look(), name:n2 }, false, 1), AI('mate_ace', { team:2, lane:-1, look:MATE_LOOK.mate_blaze }, 'Blaze')];
    case '2v2': return [H('p1', { team:1, lane:-1, look:myLook(), name:n1 }, false, 0), H('p3', { team:1, lane:1, look:lookP3(), name:'Player 3' }, false, 2),
                        H('p2', { team:2, lane:1, look:p2Look(), name:n2 }, false, 1), H('p4', { team:2, lane:-1, look:lookP4(), name:'Player 4' }, false, 3)];
  }
  return [];
}
function startMatch(mode, diff, players){
  G.mode = mode; G.diff = diff || null;
  G.players = players || buildPlayers(mode, diff);
  G.doubles = G.players.length === 4;
  G.score = [0, 0]; G.server = 1; G.rally = 0; G.over = null; G.paused = false; G.pred = null;
  G.serveNum = 2; G.serverP = null; G.recvP = null; G.matchT = 0; G.firstSetup = true;
  if (mode === 'demo') G.court = COURT_IDS[(Math.random() * COURT_IDS.length) | 0];
  else if (CUSTOM_MODES.includes(mode)) G.court = resolveCourt(data.opts.customCourt);       // custom games: any court, or a random one
  else if (G.netRole !== 'guest'){ const a = getAcc(); G.court = (a && a.equip.court) || 'court_stadium'; }
  G.bfx = [];   // first-serve exception: the opening team gets one server (0-0-2)
  G.ball = newBall(); G.fx = []; G.rings = []; G.texts = []; G.trail = []; G.confetti = []; G.flashes = []; G.lastWin = 0; G.hitstop = 0; G.dance = null; G.cele = null; G.tutorial = null;
  G.stats = { perfect:0, winners:0, longest:0, cur:0, dinks:0, smashes:0, points:0 };
  if (mode !== 'online') { G.netRole = null; G.flip = false; }
  if (CAM.preset !== camKey() || (mode !== 'online' && CAM.yaw !== CAMS[camKey()].yaw)) fitCamera();
  setupServe(); updateHUD();
}

const RIGHT = t => t === 1 ? 1 : -1;   // world x side of a team's right-hand service court
function setupServe(){
  const b = G.ball, T = G.server, R = other(T), sT = team(T), rT = team(R);
  const from = G.players.map(p => [p.x, p.y]);
  let server, serveLane;
  if (sT.length === 1){
    // singles: right court on an even score, left court on an odd score
    server = sT[0];
    const even = G.mode === 'rally' ? true : G.score[T - 1] % 2 === 0;
    serveLane = even ? RIGHT(T) : -RIGHT(T);
  } else {
    // doubles: server #1 after a side-out is whoever stands in the right court; players keep their courts
    if (!G.serverP || G.serverP.team !== T) G.serverP = sT.find(p => p.lane === RIGHT(T)) || sT[0];
    server = G.serverP; serveLane = server.lane;
  }
  const recvLane = -serveLane;   // the receiver stands diagonally across
  const recv = rT.length === 1 ? rT[0] : (rT.find(p => p.lane === recvLane) || rT[0]);
  server.x = serveLane * 1.25; server.y = T === 1 ? -.55 : L + .55;
  recv.x = recvLane * 1.25; recv.y = R === 1 ? -.9 : L + .9;
  for (const p of sT) if (p !== server){ p.x = p.lane * 1.6; p.y = T === 1 ? -.6 : L + .6; }
  for (const p of rT) if (p !== recv){ p.x = p.lane * 1.5; p.y = R === 1 ? NET - KIT - .35 : NET + KIT + .35; }
  G.players.forEach((p, i) => {
    p.vx = p.vy = 0; p.charging = false; p.swingT = 0; p.walk = null;
    const [fx, fy] = from[i];
    if (!G.firstSetup && Math.hypot(p.x - fx, p.y - fy) > .05){ p.walk = { fx, fy, tx:p.x, ty:p.y, t:0 }; p.x = fx; p.y = fy; }
  });
  G.firstSetup = false;
  G.serverP = server; G.recvP = recv; G.serveDrop = null;
  Object.assign(b, { live:false, bounces:0, hitCount:0, lastHitter:0, lastP:null, netHit:false, rolling:false, ax:0, vx:0, vy:0, vz:0, serveSign:recvLane });
  G.trail.length = 0; G.state = 'serve'; G.pred = null; G.stats.cur = 0;
  for (const p of G.players) if (p.ai){ p.ai.serveT = rand(.8, 1.2); p.ai.plannedFor = -1; p.ai.target = null; p.ai.leave = false; p.ai.style = Math.random() < (p.ai.d.kitchen ?? .6) ? 'kitchen' : 'base'; }
  updateHUD(); announceCall();
}
let callT = 0;
function showCall(c, sv, n){
  const el = $('#callBanner'); $('#cbNum').textContent = c.split('-').join(' – ');
  $('#cbSub').textContent = n ? `${sv} · server ${n}` : `${sv} serving`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(callT); callT = setTimeout(() => el.classList.remove('show'), 1800);
  if (data.sound && 'speechSynthesis' in window){
    try { const u = new SpeechSynthesisUtterance(c.split('-').join(', ')); u.volume = .8; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
}
function announceCall(){
  if (G.mode === 'demo' || G.mode === 'rally' || G.netRole === 'guest') return;
  const c = scoreCall(); if (!c) return;
  const sv = G.serverP ? G.serverP.name : teamName(G.server), n = G.doubles ? G.serveNum : 0;
  emit({ k:'call', c, sv, n }); showCall(c, sv, n);
}
// "5-3-1": serving team score, receiving team score, and in doubles the server number
function scoreCall(){
  if (G.mode === 'rally' || !G.players.length) return '';
  const T = G.server, a = G.score[T - 1], b = G.score[other(T) - 1];
  return G.doubles ? `${a}-${b}-${G.serveNum}` : `${a}-${b}`;
}

function hexA(hex, a){ const n = parseInt(String(hex).slice(1), 16); return isNaN(n) ? hex : `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function dustPuff(x, y, big, local){
  if (!local) emit({ k:'dust', x:r3(x), y:r3(y), big:big ? 1 : 0 });
  const n = big ? 14 : 6;
  for (let i = 0; i < n; i++) G.fx.push({ x:x + rand(-.1, .1), y:y + rand(-.1, .1), z:.02, vx:rand(-1, 1) * (big ? 1.6 : .8), vy:rand(-1, 1) * (big ? 1.6 : .8), vz:rand(.2, big ? 1.4 : .7), life:rand(.35, .7), max:.7, color:'#d8d2c4', r:rand(.04, big ? .1 : .07), dust:true });
  if (big) G.rings.push({ x, y, life:.55, max:.55, color:'rgba(255,122,61,', big:true });
}
function hitFx(type, x, y, z, local){
  if (!local) emit({ k:'fx', type, x:r3(x), y:r3(y), z:r3(z) });
  G.flashes.push({ x, y, z, life:.17, max:.17, big:type === 'smash' || type === 'spike', color:(SHOT[type] || SHOT.drive).color });
  const n = type === 'smash' || type === 'spike' ? 24 : (type === 'slice' || type === 'curve') ? 14 : 7;
  const color = (SHOT[type] || SHOT.drive).color;
  for (let i = 0; i < n; i++) G.fx.push({ x, y, z, vx:rand(-2.2, 2.2), vy:rand(-2.2, 2.2), vz:rand(.5, 3.4), life:rand(.25, .6), max:.6, color, r:rand(.02, .05) });
}

function launch(p, type, tx, depth, tScale = 1, err = null, label = null, lcol = null){
  const b = G.ball, S = SHOT[type], dir = p.team === 1 ? 1 : -1;
  const x0 = b.x, y0 = b.y, z0 = Math.max(.2, b.z);
  let ty = NET + dir * depth, ax = 0;
  const spin = p.human ? (IT(p.look && p.look.paddle).spin || 0) : 0;
  if (type === 'curve') ax = (tx >= 0 ? 1 : -1) * 6.5 * (1 + .15 * spin);
  if (type === 'slice') ax = (tx >= 0 ? 1 : -1) * 1.2 * (1 + .3 * spin);
  let T = (S.t0 + Math.hypot(tx - x0, ty - y0) * S.tk) * tScale;
  if (err === 'net'){ ty = NET + dir * .6; T = .42; ax = 0; }
  let vx, vy, vz;
  const calc = () => { vx = (tx - x0 - .5 * ax * T * T) / T; vy = (ty - y0) / T; vz = (-z0 + .5 * GRAV * T * T) / T; };
  calc();
  if (!err){ for (let i = 0; i < 70; i++){ const tn = (NET - y0) / vy, zn = z0 + vz * tn - .5 * GRAV * tn * tn; if (zn >= S.req) break; T += .03; calc(); } }
  Object.assign(b, { x:x0, y:y0, z:z0, vx, vy, vz, ax, type, bounces:0, lastHitter:p.team, lastP:p, netHit:false, rolling:false, live:true,
    skin:p.look && p.look.ball ? p.look.ball : 'ball_classic' });
  b.hitCount++; G.pred = null;
  p.swing = 1;
  hitFx(type, x0, y0, z0);
  const txt = label === '' ? null : label || (type !== 'drive' && type !== 'serve' ? LABEL[type] + '!' : null);
  if (txt) addText({ txt, x:p.x, y:p.y, z:2.2, life:.9, max:.9, color:lcol || S.color });
  if (type === 'smash' || type === 'spike'){ p.jumpT = .5; G.punch = .3; shake(type === 'spike' ? .34 : .28); sfx('smash'); if (p.human) vibrate(30); }
  else { sfx('hit'); if (type === 'slice' || type === 'curve') sfx('skill'); if (p.human) vibrate(10); }
  if (type !== 'serve'){ G.stats.cur++; G.stats.longest = Math.max(G.stats.longest, G.stats.cur); }
  if (p.human && !p.human.remote){ if (type === 'dink') G.stats.dinks++; if (type === 'smash' || type === 'spike') G.stats.smashes++; if (G.tutorial) tutEvent('hit', type); }
}

function consume(p, type, bonus = 0){
  p.energy = Math.min(100, p.energy + 9 + bonus);
  if (type === 'slice' || type === 'curve' || type === 'spike') p.energy = Math.max(0, p.energy - COST);
  if (type !== 'drive' && type !== 'smash') p.armed = 'drive';
}
function openTarget(p, spread){
  const opps = team(other(p.team)), cands = [-2.4, -1.2, 0, 1.2, 2.4];
  let best = 0, bs = -1;
  for (const c of cands){ const m = Math.min(...opps.map(o => Math.abs(o.x - c))) + Math.random() * spread; if (m > bs){ bs = m; best = c; } }
  return best;
}
const DEPTH = t => ({ drive:rand(4.3, 5.9), slice:rand(3.2, 5.4), curve:rand(4.2, 5.8), dink:rand(.9, 1.7), smash:rand(4, 6), spike:rand(4.8, 6.2) }[t]);

function humanShot(p, d, q, metered){
  const b = G.ball, Q = metered ? quality(q) : 'good';
  let type = p.armed;
  if ((type === 'slice' || type === 'curve' || type === 'spike') && p.energy < COST) type = 'drive';
  if (type === 'spike' && b.z < .65) type = 'drive';
  if (type === 'drive' && b.z > 1.7 && (!metered || q >= .5)) type = 'smash';
  const ix = p.inX;
  let tx = Math.abs(ix) > .25 ? Math.sign(ix) * (1.2 + Math.abs(ix) * 1.2) : openTarget(p, 1.2);
  const spd = Math.hypot(b.vx, b.vy);
  let sd = .16 + Math.max(0, d - .65) * .5 + (spd > 13 ? .22 : 0);
  let depth = DEPTH(type), tMul = 1;
  if (type === 'dink'){
    tx = clamp(tx, -2.4, 2.4); sd *= .6;
    if (Q === 'perfect') sd *= .5; else if (Q === 'late'){ depth += 2 + (q - PG1) * 6; sd *= 1.4; }
  } else if (Q === 'perfect'){ sd *= .45; tMul = .86; depth += .25; }
  else if (Q === 'weak'){ sd *= 1.3; tMul = 1.2; depth -= 1.2; }
  else if (Q === 'late'){ sd *= 1.7; tMul = .86; depth += .4 + (q - PG1) * 9; }
  const pad = IT(p.look && p.look.paddle);
  tMul *= 1 - .045 * (pad.power || 0); sd *= 1 - .13 * (pad.control || 0);
  tx += gauss() * sd; depth += gauss() * sd * .8;
  if (type === 'curve') tx = clamp(tx, -2.7, 2.7);
  depth = Math.max(.5, depth);
  consume(p, type, Q === 'perfect' ? 8 : 0);
  let lbl = null, lcol = null;
  if (metered){
    if (Q === 'perfect'){ lbl = type === 'drive' ? 'Perfect!' : `Perfect ${LABEL[type].toLowerCase()}!`; lcol = QCOL.perfect; G.stats.perfect++; }
    else if (Q === 'late'){ lbl = 'Too strong'; lcol = QCOL.late; }
    else if (Q === 'weak'){ lbl = 'Weak'; lcol = QCOL.weak; }
  }
  launch(p, type, tx, depth, tMul, null, lbl, lcol);
  if (Q === 'perfect' && metered){ sfx('perfect'); G.hitstop = .075; G.whiteFlash = .14; emit({ k:'pf' }); }
  updateHUD();
}

function aiShot(p){
  const D = p.ai.d, b = G.ball;
  if (D.coach){ consume(p, 'drive'); launch(p, 'drive', rand(-1.1, 1.1), rand(4.2, 5.4), D.tScale); return; }
  if (G.tutorial && G.tutorial.step === 4 && D.coach){ consume(p, 'drive'); launch(p, 'drive', rand(-1, 1), 3.2, 2.2, 0, 'Lob!', '#38bdf8'); updateHUD(); return; }
  let type = 'drive', depth = null, ts = D.tScale, why = '';
  const opps = team(other(p.team)), atNet = Math.abs(p.y - NET) < KIT + .9;
  const oppsUp = opps.every(o => Math.abs(o.y - NET) < KIT + 1.3);
  const kitchenGame = p.ai.style === 'kitchen';
  if (b.z > 1.7 && Math.random() < D.smash) type = 'smash';
  else if (kitchenGame && atNet && b.z > 1.15 && Math.random() < .55 + D.acc * .35){ type = 'drive'; depth = rand(KIT + .4, KIT + 2.2); ts *= .82; why = 'speedup'; }      // put away a high ball, at the feet
  else if (kitchenGame && atNet && Math.random() < (oppsUp ? .85 : .6)) type = 'dink';                                                                       // dink rally
  else if (kitchenGame && !atNet && oppsUp && b.hitCount === 2 && Math.random() < .45 + D.acc * .4){ type = 'dink'; why = 'drop'; }                         // third-shot drop
  else if (!kitchenGame && Math.abs(p.y - NET) < KIT + 1 && b.z < .75 && Math.random() < .5) type = 'dink';
  else if (p.energy >= COST && Math.random() < D.skill){ const r = Math.random(); type = b.z > .9 && r < .25 ? 'spike' : r < .62 ? 'slice' : 'curve'; }
  let tx = openTarget(p, 1.6 * (1 - D.acc) + .3) * (.75 + .25 * D.acc);
  if (type === 'dink' && kitchenGame && Math.random() < .55){ const o = opps[0]; tx = clamp(-(o ? o.x : 0) * .8 + gauss() * .6, -2.3, 2.3); }   // cross-court dinks
  if (depth === null) depth = DEPTH(type);
  // a loose dink pops up and invites an attack
  if (type === 'dink' && Math.random() < D.mistake * 2.2) ts *= 1.55;
  if (type === 'dink') tx = clamp(tx, -2.2, 2.2);
  tx += gauss() * D.aimSd; depth += gauss() * D.aimSd * .8;
  if (type === 'curve') tx = clamp(tx, -2.7, 2.7);
  let err = null;
  // pressure: the longer the rally, the likelier an error (World-best players feel it less)
  const rallyLen = G.ball ? G.ball.hitCount : 0, nerves = D.coach ? 0 : Math.max(0, rallyLen - 6) * (D.dupr >= 7 ? .006 : .012);
  if (Math.random() < D.mistake + nerves){
    const r = Math.random();
    if (r < .4) depth = rand(7.1, 8.2);
    else if (r < .7) tx = (Math.random() < .5 ? -1 : 1) * rand(HW + .3, HW + 1);
    else err = 'net';
  }
  consume(p, type);
  launch(p, type, tx, depth, ts, err, why === 'drop' ? 'Drop shot' : why === 'speedup' ? 'Speed-up!' : (type === 'dink' ? '' : null), why === 'drop' ? '#a3e635' : why === 'speedup' ? '#ff7a3d' : null);
  updateHUD();
}

/* serves: volley (hit out of the air after letting go), drop (let it bounce once first), curve (volley with sidespin) */
const SERVES = ['volley', 'drop', 'curve'];
const SERVE_NAME = { volley:'Volley serve', drop:'Drop serve', curve:'Curve serve' };
const SERVE_KEY = { slice:'volley', curve:'curve', dink:'drop', spike:'volley' };
function startServeDrop(p, q, metered){
  if (G.serveDrop || G.state !== 'serve' || G.serverP !== p) return;
  // the ball is released from an open hand: no throw, no spin, it just falls
  G.serveDrop = { p, q:metered ? q : .7, metered, type:p.serveType || 'volley', vz:0, bounced:false };
}
function aiServeType(p){
  const D = p.ai.d, r = Math.random();
  if (D.coach) return 'volley';
  return r < D.skill * .9 ? 'curve' : r < .45 ? 'drop' : 'volley';
}
function doServe(p, q, metered, type = 'volley'){
  const b = G.ball, sign = b.serveSign;
  b.hitCount = 0; b.live = true;
  const acc = type === 'drop' ? .55 : type === 'curve' ? 1.25 : 1;   // drop serves are steadier, curve serves riskier
  let tx, depth, err = null, ts = 1, lbl = null, lcol = null;
  if (p.ai){
    const D = p.ai.d; tx = sign * rand(.7, 2.2) + gauss() * D.aimSd * .4 * acc; depth = rand(KIT + 1.3, 6.0) + gauss() * D.aimSd * .4 * acc; ts = D.tScale;
    if (!D.coach && Math.random() < D.mistake * .6){ if (Math.random() < .5) depth = rand(7, 7.8); else err = 'net'; }
  } else {
    const Q = metered ? quality(q) : 'good';
    tx = sign * rand(.7, 2.3);
    if (Q === 'perfect'){ depth = rand(5.2, 6.2); ts = .9; tx += gauss() * .1; lbl = 'Perfect serve!'; lcol = QCOL.perfect; G.stats.perfect++; }
    else if (Q === 'good'){ depth = rand(3.9, 6.0) + gauss() * .15 * acc; tx += gauss() * .15 * acc; }
    else if (Q === 'weak'){ depth = rand(KIT + .35, 3.6) + gauss() * .25 * acc; ts = 1.18; tx += gauss() * .25 * acc; lbl = 'Weak'; lcol = QCOL.weak; }
    else { depth = 6.2 + (q - PG1) * 8 + gauss() * .3; ts = .88; tx += gauss() * .4; lbl = 'Too strong'; lcol = QCOL.late; }
    tx = sign * clamp(Math.abs(tx), .25, 3.3);
  }
  if (type === 'drop') ts *= 1.05;
  if (type === 'curve') ts *= 1.12;
  if (!lbl && type !== 'volley'){ lbl = SERVE_NAME[type] + (type === 'curve' ? '!' : ''); lcol = type === 'curve' ? SHOT.curve.color : '#a3e635'; }
  G.state = 'play';
  launch(p, type === 'curve' ? 'curve' : 'serve', tx, depth, ts, err, lbl, lcol);
  if (lbl === 'Perfect serve!'){ sfx('perfect'); G.hitstop = .075; G.whiteFlash = .14; emit({ k:'pf' }); }
  updateHUD();
}

/* ---------- reach + hitting ---------- */
function reachable(p){
  const b = G.ball;
  if (!b.live || b.netHit || b.lastHitter === p.team || G.state !== 'play') return -1;
  if (!(p.team === 1 ? b.y < NET : b.y > NET)) return -1;
  if (b.bounces === 0 && b.hitCount < 3) return -1;
  if (b.z > 2.3) return -1;
  const d = Math.hypot(b.x - p.x, b.y - p.y);
  return d > (p.human && p.human.remote ? REACH * 1.35 : REACH) ? -1 : d;
}
function tryHit(p){
  const d = reachable(p); if (d < 0) return false;
  if (G.ball.hitCount === 1 && G.recvP && p !== G.recvP) return false;   // the serve belongs to the diagonal receiver
  const b = G.ball, bounced = b.bounces > 0, inK = Math.abs(p.y - NET) < KIT;
  let q = AUTO_Q, metered = false;
  if (p.ai){ if (p.ai.leave) return false; if (!bounced && inK) return false; }
  else {
    const manual = data.opts.swing === 'manual';
    if (p.charging && !manual){ q = p.charge; metered = true; p.charging = false; p.meterQ = q; p.meterT = .7; }
    else if (p.swingT > 0){ q = p.power; metered = true; p.swingT = 0; }
    else if (manual) return false;
  }
  if (!bounced && inK){ p.swing = 1; endPoint(other(p.team), 'Kitchen fault', 'No volleys inside the kitchen'); return true; }
  if (p.ai) aiShot(p); else humanShot(p, d, q, metered);
  if (G.mode === 'rally' && !p.ai){ G.rally++; updateHUD(); }
  return true;
}
function startCharge(p){
  if (!p || p.ai) return;
  if (G.state === 'serve' && (G.serverP !== p || G.serveDrop || G.players.some(q => q.walk))) return;
  if (G.state !== 'serve' && G.state !== 'play') return;
  p.charging = true; p.charge = 0; p.meterT = 0;
}
function release(p){
  if (!p || !p.charging) return;
  const q = p.charge;
  p.charging = false; p.meterQ = q; p.meterT = .7;
  if (G.state === 'serve' && G.serverP === p){ startServeDrop(p, q, q >= .15); return; }
  if (G.state !== 'play') return;
  if (q < .15 && data.opts.swing !== 'manual') return;     // a quick tap doesn't spoil the next auto shot
  p.power = q; p.swingT = data.opts.swing === 'manual' ? .34 : .55;
  if (data.opts.swing === 'manual') p.swing = 1;
}

function onBounce(){
  const b = G.ball, side = b.y < NET ? 1 : 2, hitter = b.lastP || { name:'Player' };
  sfx('bounce');
  addRing({ x:r3(b.x), y:r3(b.y), life:.5, max:.5, color:'rgba(255,255,255,' });
  dustPuff(b.x, b.y, b.bounces === 1 && (b.type === 'smash' || b.type === 'spike'));
  if (side === b.lastHitter){ endPoint(other(side), 'Fault', 'The ball didn’t cross the net'); return; }
  if (b.bounces === 1){
    const inX = Math.abs(b.x) <= HW + .05, inY = side === 1 ? b.y >= -.05 : b.y <= L + .05;
    let ok = inX && inY, title = 'Out!', sub = `${hitter.name}’s shot landed out`;
    if (ok && b.hitCount === 1){
      if (Math.abs(b.y - NET) < KIT){ ok = false; title = 'Short serve'; sub = 'The serve landed in the kitchen'; }
      else if (Math.sign(b.x) !== b.serveSign && Math.abs(b.x) > .05){ ok = false; title = 'Wrong box'; sub = 'Serves go crosscourt'; }
    }
    if (!ok){ addRing({ x:r3(b.x), y:r3(b.y), life:1.2, max:1.2, color:'rgba(255,80,80,' }); endPoint(other(b.lastHitter), title, sub); }
  } else if (b.bounces >= 2){
    G.stats.winners += b.lastP && b.lastP.human ? 1 : 0;
    endPoint(b.lastHitter, b.type === 'smash' || b.type === 'spike' ? 'Smash winner!' : 'Point!', `${hitter.name} wins the rally`);
  }
}

/* the side that scores does a short victory dance; your own side also gets a few seconds of its beat */
function celebratePoint(T){
  if (G.stats && T === myTeam()) G.stats.points++;
  if (data.opts.pointDance === false) return;
  G.cele = { team:T, start:G.time };
  const mine = team(T).find(p => p.human && !p.human.remote);
  if (mine && musicOn() && actx) startTrack(IT((mine.look && mine.look.dance) || 'dance_pump').style || 'pump', { seconds:1.6, vol:.32 });
}
function endPoint(winner, title, sub = ''){
  if (G.state !== 'play') return;
  G.state = 'point'; G.timer = 1.35; G.lastWin = winner;
  for (const p of G.players){ p.charging = false; p.swingT = 0; }
  if (G.mode === 'rally'){
    const acc = getAcc() || ensureLocal(), r = G.rally, best = r > (acc.bestRally || 0);
    if (best && !isServerAcc()){ acc.bestRally = r; save(); }
    if (best && isServerAcc() && ACC.user) ACC.user.bestRally = r;     // the server saves it too (api/rally)
    progRally(r).then(rew => { if (rew && rew.coins){ const me = meP(); if (me) addText({ txt:`+${rew.coins} coins`, x:me.x, y:me.y, z:2.4, life:1.4, max:1.4, color:'#f5c542' }); if (rew.level > rew.levelBefore) showToast(`Level ${rew.level}!`, rewardText(rew)); } }).catch(() => {});
    toast(best ? 'New best streak!' : 'Rally over', `${r} return${r === 1 ? '' : 's'} · ${title}`);
    sfx(best ? 'win' : 'lose'); G.rally = 0; G.server = 1; updateHUD(); return;
  }
  const T = G.server, servingWon = winner === T;
  let note;
  if (servingWon){
    // only the serving side scores
    G.score[T - 1]++;
    celebratePoint(T);
    if (G.doubles){
      // the server and partner swap courts after winning a point on serve
      const mate = team(T).find(p => p !== G.serverP);
      if (mate){ const l = G.serverP.lane; G.serverP.lane = mate.lane; mate.lane = l; }
    }
    note = G.doubles ? `Point to ${teamName(T)} · ${G.serverP.name} keeps serving` : `Point to ${G.serverP ? G.serverP.name : teamName(T)}`;
  } else if (G.doubles && G.serveNum === 1){
    G.serveNum = 2; G.serverP = team(T).find(p => p !== G.serverP) || G.serverP;
    note = `Second server: ${G.serverP.name}`;
  } else {
    G.server = other(T); G.serveNum = 1; G.serverP = null;
    note = `Side out · ${teamName(G.server)} to serve`;
  }
  const [a, c] = G.score;
  if (servingWon && Math.max(a, c) >= 11 && Math.abs(a - c) >= 2) G.over = T;
  if (G.mode === 'demo'){ if (G.over){ G.over = null; G.score = [0, 0]; G.server = 1; G.serveNum = 2; G.serverP = null; } }
  else {
    const call = G.over ? '' : ` · ${scoreCall()}`;
    toast(title, (sub ? sub + ' · ' : '') + note + call);
    emit({ k:'pt', w:winner });
    const humanWin = team(winner).some(p => p.human && !p.human.remote), humanLose = team(other(winner)).some(p => p.human && !p.human.remote);
    playSfx(humanWin || !humanLose ? 'point' : 'lose');
  }
  if (!G.over) maybeReplay(winner);
  updateHUD();
}
