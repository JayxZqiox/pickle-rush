/* ---------- render ---------- */
function render(){
  const c = ctx, b = G.ball;
  CAM.cx = CAM.baseCx - clamp(G.camX * CAM.F * (CAM.follow || .012), -PAD + 12, PAD - 12);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.shake > 0){ const k = G.shake * 26; c.translate(rand(-k, k), rand(-k, k)); }
  G.view = null;
  if (CAM.zoom > 1 && G.mode !== 'demo' && b){
    const me = meP() || G.players[0], qa = me ? proj(me.x, me.y, 1) : [VW / 2, VH * .6], qb = proj(b.x, b.y, b.z);
    const tx = qa[0] * .6 + qb[0] * .4, ty = qa[1] * .6 + qb[1] * .4;
    G.fxX = lerp(G.fxX ?? tx, tx, .08); G.fxY = lerp(G.fxY ?? ty, ty, .08);
    const k = CAM.zoom, ox = clamp((VW / 2 - G.fxX) * .5, -PAD * .5, PAD * .5), oy = clamp((VH * .58 - G.fxY) * .4, -40, 40);
    G.view = { k, fx:G.fxX, fy:G.fxY, ox, oy };
    c.translate(G.fxX + ox, G.fxY + oy); c.scale(k, k); c.translate(-G.fxX, -G.fxY);
  }
  if (G.punch > 0 && b){ const q = proj(b.x, b.y, b.z), k = 1 + Math.sin(G.punch / .3 * Math.PI) * .045; c.translate(q[0], q[1]); c.scale(k, k); c.translate(-q[0], -q[1]); }
  buildWorld();
  const dx = Math.round((CAM.cx - CAM.baseCx) * DPR) / DPR, ww = VW + PAD * 2, wh = VH + PADY * 2;
  c.drawImage(WORLD.L1, dx - PAD, -PADY, ww, wh);
  drawBeams(c, dx);
  drawCrowdLayer(c, dx);
  c.drawImage(WORLD.L2, dx - PAD, -PADY, ww, wh);
  drawTicker(c, dx);
  if (G.state === 'play' && b.live && b.hitCount >= 3){
    for (const p of G.players){
      if (p.human && b.lastHitter !== p.team && Math.abs(p.y - NET) < KIT){
        c.fillStyle = `rgba(255,60,60,${.24 + Math.sin(G.time * 12) * .08})`;
        poly(c, p.team === 1 ? [[-HW, NET - KIT], [HW, NET - KIT], [HW, NET], [-HW, NET]] : [[-HW, NET], [HW, NET], [HW, NET + KIT], [-HW, NET + KIT]]);
      }
    }
  }
  // serve target box hint for the human server
  if (G.state === 'serve' && G.serverP && G.serverP.human && !G.serverP.human.remote){
    const T = G.serverP.team, sx = b.serveSign, y0 = T === 1 ? NET + KIT : NET - KIT, y1 = T === 1 ? L : 0;
    c.fillStyle = `rgba(232,255,61,${.12 + Math.sin(G.time * 4) * .05})`;
    poly(c, [[0, y0], [sx * HW, y0], [sx * HW, y1], [0, y1]]);
  }
  for (const r of G.rings){
    const q = proj(r.x, r.y, 0), k = 1 - r.life / r.max;
    const grow = r.big ? 1.6 : .35;
    c.strokeStyle = r.color + (r.life / r.max * .8) + ')'; c.lineWidth = r.big ? 3.5 : 2;
    c.beginPath(); c.ellipse(q[0], q[1], (.1 + k * grow) * q[2], (.04 + k * grow * .4) * q[2], 0, 0, TAU); c.stroke();
  }
  // glowing team rings under human players; bright white when the ball is in reach
  if (G.mode !== 'demo'){
    for (const p of G.players){
      if (!p.human) continue;
      const q = proj(p.x, p.y, 0), inR = G.netRole !== 'guest' ? reachable(p) >= 0 : false, col = inR ? '#ffffff' : p.human.color;
      const rx = .52 * q[2], ry = .18 * q[2];
      const gg = c.createRadialGradient(0, 0, rx * .45, 0, 0, rx);
      gg.addColorStop(0, hexA(col, 0)); gg.addColorStop(1, hexA(col, inR ? .45 : .22));
      c.save(); c.translate(q[0], q[1]); c.scale(1, ry / rx); c.fillStyle = gg; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
      c.save(); c.strokeStyle = col; c.lineWidth = inR ? 3.5 : 2.2; c.setLineDash([rx * .38, rx * .2]); c.lineDashOffset = -G.time * rx * 1.2;
      c.beginPath(); c.ellipse(q[0], q[1], rx, ry, 0, 0, TAU); c.stroke(); c.restore();
      if (p.armed !== 'drive'){ c.strokeStyle = SHOT[p.armed].color; c.globalAlpha = .55 + Math.sin(G.time * 8) * .25; c.lineWidth = 2.5; c.beginPath(); c.ellipse(q[0], q[1], .66 * q[2], .23 * q[2], 0, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }
  }
  const ballVisible = G.state === 'serve' || b.live;
  if (ballVisible){
    const q = proj(b.x, b.y, 0);
    c.fillStyle = `rgba(0,0,0,${.35 / (1 + b.z * .8)})`; c.beginPath(); c.ellipse(q[0], q[1], .07 * q[2], .028 * q[2], 0, 0, TAU); c.fill();
  }
  const ents = [];
  for (const p of G.players) ents.push({ y:depthOf(p.x, p.y), f:() => {
    const q = proj(p.x, p.y, 0), fx = playerFx(p, q);
    if (fx.sprint) drawStreaks(c, p, q);
    drawCharacter(c, q[0], q[1], q[2], p.look, facingOf(p), p.swing, p.run, p.moving, G.time, (p.name || '?').slice(0, 1).toUpperCase(), fx);
  } });
  ents.push({ y:depthOf(0, NET), f:drawNet });
  if (ballVisible) ents.push({ y:depthOf(b.x, b.y), f:drawBall });
  ents.sort((a, z) => z.y - a.y).forEach(e => e.f());
  // name tags, serve arrow, power meters
  if (G.mode !== 'demo'){
    for (const p of G.players){
      const q = proj(p.x, p.y, 1.95);
      if (G.state === 'serve' && G.serverP === p){
        const bob = Math.sin(G.time * 6) * 4, y = q[1] - 14 + bob;
        c.fillStyle = '#e8ff3d'; c.beginPath(); c.moveTo(q[0] - 8, y - 10); c.lineTo(q[0] + 8, y - 10); c.lineTo(q[0], y); c.closePath(); c.fill();
      }
      if ((G.doubles || G.mode === 'online' || G.mode === 'tour' || G.mode === '1p') && tagAlpha > .02){
        const nm = String(p.name || '').split(' · ')[0];         // the flag already shows the country
        c.font = `700 ${Math.round(clamp(.18 * q[2], 9, 12))}px Barlow, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        const hidden = HUD_RECT && q[1] - 24 < HUD_RECT.b + 6 && q[0] > HUD_RECT.l && q[0] < HUD_RECT.r && !$('#hud').classList.contains('sb-dim');
        c.globalAlpha = tagAlpha * .9;
        const fi = !hidden && flagImg(p.look && p.look.nation); if (fi){ const tw = c.measureText(nm).width; c.drawImage(fi, q[0] - tw / 2 - 17, q[1] - 31, 13, 9); }
        if (!hidden){ c.lineWidth = 2.5; c.strokeStyle = 'rgba(5,10,25,.6)'; c.strokeText(nm, q[0], q[1] - 22); c.fillStyle = p.human ? p.human.color : '#cbd5e1'; c.fillText(nm, q[0], q[1] - 22);
          const tt = titleOf(p);
          if (tt){ c.font = `800 ${Math.round(clamp(.14 * q[2], 8, 10))}px Barlow, system-ui, sans-serif`; c.strokeText('🏆 ' + tt, q[0], q[1] - 35); c.fillStyle = '#f5c542'; c.fillText('🏆 ' + tt, q[0], q[1] - 35); } }
        c.globalAlpha = 1;
      }
      if (p.human) drawMeter(p);
      if (p.human && (p.stamina ?? 100) < 99.5){
        const qh = proj(p.x, p.y, 2.12), w = clamp(.6 * qh[2], 26, 54), st = (p.stamina ?? 100) / 100;
        c.fillStyle = 'rgba(5,10,25,.7)'; rr(c, qh[0] - w / 2 - 2, qh[1] - 4, w + 4, 7, 3.5); c.fill();
        c.fillStyle = p.tired ? '#f87171' : st > .5 ? '#a6f23d' : st > .25 ? '#fde047' : '#ff7a3d'; rr(c, qh[0] - w / 2, qh[1] - 2, w * st, 3, 1.5); c.fill();
      }
    }
  }
  for (const f of G.bfx){
    const q = proj(f.x, f.y, f.z), k = Math.max(0, f.life / f.max), r = Math.max(1, f.r * q[2] * (f.fx === 'fire' ? .6 + k * .6 : 1));
    c.globalAlpha = f.fx === 'galaxy' ? k * (.6 + .3 * Math.sin(G.time * 5 + f.x * 40)) : f.fx === 'fire' ? k * .7 : k; c.fillStyle = f.c;
    if (f.shape === 'leaf'){ c.beginPath(); c.ellipse(q[0], q[1], r * 1.6, r * .8, f.x * 9 + G.time, 0, TAU); c.fill(); }
    else if (f.shape === 'bubble'){ c.strokeStyle = f.c; c.lineWidth = 1; c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.stroke(); }
    else if (f.fx === 'ice' || f.fx === 'gold' || f.fx === 'galaxy'){ c.beginPath(); c.moveTo(q[0], q[1] - r * 1.8); c.lineTo(q[0] + r * .6, q[1]); c.lineTo(q[0], q[1] + r * 1.8); c.lineTo(q[0] - r * .6, q[1]); c.closePath(); c.fill(); }
    else { c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.fill(); }
  }
  c.globalAlpha = 1;
  for (const f of G.fx){ const q = proj(f.x, f.y, f.z), k = Math.max(0, f.life / f.max); c.globalAlpha = f.dust ? k * .45 : k; c.fillStyle = f.color; c.beginPath(); c.arc(q[0], q[1], Math.max(1.2, f.r * q[2] * (f.dust ? 1.6 - k * .6 : 1)), 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  drawFlashes(c);
  c.globalAlpha = 1;
  for (const t of G.texts){
    const q = proj(t.x, t.y, t.z), a = Math.min(1, t.life / t.max * 2), pop = 1 + Math.max(0, (t.life / t.max) - .8) * 1.5;
    c.globalAlpha = a; c.font = `${Math.round(clamp(.38 * q[2], 14, 30) * pop)}px "Russo One", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 4; c.strokeStyle = 'rgba(5,10,25,.8)'; c.strokeText(t.txt, q[0], q[1]); c.fillStyle = t.color; c.fillText(t.txt, q[0], q[1]);
  }
  c.globalAlpha = 1;
  drawEmotes(c); drawReplayOverlay(c);
  if (G.whiteFlash > 0){ c.fillStyle = `rgba(255,255,255,${G.whiteFlash / .14 * .22})`; c.fillRect(-40, -40, VW + 80, VH + 80); }
  for (const k of G.confetti){
    c.save(); c.translate(k.x, k.y); c.rotate(k.rot); c.globalAlpha = Math.min(1, k.life); c.fillStyle = k.c; c.fillRect(-k.w / 2, -k.h / 2, k.w, k.h * Math.abs(Math.cos(k.rot * 1.3))); c.restore();
  }
  c.globalAlpha = 1;
}
/* body language: lean into runs, crouch when the ball is coming, jump on smashes, celebrate or slump after a point */
function playerFx(p, q){
  const now = performance.now() / 1000, dtp = now - (p._st || now);
  const vxs = dtp > 0 && dtp < .25 && p._sx !== undefined ? (q[0] - p._sx) / dtp / Math.max(30, q[2]) : 0;
  if (dtp > 0 && dtp < .25 && p._sy !== undefined){ p._svx = lerp(p._svx || 0, (q[0] - p._sx) / dtp, .3); p._svy = lerp(p._svy || 0, (q[1] - p._sy) / dtp, .3); }
  p._sx = q[0]; p._sy = q[1]; p._st = now;
  p._lean = lerp(p._lean || 0, clamp(vxs * (p.sprinting ? .045 : .03), -.2, .2), .2);
  const b = G.ball, incoming = G.state === 'play' && b.live && b.lastHitter !== p.team;
  p._crouch = lerp(p._crouch || 0, incoming && !p.moving ? 1 : 0, .12);
  const after = (G.state === 'point' || G.state === 'over') && G.lastWin;
  const cheer = after && G.lastWin === p.team, sad = after && G.lastWin !== p.team;
  const jump = (p.jumpT > 0 ? Math.sin(Math.PI * (1 - p.jumpT / .5)) * .34 : 0) + (cheer ? Math.abs(Math.sin(G.time * 7 + p.x * 3)) * .2 : 0);
  if (G.dance && G.state === 'over' && p.team === G.dance.team) return { dance:{ id:(p.look && p.look.dance) || 'dance_pump', t:G.time - G.dance.start } };
  if (G.cele && G.state === 'point' && p.team === G.cele.team && G.time - G.cele.start < 1.5) return { dance:{ id:(p.look && p.look.dance) || 'dance_pump', t:G.time - G.cele.start } };
  return { lean:p._lean, crouch:p._crouch, jump, cheer, sad, sprint:!!(p.sprinting && p.moving) };
}
/* speed streaks trailing behind a sprinting player */
/* name tags: "auto" shows them before the serve and between points, then fades them out during the rally */
let tagAlpha = 1;
function updateTagAlpha(dt){
  const mode = data.opts.nameTags || 'auto';
  const want = mode === 'off' ? 0 : mode === 'always' ? 1 : (G.state === 'play' || G.state === 'replay' ? 0 : 1);
  tagAlpha += (want - tagAlpha) * Math.min(1, dt * (want > tagAlpha ? 4 : 2.5));
}
function drawStreaks(c, p, q){
  const vx = p._svx || 0, vy = p._svy || 0, v = Math.hypot(vx, vy); if (v < 40) return;
  const ux = -vx / v, uy = -vy / v, s = q[2], len = clamp(v * .12, s * .35, s * .9);
  c.save(); c.lineCap = 'round';
  for (let i = 0; i < 4; i++){
    const h = (.35 + i * .32) * s, ph = (G.time * 9 + i * 1.7) % 1, x0 = q[0] + ux * s * .15, y0 = q[1] - h;
    c.globalAlpha = .45 * (1 - ph * .5); c.strokeStyle = i % 2 ? '#ffffff' : (p.human ? p.human.color : '#cfe3ff'); c.lineWidth = Math.max(1, s * .022);
    c.beginPath(); c.moveTo(x0 + ux * len * ph * .3, y0 + uy * len * ph * .3); c.lineTo(x0 + ux * len * (.6 + ph * .4), y0 + uy * len * (.6 + ph * .4)); c.stroke();
  }
  c.restore();
}
function drawFlashes(c){
  if (!G.flashes.length) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const f of G.flashes){
    const q = proj(f.x, f.y, f.z), k = 1 - f.life / f.max, r = (f.big ? 1.3 : .7) * q[2] * (.3 + k), g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
    g.addColorStop(0, `rgba(255,255,255,${.9 * (1 - k)})`); g.addColorStop(.35, hexA(f.color.length === 7 ? f.color : '#ffffff', .5 * (1 - k))); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.fill();
    if (f.big){ c.strokeStyle = `rgba(255,170,90,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(q[0], q[1], r * 1.2, 0, TAU); c.stroke(); }
  }
  c.restore();
}
function drawMeter(p){
  const show = p.charging || p.meterT > 0;
  if (!show) return;
  const c = ctx, q = proj(p.x, p.y, 0), s = q[2];
  const val = p.charging ? p.charge : p.meterQ, a = p.charging ? 1 : Math.min(1, p.meterT / .35);
  const h = clamp(1.2 * s, 70, 150), w = clamp(.13 * s, 9, 16);
  const x = q[0] + (facingOf(p) === 'back' ? .62 : .5) * s, top = q[1] - clamp(1.5 * s, 90, 190);
  const Y = v => top + h * (1 - Math.min(v, PMAX) / PMAX);
  c.save(); c.globalAlpha = a;
  c.fillStyle = 'rgba(6,12,26,.82)'; rr(c, x - 3, top - 3, w + 6, h + 6, w / 2 + 3); c.fill();
  c.save(); rr(c, x, top, w, h, w / 2); c.clip();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x, top, w, h);
  c.fillStyle = 'rgba(74,222,128,.45)'; c.fillRect(x, Y(PG1), w, Y(PG0) - Y(PG1));
  c.fillStyle = 'rgba(248,113,113,.35)'; c.fillRect(x, top, w, Y(PG1) - top);
  const Q = quality(val);
  const fill = Q === 'perfect' ? '#4ade80' : Q === 'late' ? '#f87171' : Q === 'good' ? '#e8ff3d' : '#cbd5e1';
  c.fillStyle = fill; c.fillRect(x, Y(val), w, top + h - Y(val));
  c.restore();
  c.strokeStyle = '#ffffff'; c.lineWidth = 2; seg(c, x - 5, Y(val), x + w + 5, Y(val));
  c.strokeStyle = 'rgba(74,222,128,.95)'; c.lineWidth = 1.5; seg(c, x - 3, Y(PG0), x + w + 3, Y(PG0)); seg(c, x - 3, Y(PG1), x + w + 3, Y(PG1));
  if (!p.charging && p.meterT > 0){
    c.font = '13px "Russo One", Impact, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = 'rgba(5,10,25,.8)'; const t = Q === 'perfect' ? 'PERFECT' : Q === 'late' ? 'LATE' : Q === 'weak' ? 'EARLY' : 'GOOD';
    c.strokeText(t, x + w + 8, Y(val)); c.fillStyle = fill; c.fillText(t, x + w + 8, Y(val));
  }
  c.restore();
}
function drawNet(){
  const c = ctx, px = HW + .28;
  c.fillStyle = 'rgba(12,16,28,.42)';
  poly(c, [[-px, NET, 0], [px, NET, 0], [px, NET, .91], [0, NET, .86], [-px, NET, .91]]);
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1;
  for (let x = -px; x <= px; x += .25){ const a = proj(x, NET, 0), z = proj(x, NET, netH(x)); seg(c, a[0], a[1], z[0], z[1]); }
  for (let h = .15; h < .86; h += .15){ const a = proj(-px, NET, h), z = proj(px, NET, h); seg(c, a[0], a[1], z[0], z[1]); }
  c.strokeStyle = '#f4f8ff'; c.lineWidth = Math.max(2, .05 * proj(0, NET, 0)[2]);
  c.beginPath(); const l = proj(-px, NET, .91), m = proj(0, NET, .86), r = proj(px, NET, .91); c.moveTo(l[0], l[1]); c.lineTo(m[0], m[1]); c.lineTo(r[0], r[1]); c.stroke();
  c.fillStyle = '#d7dde8';
  for (const sx of [-px, px]){ const a = proj(sx, NET, 0), t = proj(sx, NET, .95), w = Math.max(3, .06 * a[2]); c.fillRect(a[0] - w / 2, t[1], w, a[1] - t[1]); }
}
function ballLook(skin){
  const it = IT(skin);
  return { fx:it.fx || 'none', c1:it.c1 || '#e8ff3d' };
}
function drawBall(){
  const c = ctx, b = G.ball, L2 = ballLook(b.skin), special = !['drive', 'serve'].includes(b.type);
  const shotCol = (SHOT[b.type] || SHOT.drive).color;
  if (b.live && G.trail.length > 1){
    c.lineCap = 'round';
    const n = G.trail.length;
    for (let i = 1; i < n; i++){
      const A = G.trail[i - 1], B = G.trail[i], a = proj(A.x, A.y, A.z), z = proj(B.x, B.y, B.z), k = i / n;
      let col = shotCol, alpha = special ? .65 : .25, w = Math.max(1.5, .07 * z[2] * k);
      if (L2.fx === 'fire'){ col = k > .6 ? '#ffc76a' : k > .3 ? '#ff9a52' : '#e8704a'; alpha = .45 * k; w *= 1.3; }
      else if (L2.fx === 'leaf'){ col = '#86efac'; alpha = .35 * k; w *= 1.2; }
      else if (L2.fx === 'petal'){ col = '#fbcfe8'; alpha = .4 * k; w *= 1.2; }
      else if (L2.fx === 'bubble'){ col = '#7dd3fc'; alpha = .35 * k; w *= 1.2; }
      else if (L2.fx === 'sun'){ col = '#fcd116'; alpha = .4 * k; w *= 1.3; }
      else if (L2.fx === 'neon'){ col = L2.c1; alpha = .35 * k; w *= 1.4; }
      else if (L2.fx === 'ice'){ col = '#bfefff'; alpha = .6 * k; w *= 1.5; }
      else if (L2.fx === 'rainbow'){ col = `hsl(${(G.time * 360 + i * 32) % 360},95%,60%)`; alpha = .85 * k; w *= 1.7; }
      else if (L2.fx === 'galaxy'){ col = k > .5 ? '#c4b5fd' : '#6d28d9'; alpha = .6 * k; w *= 1.6; }
      else if (L2.fx === 'gold'){ col = '#f5c542'; alpha = .55 * k; w *= 1.4; }
      else if (L2.fx === 'lightning'){ col = '#f8e98a'; alpha = .25 * k; }
      c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = w; seg(c, a[0], a[1], z[0], z[1]);
    }
    if (L2.fx === 'lightning'){   // a slow, smooth zigzag instead of a strobing flicker
      c.strokeStyle = '#fdf6c8'; c.lineWidth = 1.4; c.globalAlpha = .5; c.beginPath();
      for (let i = 0; i < n; i++){ const P = G.trail[i], q = proj(P.x, P.y, P.z), j = Math.sin(i * 1.7 + G.time * 3) * q[2] * .045; i ? c.lineTo(q[0] + j, q[1] + j) : c.moveTo(q[0], q[1]); }
      c.stroke(); c.strokeStyle = '#7dd3fc'; c.lineWidth = .8; c.globalAlpha = .35; c.stroke();
    }
    c.globalAlpha = 1;
  }
  const q = proj(b.x, b.y, b.z), r = Math.max(2.8, .058 * q[2]);
  const glowCol = L2.fx === 'none' ? shotCol : L2.c1;
  if ((special || (L2.fx !== 'none' && L2.fx !== 'melon')) && b.live){ const gr = r * (L2.fx === 'fire' || L2.fx === 'lightning' ? 2.4 : 3), gg = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], gr); gg.addColorStop(0, glowCol + '66'); gg.addColorStop(1, glowCol + '00'); c.fillStyle = gg; c.beginPath(); c.arc(q[0], q[1], gr, 0, TAU); c.fill(); }
  let st = 1, sa = 0;
  if (b.live && G.trail.length > 1){
    const A = G.trail[G.trail.length - 2], Z = G.trail[G.trail.length - 1], pa = proj(A.x, A.y, A.z), pz = proj(Z.x, Z.y, Z.z);
    const vx = pz[0] - pa[0], vy = pz[1] - pa[1]; st = clamp(1 + Math.hypot(vx, vy) / (r * 2.2) * .3, 1, 1.7); sa = Math.atan2(vy, vx);
  }
  c.save(); c.translate(q[0], q[1]); c.rotate(sa); c.scale(st, 1 / Math.sqrt(st)); c.rotate(-sa); c.translate(-q[0], -q[1]);
  if (L2.fx === 'rainbow'){ const rg = c.createLinearGradient(q[0] - r, q[1] - r, q[0] + r, q[1] + r); rg.addColorStop(0, '#ff5c5c'); rg.addColorStop(.33, '#ffe14d'); rg.addColorStop(.66, '#4dd2ff'); rg.addColorStop(1, '#c084fc'); c.fillStyle = rg; }
  else if (L2.fx === 'fire'){ const fg = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); fg.addColorStop(0, '#ffe6a8'); fg.addColorStop(.55, '#ffb04a'); fg.addColorStop(1, '#e8704a'); c.fillStyle = fg; }
  else if (L2.fx === 'sun'){ const sg3 = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); sg3.addColorStop(0, '#fff6c2'); sg3.addColorStop(1, '#f5b800'); c.fillStyle = sg3; }
  else if (L2.fx === 'galaxy'){ const gg2 = c.createRadialGradient(q[0] - r * .3, q[1] - r * .3, 0, q[0], q[1], r); gg2.addColorStop(0, '#c4b5fd'); gg2.addColorStop(1, '#3b0764'); c.fillStyle = gg2; }
  else c.fillStyle = L2.c1;
  c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(.8, r * .12); c.stroke();
  if (L2.fx === 'melon' && r > 3){ c.save(); c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.clip(); c.strokeStyle = L2.c2; c.lineWidth = r * .28; for (let k = -2; k <= 2; k++){ c.beginPath(); c.ellipse(q[0] + k * r * .55 + Math.sin(G.spin) * r * .2, q[1], r * .18, r * 1.1, 0, 0, TAU); c.stroke(); } c.restore(); }
  if (L2.fx === 'sun' && r > 3){ c.strokeStyle = 'rgba(180,120,0,.55)'; c.lineWidth = Math.max(.8, r * .12); for (let k = 0; k < 8; k++){ const an = G.spin + k * TAU / 8; seg(c, q[0] + Math.cos(an) * r * .45, q[1] + Math.sin(an) * r * .45, q[0] + Math.cos(an) * r * .85, q[1] + Math.sin(an) * r * .85); } }
  if (L2.fx === 'neon'){ c.strokeStyle = L2.c1; c.globalAlpha = .55 + Math.sin(G.time * 2) * .2; c.lineWidth = Math.max(1, r * .28); c.beginPath(); c.arc(q[0], q[1], r * 1.25, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  if (r > 4 && (L2.fx === 'none' || L2.fx === 'gold' || L2.fx === 'ice')){ c.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 4; i++){ const an = G.spin + i * TAU / 4; c.beginPath(); c.arc(q[0] + Math.cos(an) * r * .5, q[1] + Math.sin(an) * r * .5, r * .17, 0, TAU); c.fill(); } }
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(q[0] - r * .35, q[1] - r * .35, r * .25, 0, TAU); c.fill();
  c.restore();
}
/* small animated previews for the shop */
function previewBall(cv2, id, t){
  const c = cv2.getContext('2d'), w = cv2.width / DPR, h = cv2.height / DPR, L2 = ballLook(id);
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
  const pos = k => [w / 2 + Math.cos(t * 2.4 - k) * w * .32, h / 2 + Math.sin(t * 2.4 - k) * h * .22];
  for (let i = 18; i > 0; i--){
    const [x1, y1] = pos(i * .16), [x2, y2] = pos((i - 1) * .16), k = 1 - i / 19;
    let col = L2.fx === 'none' ? '#e8ff3d' : (L2.c1 || '#e8ff3d');
    if (L2.fx === 'fire') col = k > .6 ? '#ffc76a' : k > .3 ? '#ff9a52' : '#e8704a';
    else if (L2.fx === 'ice') col = '#bfefff'; else if (L2.fx === 'galaxy') col = '#a78bfa'; else if (L2.fx === 'gold') col = '#f5c542';
    else if (L2.fx === 'lightning') col = '#f8e98a'; else if (L2.fx === 'rainbow') col = `hsl(${(t * 300 + i * 30) % 360},95%,60%)`;
    c.globalAlpha = L2.fx === 'none' ? k * .25 : k * .85; c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 3 + k * 6; seg(c, x1, y1, x2, y2);
  }
  c.globalAlpha = 1;
  if (L2.fx !== 'none' && L2.fx !== 'rainbow'){
    const cols = { fire:['#e8704a', '#ff9a52', '#ffc76a'], ice:['#e0f7ff', '#8fd8ff'], galaxy:['#ffffff', '#c4b5fd', '#f0abfc'], gold:['#f5c542', '#fff4c2'], lightning:['#fdf6c8', '#7dd3fc'],
      leaf:['#4ade80', '#a3e635'], petal:['#f9a8d4', '#fce7f3'], bubble:['#bae6fd', '#e0f2fe'], sun:['#fcd116', '#fff6c2'], neon:[L2.c1, '#ffffff'], melon:['#3fae4a', '#ef4444'] }[L2.fx] || [L2.c1 || '#ffffff'];
    for (let i = 0; i < 14; i++){
      const k = ((t * 1.7 + i * .37) % 1), [px, py] = pos(k * 2.2);
      c.globalAlpha = 1 - k; c.fillStyle = cols[i % cols.length];
      const j = Math.sin(i * 12.9 + t * 3) * 6;
      c.beginPath(); c.arc(px + j, py - (L2.fx === 'fire' ? k * 14 : j * .6), L2.fx === 'fire' ? 3.2 - k * 2 : 1.8, 0, TAU); c.fill();
    }
    if (L2.fx === 'lightning'){ c.globalAlpha = .5; c.strokeStyle = '#fdf6c8'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 10; i++){ const [px, py] = pos(i * .2); const j = Math.sin(i * 1.7 + t * 3) * 3; i ? c.lineTo(px + j, py + j) : c.moveTo(px, py); } c.stroke(); }
    c.globalAlpha = 1;
  }
  const [bx, by] = pos(0), r = 9;
  if (L2.fx === 'fire'){ const fg = c.createRadialGradient(bx, by, 0, bx, by, r); fg.addColorStop(0, '#fff3b0'); fg.addColorStop(.5, '#ffb020'); fg.addColorStop(1, '#ff4d1a'); c.fillStyle = fg; }
  else if (L2.fx === 'rainbow'){ const rg = c.createLinearGradient(bx - r, by - r, bx + r, by + r); rg.addColorStop(0, '#ff5c5c'); rg.addColorStop(.5, '#4dd2ff'); rg.addColorStop(1, '#c084fc'); c.fillStyle = rg; }
  else if (L2.fx === 'galaxy'){ c.fillStyle = '#5b21b6'; } else c.fillStyle = L2.c1;
  c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke();
}
function previewCourt(cv2, id){
  const c = cv2.getContext('2d'), w = cv2.width / DPR, h = cv2.height / DPR, th = THEMES[id] || THEMES.court_stadium;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[2]); c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (th.sun){ c.fillStyle = 'rgba(255,240,200,.9)'; c.beginPath(); c.arc(w * .75, h * .28, 12, 0, TAU); c.fill(); }
  c.fillStyle = th.surround; c.fillRect(0, h * .45, w, h * .55);
  const trap = (y0, y1, wt, wb, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(w / 2 - wt, y0); c.lineTo(w / 2 + wt, y0); c.lineTo(w / 2 + wb, y1); c.lineTo(w / 2 - wb, y1); c.closePath(); c.fill(); };
  trap(h * .5, h * .95, w * .18, w * .42, th.court); trap(h * .62, h * .74, w * .23, w * .29, th.kitchen);
  c.strokeStyle = th.line; c.lineWidth = 1.5; c.beginPath(); c.moveTo(w / 2 - w * .18, h * .5); c.lineTo(w / 2 + w * .18, h * .5); c.lineTo(w / 2 + w * .42, h * .95); c.lineTo(w / 2 - w * .42, h * .95); c.closePath(); c.stroke();
  c.fillStyle = th.boardText; c.font = '10px "Russo One", Impact, sans-serif'; c.textAlign = 'center'; c.fillText('PICKLE RUSH', w / 2, h * .42);
}
function previewPaddle(cv2, id){
  const c = cv2.getContext('2d'), w = cv2.width / DPR, h = cv2.height / DPR;
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
  c.save(); c.translate(w / 2 - 34, h / 2 + 4); c.scale(200, 200); drawPaddle(c, IT(id), 0, 0, -.35); c.restore();
}
/* ---------- previews ---------- */
let editWho = 'p1', pvFacing = 'front';
const STAGE = { ang:.4, drag:null, pose:0 };
function drawStage(cvs, look, t, o = {}){
  const r = rectOf(cvs); if (!r.width || !r.height) return;
  const w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
  if (cvs.width !== w || cvs.height !== h){ cvs.width = w; cvs.height = h; }
  const c = cvs.getContext('2d'), W = r.width, H = r.height; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
  const ring = o.ring || '#a6f23d', cx = W * .5, base = H - Math.max(16, H * .1);
  const sc = Math.min((H - 28) / 2.15, W / 1.25);
  if (!o.noCone){ const cg = c.createLinearGradient(0, 0, 0, base); cg.addColorStop(0, 'rgba(255,255,255,.16)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = cg; c.beginPath(); c.moveTo(cx - sc * .16, 0); c.lineTo(cx + sc * .16, 0); c.lineTo(cx + sc * .9, base); c.lineTo(cx - sc * .9, base); c.closePath(); c.fill(); }
  const px = sc * .72, py = px * .24;
  const pg = c.createRadialGradient(0, 0, 0, 0, 0, px * 1.25); pg.addColorStop(0, hexA(ring, .38)); pg.addColorStop(.65, hexA(ring, .08)); pg.addColorStop(1, hexA(ring, 0));
  c.save(); c.translate(cx, base); c.scale(1, py / px); c.fillStyle = pg; c.beginPath(); c.arc(0, 0, px * 1.25, 0, TAU); c.fill(); c.restore();
  c.fillStyle = 'rgba(6,12,26,.9)'; ell(c, cx, base + py * .35, px, py);
  c.strokeStyle = ring; c.lineWidth = 2.5; c.beginPath(); c.ellipse(cx, base, px, py, 0, 0, TAU); c.stroke();
  for (let i = 0; i < 12; i++){ const k = (t * .16 + i * .137) % 1, x = cx + Math.sin(i * 12.9) * px * .95, y = base - k * sc * 1.95; c.globalAlpha = (1 - k) * .75; c.fillStyle = i % 3 ? ring : '#ffffff'; c.beginPath(); c.arc(x, y, 1.7, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  const ang = o.ang !== undefined ? o.ang : t * .7, cs = Math.cos(ang);
  const facing = o.facing || (cs >= 0 ? 'front' : 'back'), sx = o.facing ? 1 : .3 + .7 * Math.abs(cs);
  const pose = o.pose && t - o.pose < 1.4 ? t - o.pose : -1;
  const fx = o.dance ? { dance:o.dance } : pose >= 0 ? { cheer:true, jump:Math.abs(Math.sin(pose * 7)) * .2 } : null;
  const cyc = (t * .7) % 3.2, sw = pose < 0 && cyc < .3 ? 1 - cyc / .3 : 0;
  c.save(); c.translate(cx, base); c.scale(sx, 1); drawCharacter(c, 0, 0, sc, look, facing, sw, 0, false, t, o.tag || '', fx); c.restore();
}
function drawPreview(cvs, look, facing, t, tag){
  const r = rectOf(cvs); if (!r.width || !r.height) return;
  const w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
  if (cvs.width !== w || cvs.height !== h){ cvs.width = w; cvs.height = h; }
  const c = cvs.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, r.width, r.height);
  c.fillStyle = 'rgba(42,95,174,.16)'; c.beginPath(); c.ellipse(r.width / 2, r.height - 12, r.width * .38, r.height * .07, 0, 0, TAU); c.fill();
  const cyc = (t * .7) % 2.4, sw = cyc < .3 ? 1 - cyc / .3 : 0;
  drawCharacter(c, r.width / 2, r.height - 12, (r.height - 22) / 1.85, look, facing, sw, 0, false, t, tag);
}

