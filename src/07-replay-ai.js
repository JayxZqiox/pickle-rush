/* ---------- instant replay: slow motion after smash winners and long rallies ---------- */
const REC = { frames:[], acc:0 };
function recordFrame(dt){
  if (G.mode === 'demo') return;
  REC.acc += dt; if (REC.acc < 1 / 30) return; REC.acc = 0;
  const b = G.ball;
  REC.frames.push({ b:[b.x, b.y, b.z, b.live ? 1 : 0, b.type], p:G.players.map(p => [p.x, p.y, p.swing, p.run, p.moving ? 1 : 0, p.jumpT || 0]) });
  if (REC.frames.length > 150) REC.frames.shift();
}
function maybeReplay(winner){
  G.ptN = (G.ptN || 0) + 1;
  if (data.opts.replays === false || G.mode === 'demo' || G.netRole === 'guest') return false;
  const b = G.ball, rally = G.stats ? G.stats.cur : 0, smash = (b.type === 'smash' || b.type === 'spike') && b.lastHitter === winner;
  if (!smash && rally < 10) return false;
  if (!smash && G.lastReplay != null && G.ptN - G.lastReplay < 3) return false;
  const frames = REC.frames.slice(-Math.round(30 * (smash ? 2.4 : 3.4)));
  if (frames.length < 20) return false;
  G.lastReplay = G.ptN;
  G.replay = { frames, t:0, dur:(frames.length - 1) / 30, speed:smash ? .4 : .55, label:smash ? (b.type === 'spike' ? 'SPIKE!' : 'SMASH!') : `${rally}-SHOT RALLY`, resume:G.timer };
  G.state = 'replay'; REC.frames = [];
  return true;
}
function tickReplay(dt){
  const R = G.replay; if (!R) return;
  G.time += dt; R.t += dt * R.speed;
  const f = Math.min(R.frames.length - 1.001, R.t * 30), i = Math.floor(f), k = f - i, A = R.frames[i], B = R.frames[i + 1] || A, b = G.ball;
  b.x = lerp(A.b[0], B.b[0], k); b.y = lerp(A.b[1], B.b[1], k); b.z = lerp(A.b[2], B.b[2], k); b.live = true; b.type = A.b[4];
  G.players.forEach((p, j) => { const a = A.p[j], c2 = B.p[j]; if (!a || !c2) return; p.x = lerp(a[0], c2[0], k); p.y = lerp(a[1], c2[1], k); p.swing = c2[2]; p.run = lerp(a[3], c2[3], k); p.moving = !!c2[4]; p.jumpT = c2[5]; });
  if (R.t >= R.dur) endReplay();
}
function endReplay(){
  const R = G.replay; if (!R) return;
  G.replay = null; G.ball.live = false; G.state = 'point'; G.timer = clamp(R.resume, .6, 1.1);
  if (G.cele) G.cele.start = G.time;           // the point dance plays after the replay
}
function drawReplayOverlay(c){
  const label = G.replay ? G.replay.label : G.replayLabel; if (G.state !== 'replay') return;
  const bh = Math.round(VH * .085), blink = Math.sin(performance.now() / 180) > 0;
  c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = 'rgba(0,0,0,.82)'; c.fillRect(0, 0, VW, bh); c.fillRect(0, VH - bh, VW, bh);
  c.font = '800 15px Barlow, system-ui, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
  c.fillStyle = blink ? '#ef4444' : '#7f1d1d'; c.beginPath(); c.arc(24, bh / 2, 6, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.fillText('REPLAY', 38, bh / 2);
  c.font = `${Math.round(Math.min(30, bh * .55))}px "Russo One", Impact, sans-serif`; c.textAlign = 'center'; c.fillStyle = '#ffd23f'; c.fillText(label || '', VW / 2, VH - bh / 2 + 1);
  if (G.netRole !== 'guest'){ c.font = '600 13px Barlow, system-ui, sans-serif'; c.fillStyle = 'rgba(255,255,255,.7)'; c.textAlign = 'right'; c.fillText(isTouch ? 'Tap to skip' : 'Space to skip', VW - 18, VH - bh / 2); }
  c.restore();
}
/* ---------- AI brain ---------- */
function teamPredict(t){
  const b = G.ball;
  if (G.pred && G.pred.hc === b.hitCount && G.pred.team === t) return G.pred;
  const s = Object.assign({}, b), step = 1 / 60, canVol = b.hitCount >= 3, cands = [];
  let tt = 0, firstOut = false;
  for (let i = 0; i < 240; i++){
    tt += step; const ev = physics(s, step);
    if (s.netHit) break;
    const onSide = t === 1 ? s.y < NET : s.y > NET;
    if (ev.bounce && s.bounces === 1){
      if (!onSide) break;
      let ok = Math.abs(s.x) <= HW + .03 && (t === 1 ? s.y >= -.03 : s.y <= L + .03);
      if (ok && b.hitCount === 1 && (Math.abs(s.y - NET) < KIT || Math.sign(s.x) !== b.serveSign)) ok = false;
      firstOut = !ok;
    }
    if (s.bounces >= 2 || s.rolling) break;
    if (!onSide) continue;
    if (s.bounces === 0 && !canVol) continue;
    if (s.z < .1 || s.z > 1.95) continue;
    if (s.bounces === 0 && Math.abs(s.y - NET) < KIT + .1) continue;
    cands.push({ x:s.x, y:s.y, z:s.z, t:tt, vol:s.bounces === 0 });
  }
  const tm = team(t);
  let chaser = tm[0];
  if (b.hitCount === 1 && G.recvP && G.recvP.team === t) chaser = G.recvP;
  else if (tm.length > 1){
    const c0 = cands.find(c => c.z > .25 && c.z < 1.4) || cands[0];
    if (c0){
      const cost = p => Math.hypot(p.x - c0.x, p.y - c0.y) / (p.ai ? p.ai.d.speed : 5.2);
      chaser = tm.reduce((m, p) => cost(p) < cost(m) ? p : m);
    }
  }
  G.pred = { hc:b.hitCount, team:t, cands, firstOut, chaser };
  return G.pred;
}
function plan(p){
  const a = p.ai, D = a.d, pr = teamPredict(p.team);
  a.leave = false; a.target = null;
  if (pr.chaser !== p) return;
  if (pr.firstOut && Math.random() < D.judge){ a.leave = true; return; }
  if (!pr.cands.length) return;
  const cs = pr.cands.map(c => Object.assign({}, c, { slack:c.t - Math.hypot(c.x - p.x, c.y - p.y) / D.speed - .05 }));
  const comfy = c => c.z > .25 && c.z < 1.4;
  const pick = cs.find(c => c.slack >= 0 && comfy(c) && (D.netRush || !c.vol)) || cs.find(c => c.slack >= 0) || cs.reduce((m, c) => c.slack > m.slack ? c : m, cs[0]);
  const e = D.aimSd * .35;
  a.target = { x:pick.x + gauss() * e, y:pick.y + (p.team === 1 ? -.15 : .15) + gauss() * e * .5 };
}
function aiUpdate(p, dt){
  const a = p.ai, D = a.d, b = G.ball;
  if (G.state === 'serve'){ movePlayer(p, 0, 0, dt, D.speed); return; }
  const dir = p.team === 1 ? -1 : 1;
  let depth = D.depth;
  // real pickleball: the returning side moves up right after the return of serve,
  // the serving side waits for the return to bounce and moves up after the third shot
  const ourReturnDone = b.hitCount >= 2 && (b.hitCount >= 3 || b.lastHitter === p.team);
  const atKitchen = !D.coach && b.live && (ourReturnDone && (p.ai.style === 'kitchen' || (D.netRush && b.hitCount >= 2)));
  if (atKitchen) depth = KIT + .3;
  p.ai.atLine = atKitchen;
  let tx = G.doubles ? p.lane * 1.45 + clamp(b.x * (atKitchen ? .3 : .15), -.6, .6) : clamp(b.x * (atKitchen ? .5 : .35), -1.6, 1.6), ty = NET + dir * depth;
  const incoming = G.state === 'play' && b.live && b.lastHitter !== p.team && !b.netHit;
  if (incoming){
    if (a.plannedFor !== b.hitCount){ a.react -= dt; if (a.react <= 0){ plan(p); a.plannedFor = b.hitCount; } }
    if (a.plannedFor === b.hitCount && a.target){ tx = a.target.x; ty = a.target.y; }
  } else { a.react = D.react + Math.random() * .08; a.leave = false; }
  const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
  let ix = 0, iy = 0;
  if (dist > .04){ const k = Math.min(1, dist * 2.5); ix = dx / dist * k; iy = dy / dist * k; }
  updateStamina(p, !D.coach && dist > 2.2 && (incoming || G.state === 'play'), dt);
  movePlayer(p, ix, iy, dt, D.speed * (p.sprinting ? 1.25 : 1)); p.inX = ix;
}

