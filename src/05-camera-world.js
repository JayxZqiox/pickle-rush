/* ---------- canvas + camera ---------- */
const cv = $('#game'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
let isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const CAM = { D:8, H:5.5, F:600, cx:0, baseCx:0, hy:0 };
let CROWD = [];
const GFX = { cap:2, low:false, auto:true, ema:.0167, floor:0, slowT:0, fps:60, fpsN:0, fpsT:0 };
function applyGfx(){
  const m = data.opts.gfx || 'auto';
  GFX.auto = m === 'auto'; GFX.low = m === 'low';
  GFX.cap = m === 'low' ? 1 : m === 'high' ? 2 : (isTouch ? 1.5 : 2);
  GFX.ema = .0167; GFX.floor = 0; GFX.slowT = 0;
  WORLD.key = ''; resize();
}
function degradeGfx(){
  GFX.slowT = 0; GFX.ema = GFX.floor || .0167;
  if (GFX.cap > 1.01){ GFX.cap = Math.max(1, GFX.cap - .5); resize(); }
  else if (!GFX.low){ GFX.low = true; WORLD.key = ''; }
}
const rectOf = cv2 => cv2._r || (cv2._r = { width:cv2.clientWidth, height:cv2.clientHeight });
function invalidateRects(){ for (const k of document.getElementsByTagName('canvas')) k._r = null; }
function resize(){
  DPR = Math.min(GFX.cap, window.devicePixelRatio || 1);
  const vv = window.visualViewport;
  VW = Math.round((vv && vv.width) || window.innerWidth || document.documentElement.clientWidth);
  VH = Math.round((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight);
  // the canvas is sized to exactly what is visible, so the court can never end up in a corner
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  fitCamera();
  buildCrowd(); invalidateRects();
}
/* Camera presets (like a sports game's camera menu). yaw turns the camera around the court,
   R is its distance from the court center, H its height; zero pitch keeps players upright. */
const CAMS = {
  classic:   { name:'Classic',   yaw:0,     R:14.7, H:0,  follow:.012, hint:'Behind your baseline' },
  action:    { name:'Action',    yaw:0,     R:14.7, H:0,  follow:.03,  zoom:1.16, hint:'Zoomed in, follows you and the ball' },
  low:       { name:'Low',       yaw:0,     R:12.6, H:3.1, follow:.03, hint:'Down at the players’ level' },
  sky:       { name:'Sky',       yaw:0,     R:20,   H:12, follow:.008, hint:'High above the court' },
  broadcast: { name:'Broadcast', yaw:-Math.PI / 2, R:13.5, H:9, follow:.008, fitW:.94, hint:'TV side view' },
  corner:    { name:'Corner',    yaw:-.62,  R:16.5, H:7.5, follow:.02, hint:'Angled from the corner' },
};
const CAM_ORDER = ['classic', 'action', 'low', 'sky', 'broadcast', 'corner'];
function setCamera(k){ if (!CAMS[k]) return; data.opts.camera = k; save(); fitCamera(); showToast(`Camera ${CAM_ORDER.indexOf(k) + 1}: ${CAMS[k].name}`, CAMS[k].hint); if (screenNow === 'ctrl') renderCtrl(); }
const camKey = () => G.mode === 'demo' ? 'classic' : (CAMS[data.opts.camera] ? data.opts.camera : 'classic');
function setBasis(yaw, R){
  CAM.yaw = yaw; CAM.R = R;
  CAM.fx = Math.sin(yaw); CAM.fy = Math.cos(yaw); CAM.rx = Math.cos(yaw); CAM.ry = -Math.sin(yaw);
  CAM.px = -CAM.fx * R; CAM.py = NET - CAM.fy * R;
}
function fitCamera(){
  const P = CAMS[camKey()];
  CAM.preset = camKey(); CAM.follow = P.follow; CAM.zoom = P.zoom || 1;
  // online players on the far team see the court from their own side
  setBasis(P.yaw + (G.flip ? Math.PI : 0), P.R);
  // taller screens (phones held upright) get a higher camera so the court fills the space
  CAM.H = P.H || clamp(5.5 + (VH / VW - .55) * 4.2, 5.5, 10.5);
  CAM.F = 1; CAM.cx = 0; CAM.hy = 0;
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  const wpts = [[-HW - .3, 0, 0], [HW + .3, 0, 0], [-HW - .3, L, 0], [HW + .3, L, 0], [0, -1.4, 0], [0, L + 1.4, 0]];
  for (const [x, y, z] of wpts){ const q = projRaw(x, y, z); u0 = Math.min(u0, q[0]); u1 = Math.max(u1, q[0]); }
  for (const x of [-HW - .3, HW + .3]) for (const y of [-1.2, L + .9]) for (const z of [0, 1.9]){ const q = projRaw(x, y, z); v0 = Math.min(v0, q[1]); v1 = Math.max(v1, q[1]); }
  const top = VH < 500 ? 78 : 92, bottom = isTouch ? (VH < 500 ? 10 : 24) : 22, avail = Math.max(120, VH - top - bottom);
  const F = Math.min(avail / (v1 - v0), VW * (P.fitW || 1.08) / (u1 - u0));       // whole court visible, both ways
  CAM.F = F; CAM.baseCx = CAM.cx = VW / 2 - F * (u0 + u1) / 2;
  CAM.hy = top + Math.max(0, (avail - (v1 - v0) * F) / 2) - v0 * F;
  WORLD.key = '';
  buildCrowd(); invalidateRects();
}
function projRaw(x, y, z){
  const px = x - CAM.px, py = y - CAM.py, d = Math.max(.5, px * CAM.fx + py * CAM.fy), u = px * CAM.rx + py * CAM.ry, s = CAM.F / d;
  return [CAM.cx + u * s, CAM.hy + (CAM.H - z) * s, s];
}
const proj = projRaw;
const depthOf = (x, y) => (x - CAM.px) * CAM.fx + (y - CAM.py) * CAM.fy;
// a point in camera-aligned court coordinates: a = sideways, b = away from the camera (0 = court center)
const projRig = (a, b, z) => projRaw(CAM.rx * a + CAM.fx * b, NET + CAM.ry * a + CAM.fy * b, z);
function rigExtent(){
  let far = -1e9, side = 0;
  for (const [x, y] of [[-HW, 0], [HW, 0], [-HW, L], [HW, L]]){ far = Math.max(far, x * CAM.fx + (y - NET) * CAM.fy); side = Math.max(side, Math.abs(x * CAM.rx + (y - NET) * CAM.ry)); }
  return { far:far + 3.6, side:side + 5 };
}
const nearTeam = () => CAM.fy >= -1e-6 ? 1 : 2;
function facingOf(p){ const dot = (p.team === 1 ? 1 : -1) * CAM.fy; return dot > .35 ? 'back' : dot < -.35 ? 'front' : (p.team === nearTeam() ? 'back' : 'front'); }
function buildCrowd(){
  CROWD = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const top = projRig(0, rigExtent().far, .9)[1];
  const cols = ['#f87171','#fbbf24','#34d399','#60a5fa','#c084fc','#f472b6','#e5e7eb','#fb923c','#22d3ee','#a3e635'];
  const signs = ['GO!', 'ACE!', 'WOW', '11!', 'DINK!', 'PICKLE'];
  for (let row = 0; row < 7; row++){
    const sz = 7 - row * .45, y = top - 8 - row * (sz * 2.6);
    if (y < -10) break;
    for (let x = -10; x < VW + 10; x += sz * 2.2 + rnd() * 5){
      if (rnd() < .06) continue;   // a few empty seats
      CROWD.push({ x, y, s:sz, c:cols[(rnd() * cols.length) | 0], k:SKINS[(rnd() * SKINS.length) | 0], h:HAIRS[(rnd() * 4) | 0], ph:rnd() * TAU,
        sign:rnd() < .035 ? signs[(rnd() * signs.length) | 0] : null, row });
    }
  }
}
const THEMES = {
  court_stadium:{ night:true, city:['#0b1a33', '#ffd98a'], sky:['#081227', '#122a4e', '#0d1d36'], stands:'rgba(20,34,62,.95)', surround:'#1d4a73', court:'#2a5fae', kitchen:'#26a65b', line:'#f4f8ff', board:'#0f2340', boardText:'#e8ff3d', light:'255,244,210', crowd:1 },
  court_beach:  { sky:['#b8573a', '#d27a55', '#e3a77c'], stands:'rgba(92,54,34,.7)', surround:'#b99a6a', court:'#1a6f8c', kitchen:'#278a55', line:'#eef2f6', board:'#1a6f8a', boardText:'#fff3c4', light:'255,226,170', crowd:.75, sun:true },
  court_clay:   { night:true, city:['#1a2638', '#ffcf8a'], sky:['#1b2c44', '#34506e', '#5d7a92'], stands:'rgba(58,42,34,.95)', surround:'#93462a', court:'#a85434', kitchen:'#27864d', line:'#f3e9dc', board:'#3a2016', boardText:'#ffd9a8', light:'255,230,200', crowd:1 },
  court_neon:   { night:true, city:['#12062b', '#ff4fd8', '#5ff4ff'], sky:['#05010f', '#1a0938', '#0b0420'], stands:'rgba(18,7,38,.95)', surround:'#1b0f3a', court:'#2b1a6b', kitchen:'#14b86a', line:'#5ff4ff', board:'#09031a', boardText:'#ff4fd8', light:'255,79,216', crowd:1, neon:true },
  court_park:   { sky:['#4d86b5', '#79a9cf', '#a7c8e0'], stands:'rgba(34,74,34,.92)', surround:'#3e7a37', court:'#2a64a6', kitchen:'#22894d', line:'#eef2f6', board:'#2d5e2a', boardText:'#ffffff', light:'255,255,255', crowd:.55, trees:true },
  court_lansangan:{ night:true, street:true, city:['#141018', '#ffd28a'], sky:['#120d1c', '#2a1d33', '#3d2a3a'], stands:'rgba(28,24,30,.95)', surround:'#3a3b40', court:'#56595f', kitchen:'#4f6b55', line:'#f1e3a1', board:'#26221f', boardText:'#ffcc66', light:'255,214,150', crowd:.08 },
  court_barangay: { covered:true, sky:['#30363f', '#454c58', '#575f6b'], stands:'rgba(42,46,54,.95)', surround:'#6f7169', court:'#2a5e46', kitchen:'#9c4034', line:'#eef2f6', board:'#1f3b2c', boardText:'#fcd116', light:'255,250,235', crowd:.3 },
  court_royal:  { night:true, city:['#1d0d33', '#f5c542'], sky:['#1a0d2e', '#3b1d5c', '#24113f'], stands:'rgba(42,19,63,.95)', surround:'#5b1d3a', court:'#2a3d8f', kitchen:'#1f9e5e', line:'#f5c542', board:'#1a0b28', boardText:'#f5c542', light:'245,197,66', crowd:1 },
};
const theme = () => THEMES[G.court] || THEMES.court_stadium;
function paintCrowd(c, th, cheer, cy){
  for (let i = 0; i < CROWD.length; i++){
    const p = CROWD[i];
    if (th.crowd < 1 && (i * 7919) % 100 > th.crowd * 100) continue;
    const s = p.s, x = p.x + PAD, y = p.y - cy - (cheer ? s * .35 : 0);
    c.globalAlpha = .9 - p.row * .05;
    if (cheer){ c.strokeStyle = p.k; c.lineWidth = s * .35; c.lineCap = 'round'; seg(c, x - s * .55, y - s * .2, x - s * .9, y - s * 1.5); seg(c, x + s * .55, y - s * .2, x + s * .9, y - s * 1.5); }
    c.fillStyle = p.c; rr(c, x - s * .7, y - s * .5, s * 1.4, s * 1.6, s * .5); c.fill();
    c.fillStyle = p.k; c.beginPath(); c.arc(x, y - s * .95, s * .55, 0, TAU); c.fill();
    c.fillStyle = p.h; c.beginPath(); c.arc(x, y - s * 1.1, s * .55, Math.PI, TAU); c.fill();
    if (p.sign){
      const sy = y - s * (cheer ? 3 : 2.4);
      c.fillStyle = '#ffffff'; rr(c, x - s * 2.2, sy - s * .9, s * 4.4, s * 1.8, s * .3); c.fill();
      c.fillStyle = '#1c1f26'; c.font = `${Math.max(7, Math.round(s * 1.1))}px "Russo One", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.sign, x, sy + s * .05);
    }
  }
  c.globalAlpha = 1;
}
/* The stadium never changes, so it is drawn once into saved images and reused every frame. */
const PAD = 150, PADY = 24;
const WORLD = { key:'', L1:null, L2:null, crowd:[null, null], cy:0, ch:0, fontV:0, lamps:null, tickW:0 };
function mkLayer(w, h){
  const cvs = document.createElement('canvas');
  cvs.width = Math.max(1, Math.round(w * DPR)); cvs.height = Math.max(1, Math.round(h * DPR));
  const x = cvs.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [cvs, x];
}
function buildWorld(){
  const key = [VW, VH, DPR, G.court, CAM.preset, CAM.yaw.toFixed(3), CAM.H.toFixed(2), GFX.low ? 1 : 0, WORLD.fontV].join('|');
  if (WORLD.key === key) return;
  WORLD.key = key;
  const th = theme(), W = VW + PAD * 2, H = VH + PADY * 2, keepCx = CAM.cx; CAM.cx = CAM.baseCx;
  const EX = rigExtent(), boardTop = projRig(0, EX.far, .9)[1];
  let [a, c] = mkLayer(W, H); WORLD.L1 = a; c.translate(PAD, PADY);
  const g = c.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.sky[0]); g.addColorStop(.45, th.sky[1]); g.addColorStop(1, th.sky[2]);
  c.fillStyle = g; c.fillRect(-PAD, -PADY, W, H);
  let minY0 = boardTop; for (const p of CROWD) minY0 = Math.min(minY0, p.y - p.s * 2);
  WORLD.lamps = null;
  if (th.night && !GFX.low){
    let sd = 11; const rr2 = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++){ c.globalAlpha = .25 + rr2() * .6; c.fillStyle = '#ffffff'; c.fillRect(rr2() * VW, rr2() * (minY0 - 40), rr2() < .9 ? 1 : 2, rr2() < .9 ? 1 : 2); }
    c.globalAlpha = 1;
    if (G.court !== 'court_neon'){ const mx = VW * .82, my = Math.max(36, minY0 * .35), mg = c.createRadialGradient(mx, my, 0, mx, my, 70); mg.addColorStop(0, 'rgba(255,250,230,.95)'); mg.addColorStop(.18, 'rgba(255,248,220,.9)'); mg.addColorStop(.22, 'rgba(255,240,200,.18)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = mg; c.fillRect(mx - 70, my - 70, 140, 140); }
    // city skyline with lit windows
    const base = minY0 + 26;
    for (let x = -PAD; x < VW + PAD; ){
      const bw = 26 + rr2() * 60, bh = 40 + rr2() * Math.min(150, base * .9);
      c.fillStyle = th.city[0]; c.fillRect(x, base - bh, bw, bh + 40);
      if (rr2() < .25){ c.fillRect(x + bw * .4, base - bh - 14, 3, 14); }
      for (let wy = base - bh + 6; wy < base - 4; wy += 9) for (let wx = x + 4; wx < x + bw - 5; wx += 8){
        if (rr2() < .32){ c.fillStyle = th.city[1 + ((rr2() * (th.city.length - 1)) | 0)]; c.globalAlpha = .35 + rr2() * .5; c.fillRect(wx, wy, 3, 4); c.globalAlpha = 1; }
      }
      x += bw + 2 + rr2() * 6;
    }
    // light towers
    WORLD.lamps = [];
    for (const tx of [VW * .06, VW * .94]){
      const top = Math.max(18, minY0 - 70);
      c.fillStyle = '#0a1222'; c.fillRect(tx - 3, top, 6, boardTop - top);
      c.fillStyle = '#1b2a44'; rr(c, tx - 26, top - 16, 52, 22, 4); c.fill();
      for (let k = 0; k < 6; k++){ const lx = tx - 22 + k * 8.8; const lg = c.createRadialGradient(lx, top - 5, 0, lx, top - 5, 16); lg.addColorStop(0, 'rgba(255,252,235,1)'); lg.addColorStop(.25, `rgba(${th.light},.55)`); lg.addColorStop(1, `rgba(${th.light},0)`); c.fillStyle = lg; c.fillRect(lx - 16, top - 21, 32, 32); }
      WORLD.lamps.push([tx, top - 5]);
    }
  }
  if (th.sun){ const sx = VW * .72, sy = boardTop - 170, sg2 = c.createRadialGradient(sx, sy, 0, sx, sy, 140); sg2.addColorStop(0, 'rgba(255,248,214,1)'); sg2.addColorStop(.25, 'rgba(255,214,140,.9)'); sg2.addColorStop(1, 'rgba(255,170,110,0)'); c.fillStyle = sg2; c.fillRect(sx - 140, sy - 140, 280, 280); }
  if (th.street){
    // Philippine street court: sari-sari store, lamp posts, a basketball hoop and banderitas overhead
    const base = minY0 + 24;
    for (const [sx0, sw0, col] of [[VW * .04, 150, '#5b4636'], [VW * .74, 170, '#4a5568']]){
      c.fillStyle = col; c.fillRect(sx0, base - 96, sw0, 110);
      for (let k = 0; k < 7; k++){ c.fillStyle = k % 2 ? '#e53e3e' : '#f6e05e'; c.fillRect(sx0 - 6 + k * (sw0 + 12) / 7, base - 102, (sw0 + 12) / 7, 14); }
      c.fillStyle = 'rgba(255,214,150,.85)'; c.fillRect(sx0 + 14, base - 72, sw0 - 28, 34);
      c.fillStyle = '#2d3748'; for (let k = 0; k < 5; k++) c.fillRect(sx0 + 20 + k * (sw0 - 40) / 5, base - 68, 10, 26);
      c.fillStyle = '#fff'; c.font = '700 11px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText(sx0 < VW / 2 ? 'SARI-SARI STORE' : 'KARINDERYA', sx0 + sw0 / 2, base - 84);
    }
    for (const lx of [VW * .22, VW * .5, VW * .78]){ c.fillStyle = '#1a202c'; c.fillRect(lx - 2, base - 150, 4, 160); const lg = c.createRadialGradient(lx, base - 150, 0, lx, base - 150, 60); lg.addColorStop(0, 'rgba(255,220,160,.9)'); lg.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = lg; c.fillRect(lx - 60, base - 210, 120, 120); }
    const hx = VW * .5, hy = boardTop - 70;          // basketball hoop behind the far baseline
    c.fillStyle = '#2d3748'; c.fillRect(hx - 3, hy, 6, boardTop - hy + 10);
    c.fillStyle = 'rgba(240,240,240,.92)'; c.fillRect(hx - 30, hy - 30, 60, 38); c.strokeStyle = '#e53e3e'; c.lineWidth = 2; c.strokeRect(hx - 12, hy - 18, 24, 18);
    c.strokeStyle = '#f97316'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(hx, hy + 2, 13, 4, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; for (let k = -2; k <= 2; k++){ c.beginPath(); c.moveTo(hx + k * 5, hy + 3); c.lineTo(hx + k * 3, hy + 16); c.stroke(); }
    // banderitas: strings of little colored flags
    for (let row = 0; row < 3; row++){
      const y0 = 24 + row * 34, sag = 26; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
      c.beginPath(); for (let x2 = -PAD; x2 <= VW + PAD; x2 += 8){ const yy = y0 + Math.sin((x2 / VW) * Math.PI) * sag; x2 === -PAD ? c.moveTo(x2, yy) : c.lineTo(x2, yy); } c.stroke();
      const cols = ['#e53e3e', '#f6e05e', '#3182ce', '#38a169', '#ed64a6', '#ffffff'];
      for (let x2 = -PAD + 6, k = row; x2 < VW + PAD; x2 += 22, k++){ const yy = y0 + Math.sin((x2 / VW) * Math.PI) * sag; c.fillStyle = cols[k % cols.length]; c.beginPath(); c.moveTo(x2 - 7, yy); c.lineTo(x2 + 7, yy); c.lineTo(x2, yy + 14); c.closePath(); c.fill(); }
    }
  }
  if (th.covered){
    // barangay covered court: steel roof trusses and bleachers
    const base = minY0 + 26;
    c.fillStyle = 'rgba(30,34,40,.95)'; c.fillRect(-PAD, 0, VW + PAD * 2, 26);
    c.strokeStyle = 'rgba(160,170,180,.55)'; c.lineWidth = 3;
    for (let x2 = -PAD; x2 < VW + PAD; x2 += 120){ c.beginPath(); c.moveTo(x2, 26); c.lineTo(x2 + 60, 6); c.lineTo(x2 + 120, 26); c.stroke(); c.beginPath(); c.moveTo(x2 + 60, 6); c.lineTo(x2 + 60, 26); c.stroke(); }
    c.fillStyle = 'rgba(30,34,40,.9)'; c.fillRect(-PAD, 26, VW + PAD * 2, 6);
    for (let k = 0; k < 5; k++){ c.fillStyle = k % 2 ? '#6b7280' : '#4b5563'; c.fillRect(-PAD, base - 20 - k * 16, VW + PAD * 2, 12); }
    c.fillStyle = '#fcd116'; c.font = '800 16px "Russo One", Impact, sans-serif'; c.textAlign = 'center'; c.fillText('BARANGAY COVERED COURT', VW / 2, base - 104);
  }
  if (th.trees){ c.fillStyle = '#2f6b2c'; for (let i = 0; i < 14; i++){ const tx = (i / 13) * VW, r = 38 + (i * 37 % 26); c.beginPath(); c.arc(tx, boardTop - 115 + (i % 3) * 8, r, 0, TAU); c.fill(); } }
  const sg = c.createLinearGradient(0, boardTop - 150, 0, boardTop);
  sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, th.stands);
  c.fillStyle = sg; c.fillRect(-PAD, boardTop - 150, W, 150);
  let minY = boardTop;
  for (const p of CROWD) minY = Math.min(minY, p.y - p.s * 4.6);
  WORLD.cy = Math.floor(minY); WORLD.ch = Math.ceil(boardTop + 16 - minY);
  WORLD.crowd = [null, null];
  for (const cheer of [0, 1]){
    if (cheer && GFX.low) break;
    const [cc, cx2] = mkLayer(W, WORLD.ch); paintCrowd(cx2, th, !!cheer, WORLD.cy); WORLD.crowd[cheer] = cc;
  }
  [a, c] = mkLayer(W, H); WORLD.L2 = a; c.translate(PAD, PADY);
  if (!GFX.low) for (let i = 0; i < 6; i++){
    const lx = VW * (i + .5) / 6, ly = boardTop - 160, rg = c.createRadialGradient(lx, ly, 0, lx, ly, 170);
    rg.addColorStop(0, `rgba(${th.light},.14)`); rg.addColorStop(1, `rgba(${th.light},0)`); c.fillStyle = rg; c.fillRect(lx - 170, ly - 170, 340, 340);
  }
  const rigPoly = pts => { c.beginPath(); pts.forEach(([pa, pb, pz], i) => { const q = projRig(pa, pb, pz || 0); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); };
  c.fillStyle = th.surround; rigPoly([[-40, -CAM.R + .7], [40, -CAM.R + .7], [40, EX.far], [-40, EX.far]]);
  c.fillStyle = th.board; rigPoly([[-EX.side - 6, EX.far, 0], [EX.side + 6, EX.far, 0], [EX.side + 6, EX.far, .9], [-EX.side - 6, EX.far, .9]]);
  c.fillStyle = th.court; poly(c, [[-HW, 0], [HW, 0], [HW, L], [-HW, L]]);
  c.fillStyle = th.kitchen; poly(c, [[-HW, NET - KIT], [HW, NET - KIT], [HW, NET + KIT], [-HW, NET + KIT]]);
  const sheen = c.createLinearGradient(0, proj(0, L, 0)[1], 0, proj(0, 0, 0)[1]);
  sheen.addColorStop(0, 'rgba(255,255,255,.07)'); sheen.addColorStop(.5, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(0,0,0,.08)');
  c.fillStyle = sheen; poly(c, [[-HW, 0], [HW, 0], [HW, L], [-HW, L]]);
  if (!GFX.low){
    let sd = 5; const rr3 = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2200; i++){
      const x = -HW - 1.4 + rr3() * (HW * 2 + 2.8), y = -2.6 + rr3() * (L + 5.2), q = proj(x, y, 0), sz = Math.max(.6, .018 * q[2]);
      c.fillStyle = rr3() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.09)'; c.fillRect(q[0], q[1], sz, sz * .55);
    }
    if (th.street){ let sd2 = 9; const r4 = () => (sd2 = (sd2 * 16807) % 2147483647) / 2147483647; c.strokeStyle = 'rgba(20,20,24,.45)'; c.lineWidth = 1.2;
      for (let k = 0; k < 14; k++){ let x = -HW - 1 + r4() * (HW * 2 + 2), y = -2 + r4() * (L + 4); c.beginPath(); let q = proj(x, y, 0); c.moveTo(q[0], q[1]); for (let j = 0; j < 4; j++){ x += (r4() - .5) * .8; y += (r4() - .5) * .8; q = proj(x, y, 0); c.lineTo(q[0], q[1]); } c.stroke(); } }
    c.globalCompositeOperation = 'lighter';
    for (const [lx, ly] of [[-2.3, NET - 3.7], [2.3, NET - 3.7], [-2.3, NET + 3.7], [2.3, NET + 3.7]]){
      const q = proj(lx, ly, 0), rx = 3.6 * q[2], ry = rx * .4, pg = c.createRadialGradient(0, 0, 0, 0, 0, rx);
      pg.addColorStop(0, `rgba(${th.light},.11)`); pg.addColorStop(1, `rgba(${th.light},0)`);
      c.save(); c.translate(q[0], q[1]); c.scale(1, ry / rx); c.fillStyle = pg; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
    }
    c.globalCompositeOperation = 'source-over';
  }
  c.fillStyle = th.line;
  const W5 = th.neon ? .075 : .055;
  gline(c, -HW, 0, HW, 0, W5); gline(c, -HW, L, HW, L, W5);
  gline(c, -HW, 0, -HW, L, W5); gline(c, HW, 0, HW, L, W5);
  gline(c, -HW, NET - KIT, HW, NET - KIT, W5); gline(c, -HW, NET + KIT, HW, NET + KIT, W5);
  gline(c, 0, 0, 0, NET - KIT, W5); gline(c, 0, NET + KIT, 0, L, W5);
  if (Math.abs(CAM.fy) > .9){ c.fillStyle = 'rgba(0,0,0,.2)'; poly(c, [[-HW - .28, NET], [HW + .28, NET], [HW + .7, NET - .8], [-HW + .1, NET - .8]]); }   // net shadow (behind-the-baseline views)
  const vg = c.createRadialGradient(VW / 2, VH * .55, Math.min(VW, VH) * .35, VW / 2, VH * .55, Math.max(VW, VH) * .8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)'); c.fillStyle = vg; c.fillRect(-PAD, -PADY, W, H);
  CAM.cx = keepCx;
}
function drawBeams(c, dx){
  if (GFX.low || !WORLD.lamps) return;
  const th = theme(), len = VH * 1.25;
  c.save(); c.globalCompositeOperation = 'lighter';
  WORLD.lamps.forEach(([lx, ly], i) => {
    const ang = -Math.PI / 2 + (i ? -1 : 1) * (.32 + Math.sin(G.time * .33 + i * 2.1) * .3), w = .085, x0 = lx + dx;
    const g = c.createRadialGradient(x0, ly, 0, x0, ly, len); g.addColorStop(0, `rgba(${th.light},.2)`); g.addColorStop(1, `rgba(${th.light},0)`);
    c.fillStyle = g; c.beginPath(); c.moveTo(x0, ly); c.lineTo(x0 + Math.cos(ang - w) * len, ly + Math.sin(ang - w) * len); c.lineTo(x0 + Math.cos(ang + w) * len, ly + Math.sin(ang + w) * len); c.closePath(); c.fill();
  });
  c.restore();
}
function drawTicker(c, dx){
  const th = theme(), EX = rigExtent(), a = projRig(-EX.side - 6, EX.far, .9), b = projRig(EX.side + 6, EX.far, 0), h = b[1] - a[1];
  if (h < 4) return;
  const gp = G.mode !== 'demo' && gamePoint(), msg = gp ? 'GAME POINT  ✦  ' : 'PICKLE RUSH  ✦  ';
  c.save(); c.beginPath(); c.rect(a[0] + dx, a[1], b[0] - a[0], h); c.clip();
  c.font = `${Math.round(Math.min(h * .62, 26))}px "Russo One", Impact, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
  const tw = c.measureText(msg).width || 100, y = a[1] + h / 2;
  c.fillStyle = gp ? (Math.sin(G.time * 10) > 0 ? '#ff7a3d' : '#ffd0b8') : th.boardText;
  for (let x = a[0] + dx - ((G.time * h * 2.4) % tw); x < b[0] + dx; x += tw) c.fillText(msg, x, y);
  c.restore();
}
function drawCrowdLayer(c, dx){
  const cheer = G.state === 'point' || G.state === 'over', img = (cheer && WORLD.crowd[1]) || WORLD.crowd[0];
  if (!img) return;
  const W = VW + PAD * 2, x0 = dx - PAD, y0 = WORLD.cy, ch = WORLD.ch;
  if (GFX.low){ c.drawImage(img, x0, y0, W, ch); return; }
  const n = cheer ? 18 : 8, amp = cheer ? 5 : 1.2, spd = cheer ? 9 : 1.6, sw = W / n, iw = img.width / n;
  for (let k = 0; k < n; k++){
    const wave = Math.sin(G.time * spd + k * .7), dy = cheer ? -Math.abs(wave) * amp : -(wave + 1) * .5 * amp;
    c.drawImage(img, k * iw, 0, iw + 1, img.height, x0 + k * sw, y0 + dy, sw + .6, ch);
  }
}

