/* ---------- drawing helpers ---------- */
function poly(c, pts){ c.beginPath(); pts.forEach((p, i) => { const q = proj(p[0], p[1], p[2] || 0); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); }
function gline(c, x1, y1, x2, y2, w){
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2;
  poly(c, [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
}
function seg(c, x1, y1, x2, y2){ c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function ell(c, x, y, rx, ry, stroke){ c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); if (stroke) c.stroke(); }
function rr(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const SHADE = new Map();
function shade(hex, k){
  const key = hex + k; if (SHADE.has(key)) return SHADE.get(key);
  const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return hex;
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = k < 0 ? 0 : 255, a = Math.abs(k);
  r = Math.round(r + (f - r) * a); g = Math.round(g + (f - g) * a); b = Math.round(b + (f - b) * a);
  const out = `rgb(${r},${g},${b})`; SHADE.set(key, out); return out;
}
function drawShoe(c, it, x, y){
  const c1 = it.c1 || '#f5f7fb', c2 = it.c2 || '#9aa4b4', st = it.style || 'sneaker';
  if (st === 'slipper'){   // tsinelas: a flat sole and a V strap, toes showing
    c.fillStyle = c2; rr(c, x - .095, y - .012, .19, .042, .02); c.fill();
    c.fillStyle = '#d8a274'; ell(c, x + .02, y - .03, .07, .03);
    c.strokeStyle = c1; c.lineWidth = .022; c.beginPath(); c.moveTo(x - .06, y - .01); c.lineTo(x + .05, y - .05); c.lineTo(x + .06, y - .01); c.stroke();
    return;
  }
  const h = st === 'hightop' ? .1 : .07, w = st === 'runner' ? .1 : .092;
  c.fillStyle = c1; rr(c, x - w, y - h, w * 2, h + .03, .045); c.fill();
  if (st === 'hightop'){ c.fillStyle = shade(c1, -.08); rr(c, x - .06, y - h - .06, .12, .08, .03); c.fill(); }
  c.fillStyle = st === 'runner' ? c2 : '#ffffff'; rr(c, x - w - .006, y + .004, w * 2 + .012, .034, .016); c.fill();
  c.strokeStyle = c2; c.lineWidth = .018; c.beginPath(); c.moveTo(x - w * .6, y - h * .2); c.quadraticCurveTo(x, y - h * .95, x + w * .65, y - h * .35); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = .01; rr(c, x - w, y - h, w * 2, h + .03, .045); c.stroke();
}
function drawPaddle(c, it, hx, hy, ang){
  const c1 = it.c1 || '#c8a165', c2 = it.c2 || '#7a5530';
  c.save(); c.translate(hx, hy); c.rotate(ang);
  c.fillStyle = '#1c1f26'; rr(c, -.03, -.027, .16, .054, .02); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = .008; for (let i = 0; i < 4; i++) seg(c, i * .035, -.025, i * .035 + .02, .025);
  const g = c.createLinearGradient(.12, -.12, .4, .12); g.addColorStop(0, shade(c1, .18)); g.addColorStop(1, shade(c1, -.18));
  c.fillStyle = g; rr(c, .12, -.12, .28, .24, .1); c.fill();
  if (it.deco){
    c.save(); rr(c, .12, -.12, .28, .24, .1); c.clip(); c.fillStyle = c2; c.strokeStyle = c2;
    if (it.deco === 'stripe'){ c.globalAlpha = .9; c.beginPath(); c.moveTo(.18, .12); c.lineTo(.26, .12); c.lineTo(.36, -.12); c.lineTo(.28, -.12); c.closePath(); c.fill(); }
    else if (it.deco === 'dots'){ c.globalAlpha = .85; for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 3; iy++) ell(c, .16 + ix * .065, -.075 + iy * .075, .016, .016); }
    else if (it.deco === 'split'){ c.globalAlpha = .9; c.fillRect(.26, -.12, .16, .24); }
    else if (it.deco === 'tape'){      // repaired with tape, scuffed from the street
      c.globalAlpha = .9; c.fillStyle = c2; c.save(); c.translate(.26, 0); c.rotate(.5); c.fillRect(-.16, -.02, .32, .04); c.rotate(-1.1); c.fillRect(-.16, -.018, .32, .036); c.restore();
      c.fillStyle = 'rgba(40,30,20,.35)'; ell(c, .19, .06, .02, .01); ell(c, .33, -.07, .025, .012); }
    else if (it.deco === 'cup'){       // trophy
      c.globalAlpha = 1; c.fillStyle = c2; c.beginPath(); c.moveTo(.22, -.07); c.lineTo(.3, -.07); c.quadraticCurveTo(.3, .02, .26, .03); c.quadraticCurveTo(.22, .02, .22, -.07); c.fill();
      c.fillRect(.252, .03, .016, .035); c.fillRect(.235, .062, .05, .014);
      c.strokeStyle = c2; c.lineWidth = .01; c.beginPath(); c.arc(.215, -.045, .018, Math.PI * .5, Math.PI * 1.5, false); c.stroke(); c.beginPath(); c.arc(.305, -.045, .018, -Math.PI * .5, Math.PI * .5); c.stroke(); }
    else if (it.deco === 'kitsune'){   // fox mask
      c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(.18, -.08); c.lineTo(.21, -.02); c.lineTo(.24, -.06); c.lineTo(.26, .07); c.lineTo(.28, -.06); c.lineTo(.31, -.02); c.lineTo(.34, -.08); c.lineTo(.33, .03); c.lineTo(.26, .1); c.lineTo(.19, .03); c.closePath(); c.fill();
      c.strokeStyle = '#e11d48'; c.lineWidth = .012; seg(c, .215, 0, .245, .015); seg(c, .305, 0, .275, .015); c.fillStyle = '#111'; ell(c, .235, .025, .012, .005); ell(c, .285, .025, .012, .005); }
    else if (it.deco === 'oni'){       // horned mask with fangs
      c.globalAlpha = 1; c.fillStyle = c2; c.beginPath(); c.moveTo(.2, -.02); c.lineTo(.18, -.12); c.lineTo(.23, -.04); c.closePath(); c.fill(); c.beginPath(); c.moveTo(.32, -.02); c.lineTo(.34, -.12); c.lineTo(.29, -.04); c.closePath(); c.fill();
      ell(c, .23, .0, .02, .012); ell(c, .29, .0, .02, .012); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(.23, .05); c.lineTo(.24, .085); c.lineTo(.25, .05); c.fill(); c.beginPath(); c.moveTo(.27, .05); c.lineTo(.28, .085); c.lineTo(.29, .05); c.fill(); }
    else if (it.deco === 'neko'){      // cat face
      c.globalAlpha = 1; c.fillStyle = c2; c.beginPath(); c.moveTo(.19, -.03); c.lineTo(.2, -.11); c.lineTo(.24, -.06); c.closePath(); c.fill(); c.beginPath(); c.moveTo(.33, -.03); c.lineTo(.32, -.11); c.lineTo(.28, -.06); c.closePath(); c.fill();
      ell(c, .235, .0, .014, .018); ell(c, .285, .0, .014, .018); c.fillStyle = '#ff7eb6'; ell(c, .26, .03, .012, .008);
      c.strokeStyle = c2; c.lineWidth = .006; for (const sx of [-1, 1]) { seg(c, .26 + sx * .03, .035, .26 + sx * .09, .02); seg(c, .26 + sx * .03, .045, .26 + sx * .09, .05); } }
    else if (it.deco === 'mecha'){     // panel lines + glowing core
      c.globalAlpha = .9; c.lineWidth = .008; seg(c, .14, -.05, .38, -.05); seg(c, .14, .05, .38, .05); seg(c, .2, -.12, .2, -.05); seg(c, .32, .05, .32, .12);
      c.globalAlpha = 1; const cg = c.createRadialGradient(.26, 0, 0, .26, 0, .05); cg.addColorStop(0, '#ffffff'); cg.addColorStop(.4, c2); cg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = cg; ell(c, .26, 0, .05, .05); }
    else if (it.deco === 'katana'){    // a blade across the face
      c.globalAlpha = 1; c.fillStyle = c2; c.beginPath(); c.moveTo(.15, .09); c.lineTo(.36, -.09); c.lineTo(.37, -.07); c.lineTo(.17, .1); c.closePath(); c.fill();
      c.fillStyle = '#c9a227'; ell(c, .19, .065, .02, .012); c.fillStyle = '#7f1d1d'; c.save(); c.translate(.17, .085); c.rotate(-.7); c.fillRect(-.04, -.008, .04, .016); c.restore(); }
    else if (it.deco === 'dragon'){    // scales and an eye
      c.globalAlpha = .85; c.lineWidth = .01; for (let r2 = 0; r2 < 4; r2++) for (let k = 0; k < 5; k++){ c.beginPath(); c.arc(.15 + k * .055 + (r2 % 2) * .027, -.09 + r2 * .055, .03, 0, Math.PI); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = '#fef3c7'; ell(c, .3, -.03, .03, .018); c.fillStyle = '#111'; ell(c, .3, -.03, .007, .016); }
    else if (it.deco === 'shuriken'){  // ninja star
      c.globalAlpha = 1; c.beginPath(); for (let k = 0; k < 8; k++){ const a2 = k * Math.PI / 4, r2 = k % 2 ? .025 : .08; k ? c.lineTo(.26 + Math.cos(a2) * r2, Math.sin(a2) * r2) : c.moveTo(.26 + Math.cos(a2) * r2, Math.sin(a2) * r2); } c.closePath(); c.fill();
      c.fillStyle = it.c1; ell(c, .26, 0, .014, .014); }
    else if (it.deco === 'kawaii'){    // happy face
      c.globalAlpha = 1; c.lineWidth = .012; c.strokeStyle = '#3b2a2a'; c.beginPath(); c.arc(.225, .0, .016, Math.PI, TAU); c.stroke(); c.beginPath(); c.arc(.295, .0, .016, Math.PI, TAU); c.stroke();
      c.beginPath(); c.arc(.26, .025, .025, 0, Math.PI); c.stroke(); c.fillStyle = c2; c.globalAlpha = .6; ell(c, .195, .03, .02, .012); ell(c, .325, .03, .02, .012); }
    else if (it.deco === 'petals'){    // cherry blossoms
      c.globalAlpha = 1; for (const [fx2, fy2, fr] of [[.2, -.05, .03], [.31, .04, .035], [.33, -.07, .022]]){ for (let k = 0; k < 5; k++){ const a2 = k * TAU / 5; ell(c, fx2 + Math.cos(a2) * fr * .6, fy2 + Math.sin(a2) * fr * .6, fr * .45, fr * .45); } c.fillStyle = '#ffd23f'; ell(c, fx2, fy2, fr * .25, fr * .25); c.fillStyle = c2; } }
    else if (it.deco === 'wave'){ c.lineWidth = .025; c.globalAlpha = .9; c.beginPath(); for (let k = 0; k <= 12; k++){ const xx = .12 + k * .024, yy = Math.sin(k * .9) * .05; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
    c.restore();
  }
  if (it.id === 'pad_carbon'){ c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = .006; for (let i = -.1; i < .12; i += .03) seg(c, .14, i, .38, i + .05); }
  if (it.id === 'pad_phoenix'){ c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(.2, .07); c.quadraticCurveTo(.25, -.1, .3, -.02); c.quadraticCurveTo(.33, -.11, .36, .07); c.closePath(); c.fill(); }
  c.strokeStyle = c2; c.lineWidth = .028; rr(c, .12, -.12, .28, .24, .1); c.stroke();
  c.restore();
}
function limb(c, x0, y0, a, bend, l1, l2, skin, sleeveCol, sleeveLen, foreCol, wU = .085, wF = .075){
  const ex = x0 + Math.sin(a) * l1, ey = y0 + Math.cos(a) * l1;
  const hx = ex + Math.sin(a + bend) * l2, hy = ey + Math.cos(a + bend) * l2;
  c.strokeStyle = skin; c.lineWidth = wU; seg(c, x0, y0, ex, ey);
  c.strokeStyle = foreCol || skin; c.lineWidth = wF; seg(c, ex, ey, hx, hy);
  if (sleeveLen > 0){ c.strokeStyle = sleeveCol; c.lineWidth = wU + .028; seg(c, x0, y0, x0 + Math.sin(a) * l1 * sleeveLen, y0 + Math.cos(a) * l1 * sleeveLen); }
  c.fillStyle = skin; ell(c, hx, hy, wF * .62, wF * .62);
  return [hx, hy, ex, ey];
}
/* body builds: boys are broad and straight, girls are narrower with a waist and hips */
const BODY = {
  boy:  { sh:.255, waist:.195, hip:.185, legX:.1,  thigh:.135, calf:.11,  arm:.092, fore:.08,  neck:.1,   hx:.142, hy:.152, hem:-.64 },
  girl: { sh:.198, waist:.14,  hip:.195, legX:.085, thigh:.112, calf:.092, arm:.07,  fore:.062, neck:.072, hx:.128, hy:.148, hem:-.7 },
};
function torsoPath(c, B){
  c.beginPath();
  c.moveTo(-B.sh, -1.42); c.quadraticCurveTo(0, -1.47, B.sh, -1.42);
  c.quadraticCurveTo(B.waist + .03, -1.24, B.waist, -1.13);
  c.quadraticCurveTo(B.hip + .015, -1.04, B.hip, -.99);
  c.quadraticCurveTo(0, -.95, -B.hip, -.99);
  c.quadraticCurveTo(-B.hip - .015, -1.04, -B.waist, -1.13);
  c.quadraticCurveTo(-B.waist - .03, -1.24, -B.sh, -1.42);
  c.closePath();
}
const NOFX = {};
/* victory dances: each returns body offsets and arm angles for time t (seconds) */
function dancePose(id, t){
  const st = IT(id).style || 'pump';
  if (st === 'funk'){ const b = t * 130 / 60; return { x:Math.sin(b * Math.PI) * .09, lean:Math.sin(b * Math.PI) * .15, jump:Math.abs(Math.sin(b * TAU)) * .05, crouch:.35 + .3 * Math.sin(b * TAU), fa:2.0 + Math.sin(b * Math.PI) * .8, a:1.2 - Math.sin(b * Math.PI) * .9, legs:Math.sin(b * Math.PI) * .8 }; }
  if (st === 'budots'){ const b = t * 128 / 60; return { x:Math.sin(b * Math.PI * .5) * .13, lean:Math.sin(b * Math.PI) * .09, jump:Math.abs(Math.sin(b * Math.PI)) * .05, crouch:.9, fa:1.45 + Math.sin(t * 16) * .38, a:1.45 + Math.sin(t * 16 + 1.3) * .38, legs:Math.sin(b * Math.PI) * .6 }; }
  if (st === 'weng'){ const b = t * 118 / 60; return { x:Math.sin(b * Math.PI * .5) * .32, lean:Math.cos(b * Math.PI * .5) * .1, jump:Math.abs(Math.sin(b * Math.PI)) * .07, crouch:.2, fa:1.7 + Math.sin(b * TAU) * .55, a:1.7 - Math.sin(b * TAU) * .55, legs:Math.sin(t * 14) }; }
  if (st === 'tinikling'){ const b = t * 150 / 60 / 1.5, ph = b % 1, side = Math.floor(b) % 2 ? 1 : -1; return { x:side * .22 * Math.min(1, ph * 3), lean:side * .05, jump:Math.sin(Math.min(1, ph * 1.6) * Math.PI) * .28, crouch:0, fa:.55, a:.55, legs:ph < .5 ? .9 : -.9 }; }
  if (st === 'robot'){ const k = Math.floor(t * 110 / 60 * 2), P = [[1.6, .2], [.2, 1.6], [1.6, 1.6], [2.6, .4], [.4, 2.6]][k % 5]; return { x:0, lean:0, jump:0, crouch:k % 2 ? .3 : 0, fa:P[0], a:P[1], legs:k % 2 ? .4 : -.4 }; }
  if (st === 'sinulog'){ const b = t * 116 / 60, ph = b % 3, fwd = ph < 2 ? ph * .12 : (3 - ph) * .24; return { x:Math.sin(b * Math.PI / 3) * .1, lean:Math.sin(b * Math.PI) * .08, jump:Math.abs(Math.sin(b * Math.PI)) * .08, crouch:.25 + fwd * .5, fa:2.6 + Math.sin(b * Math.PI) * .25, a:2.6 - Math.sin(b * Math.PI) * .25, legs:Math.sin(b * Math.PI) * .9 }; }
  if (st === 'trophy'){ const b = t * 120 / 60; return { x:0, lean:Math.sin(b * Math.PI) * .05, jump:Math.abs(Math.sin(b * Math.PI)) * .12, crouch:.15, fa:2.95, a:2.95, legs:0, trophy:true }; }
  if (st === 'dab'){ const k = Math.floor(t * 140 / 60 / 2) % 2; return { x:0, lean:k ? .22 : -.22, jump:0, crouch:.2, fa:k ? 2.5 : 1.0, a:k ? 1.0 : 2.5, legs:0 }; }
  return { x:0, lean:0, jump:Math.abs(Math.sin(t * 7)) * .2, crouch:0, fa:2.75 + Math.sin(t * 9 + 1) * .15, a:2.85 + Math.sin(t * 9) * .15 };
}
function drawBand(c, it, ex, ey, hx, hy, w){
  if (!it || !it.c1) return;
  const px = ex + (hx - ex) * .8, py = ey + (hy - ey) * .8, dx = (hx - ex), dy = (hy - ey), L2 = Math.hypot(dx, dy) || 1, ux = dx / L2 * .035, uy = dy / L2 * .035;
  let col = it.c1;
  if (it.fx === 'rainbow'){ const g = c.createLinearGradient(px - ux, py - uy, px + ux, py + uy); g.addColorStop(0, '#ff5c5c'); g.addColorStop(.33, '#ffe14d'); g.addColorStop(.66, '#4dd2ff'); g.addColorStop(1, '#c084fc'); col = g; }
  c.save(); c.lineCap = 'butt'; c.strokeStyle = col; c.lineWidth = w + .024; seg(c, px - ux, py - uy, px + ux, py + uy);
  if (it.c2){ c.strokeStyle = it.c2; c.globalAlpha = .6; c.lineWidth = w + .028; seg(c, px - ux * .15, py - uy * .15, px + ux * .15, py + uy * .15); }
  c.restore();
}
/* hair behind the head: afro, pigtails, twin tails */
function backHair(c, hs, hair, tie, t, run, B){
  c.fillStyle = hair;
  if (hs === 'afro'){ ell(c, 0, -1.66, .215, .19); }
  if (hs === 'pigtails' || hs === 'twintails'){
    const hi = hs === 'twintails', sw2 = Math.sin(t * 3 + run) * .025;
    for (const sx of [-1, 1]){
      c.beginPath(); c.moveTo(sx * .12, hi ? -1.73 : -1.62);
      c.quadraticCurveTo(sx * (hi ? .33 : .25) + sw2, hi ? -1.62 : -1.55, sx * (hi ? .27 : .2) + sw2, hi ? -1.22 : -1.4);
      c.quadraticCurveTo(sx * (hi ? .2 : .16), hi ? -1.5 : -1.5, sx * .1, hi ? -1.66 : -1.58); c.closePath(); c.fill();
      c.fillStyle = tie; ell(c, sx * .14, hi ? -1.71 : -1.6, .026, .02); c.fillStyle = hair;
    }
  }
}
/* hair on top of the head, including the special chest styles */
function topHair(c, hs, hair, hx, t, B, front){
  const tip = hx && hx.tip;
  if (hx && hx.glow){ const g = c.createRadialGradient(0, -1.74, .02, 0, -1.74, .36); g.addColorStop(0, hexA(hair, .45)); g.addColorStop(1, hexA(hair, 0)); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(0, -1.74, .36, 0, TAU); c.fill(); c.restore(); }
  const grad = (y0, y1) => { if (!tip) return hair; const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, hair); g.addColorStop(1, tip); return g; };
  if (hs === 'mohawk'){ c.fillStyle = grad(-1.72, -1.95); c.beginPath(); c.moveTo(-.04, -1.72); for (let i = 0; i <= 4; i++){ const xx = -.04 + i * .02; c.lineTo(xx + .01, -1.86 - Math.sin(i * 1.3) * .03 - (i === 2 ? .04 : 0)); } c.lineTo(.04, -1.72); c.closePath(); c.fill(); }
  if (hs === 'afro'){ c.fillStyle = hair; ell(c, 0, -1.76, .2, .1); for (let i = -3; i <= 3; i++) ell(c, i * .055, -1.82 + Math.abs(i) * .015, .05, .045); }
  if (hs === 'undercut'){ c.fillStyle = hair; c.beginPath(); c.ellipse(.025, -1.755, .14, .052, -.12, 0, TAU); c.fill(); }
  if (hs === 'manbun'){ c.fillStyle = hair; ell(c, 0, -1.79, .055, .048); c.fillStyle = shade(hair, -.25); ell(c, 0, -1.755, .04, .012); }
  if (hs === 'pixie'){ c.fillStyle = hair; c.beginPath(); c.ellipse(-.03, -1.735, .14, .045, .15, 0, TAU); c.fill(); }
  if (hs === 'superspike' || hs === 'flame'){
    const n = 7, fl = hs === 'flame';
    for (let i = 0; i < n; i++){
      const a = Math.PI * (1.08 + i * .84 / (n - 1)), len = (fl ? .2 + Math.sin(t * 9 + i * 1.7) * .035 : .2 + (i % 2 ? -.04 : .03)) * (i === 3 ? 1.2 : 1);
      const bx = Math.cos(a) * B.hx * .9, by = -1.64 + Math.sin(a) * .1, tx = bx + Math.cos(a) * len * (fl ? .6 : .9), ty = by + Math.sin(a) * len - (fl ? .06 : .02);
      c.fillStyle = grad(by, ty); c.beginPath(); c.moveTo(bx - Math.sin(a) * .045, by + Math.cos(a) * .045); c.lineTo(tx, ty); c.lineTo(bx + Math.sin(a) * .045, by - Math.cos(a) * .045); c.closePath(); c.fill();
    }
    c.fillStyle = hair; ell(c, 0, -1.72, B.hx + .01, .055);
  }
  if (hs === 'braid' && front){ c.fillStyle = hair; for (let i = 0; i < 4; i++) ell(c, .13, -1.56 + i * .06, .03, .028); }
}
function drawCharacter(c, x, y, s, look, facing, swing, run, moving, t, tag, fx){
  const F0 = fx || NOFX, DP = F0.dance ? dancePose(F0.dance.id, F0.dance.t) : null;
  const F = DP ? Object.assign({}, F0, { lean:DP.lean, jump:DP.jump, crouch:DP.crouch, cheer:false, sad:false }) : F0;
  const head = IT(look.head), top = IT(look.top), bot = IT(look.bottom), shoe = IT(look.shoes), pad = IT(look.paddle || 'pad_wood');
  const HX = IT(look.hairx || 'hair_own'), hxi = HX.style ? HX : null;      // chest hairstyles override your own
  const skin = SKINS[look.skin] || SKINS[0], skinD = shade(skin, -.2), hair = hxi ? hxi.c1 : HAIRS[look.hair] || HAIRS[0], hairD = shade(hair, -.3);
  const girl = look.gender === 'girl', front = facing === 'front', ps = front ? -1 : 1, B = bodyOf(girl, look.body);
  const hs = hxi ? hxi.style : look.hairStyle || (girl ? 'ponytail' : 'short');
  const hk = clamp((look.height || (girl ? 165 : 175)) / 172, .87, 1.16);
  const t1 = top.c1 || '#f5f7fb', t2 = top.c2 || '#1f3b8c', tst = top.style || 'tee';
  const b1 = bot.c1 || '#1f3b8c', b2 = bot.c2 || '#ffffff', bst = bot.style || 'shorts';
  const tie = head.style === 'band' ? (head.c1 || '#ff5c9a') : '#ff5c9a';
  const SLEEVE = { tee:.55, polo:.55, jersey:.6, tank:0, hoodie:1, kit:.6 }[tst] ?? .55;
  c.save(); c.translate(x, y); c.scale(s * hk, s * hk); c.lineCap = 'round'; c.lineJoin = 'round';
  // the World Champion crown comes with a glowing aura
  if (head.aura){
    const h1 = head.c1 || '#fff3bf', h2 = head.c2 || '#38bdf8';
    const pulse = .75 + Math.sin(t * 3) * .25, ag = c.createRadialGradient(0, -.9, .1, 0, -.9, 1.05);
    ag.addColorStop(0, hexA(h2, .32 * pulse)); ag.addColorStop(.6, hexA(h1, .12 * pulse)); ag.addColorStop(1, hexA(h1, 0));
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = ag; c.beginPath(); c.ellipse(0, -.9, .62, 1.05, 0, 0, TAU); c.fill();
    for (let k = 0; k < 6; k++){ const a2 = t * 1.6 + k * TAU / 6, rx = .42, ry = .12; c.fillStyle = hexA(k % 2 ? h1 : '#ffffff', .85); ell(c, Math.cos(a2) * rx, -.95 + Math.sin(a2) * ry - Math.sin(t * 2 + k) * .3, .018, .018); }
    c.restore();
  }
  // soft contact shadow, smaller while airborne
  const jump = F.jump || 0, sh = 1 / (1 + jump * 2.2);
  const sg = c.createRadialGradient(.04, .01, 0, .04, .01, .42);
  sg.addColorStop(0, `rgba(0,0,0,${.42 * sh})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sg; ell(c, .04, .01, .42 * sh, .12 * sh);
  if (DP && DP.x) c.translate(DP.x, 0);
  const sw = DP && DP.legs !== undefined ? DP.legs : moving ? Math.sin(run) : 0;
  const bob = moving ? Math.abs(Math.cos(run)) * .035 : Math.sin(t * 2.2) * .01;
  c.translate(0, -bob - jump);
  if (F.lean) c.rotate(F.lean);
  if (F.sad) c.rotate(ps * .06);
  if (F.crouch) c.scale(1 + F.crouch * .035, 1 - F.crouch * .075);
  // legs: thigh, knee, calf, sock, shoe
  for (const side of [-1, 1]){
    const lift = Math.max(0, side * sw) * (F.sprint ? .16 : .09);
    const hx = side * B.legX, hy = -.92, kx = side * (B.legX + .012), ky = -.5 - lift * .7, ax = side * (B.legX - .004), ay = -.1 - lift;
    c.strokeStyle = skin; c.lineWidth = B.thigh; seg(c, hx, hy, kx, ky);
    c.lineWidth = B.calf; seg(c, kx, ky, ax, ay - .02);
    c.strokeStyle = skinD; c.lineWidth = .022; seg(c, kx + side * B.calf * .38, ky + .05, ax + side * B.calf * .32, ay - .1);
    c.strokeStyle = '#ffffff'; c.lineWidth = B.calf + .006; seg(c, ax, ay - .12, ax, ay - .03);
    drawShoe(c, shoe, ax, ay);
  }
  // shorts / skirt
  if (bst === 'skirt'){
    c.fillStyle = b1; c.beginPath(); c.moveTo(-B.hip, -1.0); c.lineTo(B.hip, -1.0); c.lineTo(B.hip + .11, -.6); c.quadraticCurveTo(0, -.55, -B.hip - .11, -.6); c.closePath(); c.fill();
    c.strokeStyle = shade(b1, -.18); c.lineWidth = .014; for (const k of [-.15, -.05, .05, .15]) seg(c, k * .7, -.98, k * 1.25, -.59);
    c.fillStyle = b2; c.fillRect(-B.hip, -1.0, B.hip * 2, .035);
  } else {
    const hem = bst === 'long' ? -.48 : B.hem, w = B.hip + .02;
    c.fillStyle = b1; c.beginPath(); c.moveTo(-w, -1.0); c.lineTo(w, -1.0); c.lineTo(w + .035, hem); c.lineTo(.025, hem); c.lineTo(0, -.82); c.lineTo(-.025, hem); c.lineTo(-w - .035, hem); c.closePath(); c.fill();
    c.fillStyle = shade(b1, -.15); c.fillRect(-w, -1.0, w * 2, .04);
    c.strokeStyle = b2;
    if (bst === 'track'){ c.lineWidth = .02; for (const sx of [-1, 1]){ seg(c, sx * (w + .013), -.97, sx * (w + .035), hem); seg(c, sx * (w - .015), -.97, sx * (w + .007), hem); } }
    else { c.lineWidth = .018; for (const sx of [-1, 1]) seg(c, sx * (w + .015), -.96, sx * (w + .035), hem + .02); }
  }
  // back arm
  const fa = DP ? DP.fa : F.cheer ? 2.75 + Math.sin(t * 9 + 1) * .15 : F.sad ? .06 : .18 + (moving ? -sw * (F.sprint ? .85 : .4) : Math.sin(t * 2) * .03), shX = B.sh - .03;
  { const r2 = limb(c, -ps * shX, -1.37, -ps * fa, -ps * .35, .27, .25, skin, t1, SLEEVE, tst === 'hoodie' ? t1 : null, B.arm, B.fore); drawBand(c, IT(look.wrist), r2[2], r2[3], r2[0], r2[1], B.fore); }
  if (tst === 'hoodie'){ c.fillStyle = shade(t1, -.12); ell(c, 0, front ? -1.44 : -1.47, B.sh * .65, .08); }
  // long hair falls behind the shoulders
  if (hs === 'long' && front){ c.fillStyle = hair; rr(c, -.16, -1.66, .32, .34, .08); c.fill(); }
  if (front) backHair(c, hs, hair, tie, t, run, B);
  // torso shaped by gender, details clipped inside it
  const g = c.createLinearGradient(-B.sh, 0, B.sh, 0);
  g.addColorStop(0, shade(t1, -.14)); g.addColorStop(.45, t1); g.addColorStop(1, shade(t1, -.24));
  c.fillStyle = g; torsoPath(c, B); c.fill();
  c.save(); torsoPath(c, B); c.clip();
  c.lineWidth = .02;
  if (tst === 'tank'){ c.fillStyle = skin; ell(c, -B.sh + .02, -1.4, .06, .055); ell(c, B.sh - .02, -1.4, .06, .055); c.strokeStyle = t2; seg(c, -B.sh + .06, -1.44, -B.sh + .03, -1.2); seg(c, B.sh - .06, -1.44, B.sh - .03, -1.2); }
  if (tst === 'jersey'){ c.fillStyle = t2; c.fillRect(-B.sh - .02, -1.42, .065, .44); c.fillRect(B.sh - .045, -1.42, .065, .44); }
  if (tst === 'kit' && !top.deco){ c.strokeStyle = t2; c.lineWidth = .045; seg(c, -B.sh, -1.42, B.sh, -1.0); }
  // flag shirts: the whole front and back; national jerseys: a small chest patch
  if (top.flagBig){ const fi = flagImg(top.flag); if (fi) c.drawImage(fi, -B.sh * 1.15, -1.47, B.sh * 2.3, .46); }
  else if (top.flag && front){ const fi = flagImg(top.flag); if (fi){ c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(.028, -1.395, .094, .064); c.drawImage(fi, .032, -1.391, .086, .056); } }
  // shirt designs: stripes, hoops, sash, halves, side panels, numbers
  const dz = top.deco, t3 = top.c3 || t2;
  if (dz === 'stripes'){ c.fillStyle = t2; for (let x2 = -B.sh - .02; x2 < B.sh + .02; x2 += .075) c.fillRect(x2, -1.5, .03, .56); }
  if (dz === 'hoops'){ c.fillStyle = t2; for (let y2 = -1.42; y2 < -1.0; y2 += .085) c.fillRect(-B.sh - .03, y2, B.sh * 2 + .06, .036); }
  if (dz === 'sash'){ c.lineCap = 'butt'; c.strokeStyle = t3; c.lineWidth = .095; seg(c, -B.sh - .04, -1.48, B.sh + .04, -1.0); c.strokeStyle = t2; c.lineWidth = .06; seg(c, -B.sh - .04, -1.48, B.sh + .04, -1.0); c.lineCap = 'round'; }
  if (dz === 'halves'){ c.fillStyle = t2; c.fillRect(-B.sh - .03, -1.23, B.sh * 2 + .06, .32); if (top.c3){ c.fillStyle = top.c3; ell(c, 0, -1.31, .042, .042); for (let k = 0; k < 8; k++){ const a2 = k * TAU / 8; seg(c, Math.cos(a2) * .05, -1.31 + Math.sin(a2) * .05, Math.cos(a2) * .066, -1.31 + Math.sin(a2) * .066); } } }
  if (dz === 'sides'){ c.fillStyle = t2; c.fillRect(-B.sh - .02, -1.44, .075, .46); c.fillRect(B.sh - .055, -1.44, .075, .46); if (top.c3){ c.fillStyle = top.c3; c.fillRect(-B.sh, -1.31, B.sh * 2, .028); } }
  if (dz === 'worn'){    // faded, patched and a bit torn, but clean and proud
    c.fillStyle = 'rgba(120,110,90,.25)'; ell(c, -.08, -1.2, .09, .06); ell(c, .1, -1.33, .06, .05);
    c.fillStyle = shade(t1, -.18); rr(c, .05, -1.18, .07, .06, .01); c.fill(); c.strokeStyle = 'rgba(60,50,40,.6)'; c.lineWidth = .006; c.setLineDash([.008, .006]); c.strokeRect(.05, -1.18, .07, .06); c.setLineDash([]);
    c.fillStyle = skin; ell(c, -.12, -1.07, .016, .01); ell(c, .02, -1.38, .012, .008);
    c.strokeStyle = shade(t1, -.3); c.lineWidth = .008; for (let x2 = -B.sh + .02; x2 < B.sh - .02; x2 += .035) seg(c, x2, -1.0, x2 + .01, -.975);
  }
  if (dz === 'number' && top.num){ c.save(); c.scale(.01, .01); c.fillStyle = t2; c.font = `${front ? 15 : 24}px "Russo One", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(top.num, 0, front ? -122 : -118); c.restore(); }
  c.fillStyle = shade(t1, -.2); c.fillRect(-.3, -1.02, .6, .03);
  c.restore();
  if (front){
    if (tst === 'polo'){ c.fillStyle = t2; c.beginPath(); c.moveTo(-.09, -1.45); c.lineTo(0, -1.38); c.lineTo(-.03, -1.33); c.closePath(); c.fill(); c.beginPath(); c.moveTo(.09, -1.45); c.lineTo(0, -1.38); c.lineTo(.03, -1.33); c.closePath(); c.fill(); c.fillStyle = shade(t1, -.3); ell(c, 0, -1.29, .012, .012); ell(c, 0, -1.23, .012, .012); }
    else if (tst === 'hoodie'){ c.fillStyle = shade(t1, -.1); rr(c, -.11, -1.17, .22, .12, .04); c.fill(); c.strokeStyle = t2; c.lineWidth = .012; seg(c, -.04, -1.42, -.05, -1.3); seg(c, .04, -1.42, .05, -1.3); }
    else { c.fillStyle = skin; c.beginPath(); c.arc(0, -1.455, girl ? .075 : .062, 0, Math.PI); c.fill(); c.strokeStyle = t2; c.lineWidth = .018; c.beginPath(); c.arc(0, -1.455, girl ? .08 : .067, 0, Math.PI); c.stroke(); }
    if ((tst === 'jersey' || tst === 'kit') && tag && top.deco !== 'number' && top.deco !== 'halves'){ c.save(); c.scale(.01, .01); c.fillStyle = t2; c.font = '11px "Russo One", Impact, sans-serif'; c.textAlign = 'center'; c.fillText(tag, 9, -128); c.restore(); }
  } else {
    if (tst === 'polo'){ c.fillStyle = t2; c.fillRect(-.09, -1.46, .18, .03); }
    if ((tst === 'jersey' || tst === 'kit' || tst === 'tee') && tag && top.deco !== 'number'){ c.save(); c.scale(.01, .01); c.fillStyle = tst === 'tee' ? shade(t1, -.35) : t2; c.font = '22px "Russo One", Impact, sans-serif'; c.textAlign = 'center'; c.fillText(tag, 0, -116); c.restore(); }
  }
  // neck, ears, head
  c.fillStyle = skinD; c.fillRect(-B.neck / 2, -1.52, B.neck, .1);
  c.fillStyle = skin; ell(c, -B.hx, -1.6, .03, .04); ell(c, B.hx, -1.6, .03, .04);
  if (girl && front && hs !== 'long' && hs !== 'bob'){ c.fillStyle = '#f5c542'; ell(c, -B.hx - .005, -1.565, .012, .012); ell(c, B.hx + .005, -1.565, .012, .012); }
  c.fillStyle = skin;
  if (girl){ c.beginPath(); c.moveTo(-B.hx, -1.63); c.quadraticCurveTo(-B.hx, -1.75, 0, -1.755); c.quadraticCurveTo(B.hx, -1.75, B.hx, -1.63); c.quadraticCurveTo(B.hx * .95, -1.5, 0, -1.455); c.quadraticCurveTo(-B.hx * .95, -1.5, -B.hx, -1.63); c.fill(); }
  else { c.beginPath(); c.moveTo(-B.hx, -1.64); c.quadraticCurveTo(-B.hx, -1.76, 0, -1.76); c.quadraticCurveTo(B.hx, -1.76, B.hx, -1.64); c.lineTo(B.hx * .92, -1.53); c.quadraticCurveTo(B.hx * .7, -1.455, 0, -1.452); c.quadraticCurveTo(-B.hx * .7, -1.455, -B.hx * .92, -1.53); c.closePath(); c.fill(); }
  // hair
  c.fillStyle = hair;
  if (!front){
    if (hs === 'ponytail'){
      const pw = Math.sin(t * 3 + run) * .05;
      c.beginPath(); c.moveTo(-.055, -1.63); c.quadraticCurveTo(pw * 1.5 - .1, -1.42, pw, -1.22); c.quadraticCurveTo(pw * 1.5 + .1, -1.42, .055, -1.63); c.fill();
      c.fillStyle = tie; ell(c, -.03, -1.62, .03, .022); ell(c, .03, -1.62, .03, .022); ell(c, 0, -1.62, .016, .016); c.fillStyle = hair;
    }
    if (hs === 'long'){ c.beginPath(); c.moveTo(-.155, -1.6); c.quadraticCurveTo(-.19, -1.3, -.14, -1.22); c.lineTo(.14, -1.22); c.quadraticCurveTo(.19, -1.3, .155, -1.6); c.fill(); }
    if (hs === 'bob'){ rr(c, -.16, -1.68, .32, .22, .07); c.fill(); }
    ell(c, 0, -1.62, B.hx + .01, .15);
    backHair(c, hs, hair, tie, t, run, B);
    if (hs === 'braid'){ for (let i = 0; i < 6; i++){ c.fillStyle = i % 2 ? hairD : hair; ell(c, Math.sin(t * 2 + i) * .006, -1.5 + i * .055, .035 - i * .002, .032); } c.fillStyle = tie; ell(c, 0, -1.18, .025, .016); c.fillStyle = hair; }
    if (hs === 'buzz'){ c.fillStyle = skin; c.globalAlpha = .35; ell(c, 0, -1.6, B.hx - .01, .13); c.globalAlpha = 1; }
    if (!girl){ c.fillStyle = skin; ell(c, 0, -1.49, .07, .028); }
  } else {
    if (girl){
      if (hs === 'bob'){ rr(c, -.175, -1.71, .075, .25, .035); c.fill(); rr(c, .1, -1.71, .075, .25, .035); c.fill(); }
      else if (hs === 'long'){ rr(c, -.175, -1.7, .07, .4, .035); c.fill(); rr(c, .105, -1.7, .07, .4, .035); c.fill(); }
      else { c.beginPath(); c.moveTo(-.135, -1.66); c.quadraticCurveTo(-.16, -1.58, -.13, -1.5); c.lineTo(-.115, -1.6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(.135, -1.66); c.quadraticCurveTo(.16, -1.58, .13, -1.5); c.lineTo(.115, -1.6); c.closePath(); c.fill(); }
      if (hs === 'ponytail'){ const pw = Math.sin(t * 3 + run) * .03; c.beginPath(); c.moveTo(.1, -1.7); c.quadraticCurveTo(.24 + pw, -1.6, .2 + pw, -1.38); c.quadraticCurveTo(.17, -1.55, .09, -1.62); c.fill(); c.fillStyle = tie; ell(c, .135, -1.69, .028, .02); c.fillStyle = hair; }
      // side-swept fringe
      c.beginPath(); c.arc(0, -1.625, B.hx + .012, Math.PI, TAU); c.lineTo(B.hx + .012, -1.6); c.quadraticCurveTo(.04, -1.69, -.06, -1.635); c.quadraticCurveTo(-.11, -1.62, -B.hx - .012, -1.6); c.closePath(); c.fill();
    } else {
      c.beginPath(); c.arc(0, -1.635, B.hx + .008, Math.PI, TAU); c.lineTo(B.hx + .008, -1.62); c.quadraticCurveTo(.06, hs === 'buzz' ? -1.72 : -1.69, -.02, -1.665); c.quadraticCurveTo(-.09, hs === 'buzz' ? -1.72 : -1.7, -B.hx - .008, -1.62); c.closePath(); c.fill();
      if (hs !== 'buzz' && hs !== 'mohawk'){ c.fillRect(-B.hx - .004, -1.65, .028, .07); c.fillRect(B.hx - .024, -1.65, .028, .07); }
      if (hs === 'long' || hs === 'bob'){ rr(c, -.175, -1.7, .07, hs === 'long' ? .4 : .25, .035); c.fill(); rr(c, .105, -1.7, .07, hs === 'long' ? .4 : .25, .035); c.fill(); }
      if (hs === 'mohawk'){ c.fillStyle = skin; c.globalAlpha = .4; c.beginPath(); c.arc(0, -1.635, B.hx, Math.PI, TAU); c.fill(); c.globalAlpha = 1; c.fillStyle = hair; }
      if (hs === 'buzz'){ c.fillStyle = skin; c.globalAlpha = .35; c.beginPath(); c.arc(0, -1.635, B.hx, Math.PI, TAU); c.fill(); c.globalAlpha = 1; }
    }
    // face
    const er = girl ? .028 : .022, eh = girl ? .026 : .019, ey = -1.59;
    c.fillStyle = '#ffffff'; ell(c, -.052, ey, er, eh); ell(c, .052, ey, er, eh);
    c.fillStyle = girl ? '#3a2416' : '#1f1a17'; ell(c, -.048, ey + .002, er * .62, eh * .82); ell(c, .056, ey + .002, er * .62, eh * .82);
    c.fillStyle = '#ffffff'; ell(c, -.043, ey - .006, .006, .006); ell(c, .061, ey - .006, .006, .006);
    if (girl){
      c.strokeStyle = '#1b1210'; c.lineWidth = .011;
      for (const sx of [-1, 1]){ c.beginPath(); c.arc(sx * .052, ey + .004, er * 1.05, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); seg(c, sx * (.052 + er * .95), ey - .01, sx * (.052 + er * 1.45), ey - .024); }
      c.strokeStyle = hairD; c.lineWidth = .009;
      c.beginPath(); c.moveTo(-.085, -1.628); c.quadraticCurveTo(-.055, -1.648, -.025, -1.633); c.stroke();
      c.beginPath(); c.moveTo(.025, -1.633); c.quadraticCurveTo(.055, -1.648, .085, -1.628); c.stroke();
      c.fillStyle = 'rgba(255,105,130,.4)'; ell(c, -.088, -1.545, .027, .018); ell(c, .088, -1.545, .027, .018);
      c.fillStyle = '#d9536a'; ell(c, 0, -1.528, .028, .013); c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, -.008, -1.532, .009, .004);
    } else {
      c.strokeStyle = hairD; c.lineWidth = .022; seg(c, -.085, -1.627, -.024, -1.633); seg(c, .024, -1.633, .085, -1.627);
      c.strokeStyle = '#7a3428'; c.lineWidth = .016; c.beginPath(); c.arc(0, -1.535, .036, .2 * Math.PI, .8 * Math.PI); c.stroke();
    }
    c.strokeStyle = skinD; c.lineWidth = .012; c.beginPath(); c.moveTo(0, -1.585); c.lineTo(-.008, -1.552); c.lineTo(.006, -1.549); c.stroke();
  }
  if (hs === 'spiky'){ c.fillStyle = hair; for (let i = -2; i <= 2; i++){ c.beginPath(); c.moveTo(i * .055 - .035, -1.73); c.lineTo(i * .06, -1.82 + Math.abs(i) * .02); c.lineTo(i * .055 + .035, -1.73); c.fill(); } }
  if (hs === 'curly'){ c.fillStyle = hair; for (let i = -3; i <= 3; i++) ell(c, i * .045, -1.74 + Math.abs(i) * .012, .04, .035); }
  if (hs === 'buns'){ c.fillStyle = hair; ell(c, -.1, -1.76, .055, .055); ell(c, .1, -1.76, .055, .055); c.fillStyle = tie; ell(c, -.1, -1.715, .03, .012); ell(c, .1, -1.715, .03, .012); }
  topHair(c, hs, hair, hxi, t, B, front);
  // headwear
  const h1 = head.c1 || '#e23b3b', h2 = head.c2 || '#ffffff', hst = head.style || 'none';
  const clip = () => { c.save(); c.beginPath(); c.arc(0, -1.62, B.hx + .016, 0, TAU); c.clip(); };
  if (hst === 'band'){ clip(); c.fillStyle = h1; c.fillRect(-.2, -1.715, .4, .042); c.restore(); }
  if (hst === 'cap' || hst === 'capback'){
    c.fillStyle = h1; c.beginPath(); c.arc(0, -1.66, B.hx + .015, Math.PI, TAU); c.closePath(); c.fill();
    c.strokeStyle = shade(h1, -.2); c.lineWidth = .01; seg(c, 0, -1.81, 0, -1.66); c.fillStyle = h2; ell(c, 0, -1.815, .018, .012);
    if ((hst === 'cap') === front){ c.fillStyle = shade(h1, -.18); c.beginPath(); c.ellipse(0, -1.655, B.hx + .03, .045, 0, 0, Math.PI); c.fill(); }
    else { c.fillStyle = h2; ell(c, 0, -1.67, .03, .015); }
  }
  if (hst === 'visor'){ clip(); c.fillStyle = h1; c.fillRect(-.2, -1.72, .4, .05); c.restore(); if (front){ c.fillStyle = h2; c.beginPath(); c.ellipse(0, -1.675, B.hx + .03, .045, 0, 0, Math.PI); c.fill(); } }
  if (hst === 'bucket'){ c.fillStyle = shade(h1, -.15); ell(c, 0, -1.67, .23, .055); c.fillStyle = h1; c.beginPath(); c.moveTo(-.14, -1.67); c.quadraticCurveTo(-.13, -1.83, 0, -1.84); c.quadraticCurveTo(.13, -1.83, .14, -1.67); c.closePath(); c.fill(); c.fillStyle = h2; c.fillRect(-.14, -1.71, .28, .03); }
  if (hst === 'beanie'){ c.fillStyle = h1; c.beginPath(); c.arc(0, -1.67, B.hx + .015, Math.PI, TAU); c.closePath(); c.fill(); c.fillStyle = h2; rr(c, -B.hx - .018, -1.71, (B.hx + .018) * 2, .06, .02); c.fill(); ell(c, 0, -1.84, .04, .04); }
  if (hst === 'salakot'){   // wide woven Filipino hat
    c.fillStyle = h1; c.beginPath(); c.ellipse(0, -1.765, .29, .075, 0, 0, TAU); c.fill();
    c.fillStyle = shade(h1, .08); c.beginPath(); c.moveTo(-.17, -1.77); c.quadraticCurveTo(-.11, -1.96, 0, -1.985); c.quadraticCurveTo(.11, -1.96, .17, -1.77); c.closePath(); c.fill();
    c.strokeStyle = h2; c.lineWidth = .008; for (let k = -3; k <= 3; k++) seg(c, k * .048, -1.775, k * .02, -1.955 + Math.abs(k) * .03);
    c.lineWidth = .012; c.beginPath(); c.ellipse(0, -1.765, .29, .075, 0, 0, TAU); c.stroke(); c.fillStyle = h2; c.fillRect(-.17, -1.8, .34, .014);
  }
  if (hst === 'laurel'){   // golden laurel wreath around the head
    c.fillStyle = h1; c.strokeStyle = h2; c.lineWidth = .008;
    for (const side of [-1, 1]) for (let k = 0; k < 6; k++){
      const a2 = Math.PI * (side < 0 ? 1.05 + k * .085 : 1.95 - k * .085), r2 = B.hx + .025, lx = Math.cos(a2) * r2, ly = -1.63 + Math.sin(a2) * r2 * .9;
      c.save(); c.translate(lx, ly); c.rotate(a2 + Math.PI / 2 + side * .5); c.beginPath(); c.ellipse(0, 0, .03, .013, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
    }
    c.fillStyle = h2; ell(c, 0, -1.755, .016, .012);
  }
  if (hst === 'crown'){ c.fillStyle = h1; c.beginPath(); c.moveTo(-.12, -1.71); c.lineTo(-.13, -1.86); c.lineTo(-.065, -1.78); c.lineTo(0, -1.89); c.lineTo(.065, -1.78); c.lineTo(.13, -1.86); c.lineTo(.12, -1.71); c.closePath(); c.fill(); c.fillStyle = h2; ell(c, 0, -1.75, .02, .02); ell(c, -.075, -1.74, .014, .014); ell(c, .075, -1.74, .014, .014); }
  // paddle arm
  const pr = 1 - swing;
  const a = DP ? DP.a : F.cheer ? 2.85 + Math.sin(t * 9) * .15 : F.sad ? .35 : .85 + (swing > 0 ? Math.sin(pr * Math.PI) * 1.5 : 0) + (moving ? (F.sprint ? sw * .55 : 0) : Math.sin(t * 2) * .05) + (F.crouch || 0) * .25;
  const [hx, hy, ex, ey] = limb(c, ps * shX, -1.37, ps * a, ps * .3, .27, .25, skin, t1, SLEEVE, tst === 'hoodie' ? t1 : null, B.arm, B.fore);
  drawBand(c, IT(look.wrist), ex, ey, hx, hy, B.fore);
  if (DP && DP.trophy){   // Trophy Lift: a golden cup held high
    const tx = 0, ty = -2.18, tg = c.createLinearGradient(tx - .12, 0, tx + .12, 0); tg.addColorStop(0, '#b7791f'); tg.addColorStop(.5, '#fff3bf'); tg.addColorStop(1, '#d69e2e');
    c.fillStyle = tg; c.beginPath(); c.moveTo(tx - .11, ty - .1); c.lineTo(tx + .11, ty - .1); c.quadraticCurveTo(tx + .11, ty + .06, tx, ty + .08); c.quadraticCurveTo(tx - .11, ty + .06, tx - .11, ty - .1); c.fill();
    c.fillRect(tx - .018, ty + .07, .036, .09); c.fillRect(tx - .07, ty + .15, .14, .04);
    c.strokeStyle = '#d69e2e'; c.lineWidth = .02; c.beginPath(); c.arc(tx - .12, ty - .04, .04, Math.PI * .5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(tx + .12, ty - .04, .04, -Math.PI * .5, Math.PI * .5); c.stroke();
  } else drawPaddle(c, pad, hx, hy, Math.atan2(hy - ey, hx - ex));
  c.restore();
}
