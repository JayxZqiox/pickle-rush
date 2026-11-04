/* ---------- movement + input ---------- */
const K = {};
/* sprint: about 40% faster while stamina lasts; an empty tank makes you tired until it refills to 30 */
const SPRINT = { mult:1.4, drain:38, regen:22, recover:30 };
function updateStamina(p, want, dt){
  if (p.stamina === undefined) p.stamina = 100;
  if (p.tired && p.stamina >= SPRINT.recover) p.tired = false;
  p.sprinting = !!want && !p.tired && p.stamina > 0;
  if (p.sprinting){ p.stamina = Math.max(0, p.stamina - SPRINT.drain * dt); if (p.stamina <= 0) p.tired = true; }
  else p.stamina = Math.min(100, p.stamina + SPRINT.regen * dt);
}
function wantsSprint(p){
  if (p.human.remote) return !!p.netIn.s;
  return held(p, 'sprint') || !!p.padSprint || (p.human.set === 'p1' && touch.active && Math.hypot(touch.x, touch.y) > .93);
}
const touch = { active:false, x:0, y:0, id:null };
function movePlayer(p, ix, iy, dt, speed){
  const k = Math.min(1, dt * 14);
  p.vx += (ix * speed - p.vx) * k; p.vy += (iy * speed - p.vy) * k;
  p.x = clamp(p.x + p.vx * dt, -HW - 1.6, HW + 1.6);
  p.y = p.team === 1 ? clamp(p.y + p.vy * dt, -3, NET - .35) : clamp(p.y + p.vy * dt, NET + .35, L + 3);
  const sp = Math.hypot(p.vx, p.vy); p.moving = sp > .4; p.run += sp * dt * 3.2;
}
const bindSets = p => p.human.alt ? [data.binds.p1, data.binds.p2] : [data.binds[p.human.set]];
const held = (p, act) => bindSets(p).some(s => s[act] && K[s[act]]);
const isBind = (p, act, code) => bindSets(p).some(s => s[act] === code);
const localHumans = () => G.players.filter(p => p.human && !p.human.remote);
function readInput(p){
  if (p.human.remote){ p.inX = p.netIn.x; p.inY = p.netIn.y; return; }
  let ix = 0, iy = 0;
  if (held(p, 'left')) ix -= 1; if (held(p, 'right')) ix += 1;
  if (held(p, 'up')) iy += 1; if (held(p, 'down')) iy -= 1;
  if (p.human.set === 'p1' && touch.active){ ix += touch.x; iy += touch.y; }
  ix += p.padX; iy += p.padY;
  // controls follow the camera: up = away from you on screen, right = right on screen
  { const wx = CAM.rx * ix + CAM.fx * iy, wy = CAM.ry * ix + CAM.fy * iy; ix = wx; iy = wy; }
  const m = Math.hypot(ix, iy); if (m > 1){ ix /= m; iy /= m; }
  p.inX = ix; p.inY = iy;
}
const LOCK_MODES = ['1p', 'duo-ai', 'rally'];
function skillOk(p, t){ return true; }
function skillOkOld(p, t){
  if (!p || !p.human || p.human.remote || p.human.set !== 'p1' || !LOCK_MODES.includes(G.mode)) return true;
  const need = CAT.SKILL_LEVELS[t]; return !need || myLevel() >= need;
}
function arm(p, t){
  if (!p || p.ai) return;
  if (G.state === 'serve' && G.serverP === p && SERVE_KEY[t]){
    if (G.serveDrop) return;
    p.serveType = SERVE_KEY[t]; playSfx('tick');
    addText({ txt:SERVE_NAME[p.serveType], x:p.x, y:p.y, z:2.1, life:.8, max:.8, color:'#e8ff3d' });
    updateHUD(); return;
  }
  if (!skillOk(p, t)){ addText({ txt:`${LABEL[t]} unlocks at Lv ${CAT.SKILL_LEVELS[t]}`, x:p.x, y:p.y, z:2.1, life:1, max:1, color:'#ffd0c0' }); return; }
  if (t !== 'dink' && p.armed !== t && p.energy < COST){ addText({ txt:'Need energy', x:p.x, y:p.y, z:2.1, life:.8, max:.8, color:'#ffd0c0' }); return; }
  p.armed = p.armed === t ? 'drive' : t; playSfx('tick'); updateHUD();
}
/* every local control goes through here so online guests can forward it */
function control(p, act, down){
  if (!p) return;
  if (G.netRole === 'guest'){
    if (act === 'hit'){
      NW.hit = down;
      const can = G.state === 'play' || (G.state === 'serve' && G.serverP === p);
      if (down){ p.charging = can; p.charge = 0; p.meterT = 0; }
      else if (p.charging){ p.charging = false; p.meterQ = p.charge; p.meterT = .7; }
      netInput(true);
    }
    else if (down){ NW.arms.push(act); netInput(true); }
    return;
  }
  if (act === 'hit'){ down ? startCharge(p) : release(p); }
  else if (down) arm(p, act);
}
let padsSeen = 0;
function pollPads(){
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads() || [];
  padsSeen = [...pads].filter(Boolean).length;
  for (const p of localHumans()){
    const gp = pads[p.human.pad];
    if (!gp){ p.padX = p.padY = 0; continue; }
    const bt = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
    if (Math.hypot(x, y) < .22){ x = 0; y = 0; }
    if (bt(14)) x = -1; if (bt(15)) x = 1; if (bt(12)) y = -1; if (bt(13)) y = 1;
    p.padX = x; p.padY = -y; p.padSprint = bt(4) || bt(6) || bt(10);
    const now = [bt(0), bt(2), bt(3), bt(1), bt(5), bt(9)], prev = p.padPrev;
    if (now[5] && !prev[5]){ if (screenNow === 'game') togglePause(true); else if (screenNow === 'pause') togglePause(false); }
    if (screenNow === 'game' && !G.paused){
      if (now[0] !== !!prev[0]) control(p, 'hit', now[0]);
      ['slice', 'curve', 'dink', 'spike'].forEach((a, i) => { if (now[i + 1] && !prev[i + 1]) control(p, a, true); });
    }
    p.padPrev = now;
  }
}

/* ---------- update ---------- */
function update(dt){
  if (G.state === 'replay'){ tickReplay(dt); tickEffects(dt); return; }
  if (G.state === 'play' || G.state === 'serve') recordFrame(dt);
  G.time += dt;
  if (G.mode !== 'demo' && G.state !== 'over') G.matchT += dt;
  const b = G.ball, mt = METER_T[data.opts.meter] || .8;
  for (const p of G.players){
    if (p.walk){
      const w = p.walk; w.t = Math.min(1, w.t + dt / .6);
      const e = w.t < .5 ? 2 * w.t * w.t : 1 - Math.pow(-2 * w.t + 2, 2) / 2;
      p.x = lerp(w.fx, w.tx, e); p.y = lerp(w.fy, w.ty, e); p.moving = w.t < 1; p.run += dt * 9;
      if (w.t >= 1) p.walk = null;
      if (p.swing > 0) p.swing = Math.max(0, p.swing - dt / .3);
      continue;
    }
    if (p.ai) aiUpdate(p, dt);
    else {
      readInput(p);
      if (G.state === 'serve' && G.serverP === p){ p.vx = p.vy = 0; p.moving = false; updateStamina(p, false, dt); }
      else { updateStamina(p, wantsSprint(p) && Math.hypot(p.inX, p.inY) > .25, dt); movePlayer(p, p.inX, p.inY, dt, 5.2 * (p.sprinting ? SPRINT.mult : 1)); }
      if (p.charging) p.charge = Math.min(PMAX, p.charge + dt / mt);
      if (p.swingT > 0) p.swingT -= dt;
      if (p.meterT > 0) p.meterT -= dt;
    }
    if (p.swing > 0) p.swing = Math.max(0, p.swing - dt / .3);
  }
  if (G.state === 'serve'){
    const s = G.serverP, sd = G.serveDrop;
    if (sd){
      sd.vz -= GRAV * dt; b.z += sd.vz * dt;
      if (b.z <= 0 && sd.vz < 0){ b.z = 0; sd.vz = -sd.vz * .62; sd.bounced = true; sfx('bounce'); addRing({ x:r3(b.x), y:r3(b.y), life:.4, max:.4, color:'rgba(255,255,255,' }); }
      const ready = sd.type === 'drop' ? (sd.bounced && sd.vz <= .25) : b.z <= .7;
      if (ready){ G.serveDrop = null; doServe(sd.p, sd.q, sd.metered, sd.type); }
    } else {
      b.x = s.x + (s.team === 1 ? .32 : -.32); b.y = s.y + (s.team === 1 ? .15 : -.15); b.z = .95 + Math.sin(G.time * 5) * .04;
      if (s.ai){ s.ai.serveT -= dt; if (s.ai.serveT <= 0 && !G.players.some(q => q.walk)){ s.serveType = aiServeType(s); startServeDrop(s, .86, false); } }
    }
  } else if (b.live){
    const ev = physics(b, dt);
    if (G.state === 'play'){
      const hn = b.lastP ? b.lastP.name : 'Player';
      if (ev.net){ sfx('net'); endPoint(other(b.lastHitter), 'Net!', `${hn} hit the net`); }
      if (ev.bounce && G.state === 'play') onBounce();
      if (G.state === 'play' && b.rolling) endPoint(b.lastHitter, 'Point!', `${hn} wins the rally`);
      if (G.state === 'play' && (b.y < -5 || b.y > L + 5 || Math.abs(b.x) > 9)){
        if (b.bounces === 0) endPoint(other(b.lastHitter), 'Out!', `${hn}’s shot landed out`);
        else endPoint(b.lastHitter, 'Point!', `${hn} wins the rally`);
      }
      if (G.state === 'play'){
        const order = G.players.filter(p => p.team !== b.lastHitter).sort((a, c) => Math.hypot(b.x - a.x, b.y - a.y) - Math.hypot(b.x - c.x, b.y - c.y));
        for (const p of order){ if (tryHit(p)) break; }
      }
    } else if (b.y < -4.5 || b.y > L + 5 || Math.abs(b.x) > 9) b.live = false;
  }
  if (G.state === 'point'){
    G.timer -= dt;
    if (G.timer <= 0){ if (G.over) gameOver(G.over); else setupServe(); }
  }
  tickEffects(dt);
}
function ballParticles(b, dt){
  const fx = IT(b.skin).fx; if (!fx || ['none', 'lightning', 'rainbow', 'melon', 'sun', 'neon'].includes(fx)) return;
  const rate = { fire:30, ice:30, galaxy:24, gold:30, leaf:10, petal:12, bubble:12 }[fx] || 0;
  G.bfxAcc = (G.bfxAcc || 0) + dt * rate;
  while (G.bfxAcc >= 1 && G.bfx.length < (GFX.low ? 50 : 160)){
    G.bfxAcc -= 1;
    const P = { x:b.x + rand(-.04, .04), y:b.y + rand(-.04, .04), z:b.z + rand(-.03, .03), vx:rand(-.3, .3), vy:rand(-.3, .3), vz:rand(.1, .6), life:rand(.25, .5), max:.5, fx };
    if (fx === 'fire'){ P.c = ['#e8704a', '#ff9a52', '#ffc76a'][(Math.random() * 3) | 0]; P.r = rand(.02, .04); P.vz = rand(.3, .8); }
    else if (fx === 'leaf'){ P.c = Math.random() < .5 ? '#4ade80' : '#a3e635'; P.r = rand(.02, .035); P.vz = rand(-.4, -.1); P.life = P.max = rand(.7, 1.1); P.shape = 'leaf'; }
    else if (fx === 'petal'){ P.c = Math.random() < .6 ? '#f9a8d4' : '#fce7f3'; P.r = rand(.02, .032); P.vz = rand(-.35, -.1); P.life = P.max = rand(.7, 1.1); P.shape = 'leaf'; }
    else if (fx === 'bubble'){ P.c = '#bae6fd'; P.r = rand(.015, .03); P.vz = rand(.2, .5); P.life = P.max = rand(.6, 1); P.shape = 'bubble'; }
    else if (fx === 'ice'){ P.c = Math.random() < .5 ? '#e0f7ff' : '#8fd8ff'; P.r = rand(.015, .03); P.vz = rand(-.2, .2); P.life = P.max = rand(.4, .7); }
    else if (fx === 'galaxy'){ P.c = ['#ffffff', '#c4b5fd', '#8b5cf6', '#f0abfc'][(Math.random() * 4) | 0]; P.r = rand(.01, .025); P.vz = 0; P.life = P.max = rand(.5, .9); }
    else { P.c = Math.random() < .6 ? '#f5c542' : '#fff4c2'; P.r = rand(.012, .025); P.vz = rand(-.1, .3); }
    G.bfx.push(P);
  }
}
function tickEffects(dt){
  updateTagAlpha(dt);
  const b = G.ball;
  for (const p of G.players){
    if (p.jumpT > 0) p.jumpT = Math.max(0, p.jumpT - dt);
    const sp = p._rx === undefined ? 0 : Math.hypot(p.x - p._rx, p.y - p._ry) / Math.max(dt, 1e-3);
    p._rx = p.x; p._ry = p.y;
    if (G.tutorial && p.human && !p.human.remote){ G.tutorial.dist += Math.min(sp, 6) * dt + (Math.hypot(p.inX || 0, p.inY || 0) > .3 ? dt * 2.5 : 0); if (G.tutorial.step === 0) tutEvent('move'); }
    if (sp > 3.4 && sp < 20 && !(p.jumpT > 0) && Math.random() < dt * (p.sprinting ? 26 : 10) && !GFX.low)
      G.fx.push({ x:p.x + rand(-.15, .15), y:p.y + rand(-.1, .1), z:.02, vx:rand(-.4, .4), vy:rand(-.4, .4), vz:rand(.2, .6), life:.45, max:.45, color:'#d8d2c4', r:rand(.04, .07), dust:true });
  }
  for (const f of G.flashes) f.life -= dt; G.flashes = G.flashes.filter(f => f.life > 0);
  G.punch = Math.max(0, G.punch - dt); G.whiteFlash = Math.max(0, G.whiteFlash - dt);
  if (b && b.live && G.state !== 'serve') ballParticles(b, dt);
  for (const f of G.bfx){ f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z = Math.max(0, f.z + f.vz * dt); }
  G.bfx = G.bfx.filter(f => f.life > 0);
  if (b && b.live){
    G.spin += Math.hypot(b.vx || 0, b.vy || 0) * dt * 3 + dt * 2;
    if ((G.trailTick += dt) > 1 / 70){ G.trailTick = 0; G.trail.push({ x:b.x, y:b.y, z:b.z }); if (G.trail.length > 12) G.trail.shift(); }
  }
  G.camX = lerp(G.camX, b ? clamp(b.x * CAM.rx + (b.y - NET) * CAM.ry, -6.5, 6.5) : 0, Math.min(1, dt * 2.2));
  for (const f of G.fx){ f.life -= dt; f.vz -= GRAV * .5 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z = Math.max(0, f.z + f.vz * dt); }
  G.fx = G.fx.filter(f => f.life > 0);
  for (const r of G.rings) r.life -= dt; G.rings = G.rings.filter(r => r.life > 0);
  for (const t of G.texts){ t.life -= dt; t.z += dt * .8; } G.texts = G.texts.filter(t => t.life > 0);
  for (const c of G.confetti){ c.life -= dt; c.vy += 260 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; }
  G.confetti = G.confetti.filter(c => c.life > 0 && c.y < VH + 40);
  G.shake = Math.max(0, G.shake - dt);
}
function confetti(){
  const cols = ['#e8ff3d', '#ff7a45', '#38bdf8', '#c084fc', '#4ade80', '#ffffff'];
  for (let i = 0; i < 140; i++) G.confetti.push({ x:VW / 2 + rand(-VW * .3, VW * .3), y:rand(-60, VH * .2), vx:rand(-160, 160), vy:rand(-420, -80), rot:rand(0, TAU), vr:rand(-9, 9), w:rand(5, 10), h:rand(8, 14), c:cols[i % cols.length], life:rand(2.2, 3.6) });
}

