/* ---------- loop ---------- */
let last = performance.now() / 1000, accT = 0, hudTick = 0, pingTick = 0;
const DT = 1 / 120;
let lastRender = 0, lastShop = 0;
let HUD_RECT = null, CB_RECT = null;
addEventListener('resize', () => { HUD_RECT = CB_RECT = null; });
cv.addEventListener('pointerdown', () => { if (G.state === 'replay' && G.netRole !== 'guest') endReplay(); });
const toScreen = q => { const v = G.view; return v ? [(q[0] - v.fx) * v.k + v.fx + v.ox, (q[1] - v.fy) * v.k + v.fy + v.oy, q[2]] : q; };
function hudAutoHide(dt){
  const hud = $('#hud'), cb = $('#callBanner');
  if (hud.classList.contains('hidden') || G.mode === 'demo'){ if (hud.classList.contains('sb-dim')) hud.classList.remove('sb-dim'); return; }
  if (!HUD_RECT || !HUD_RECT.w){ const r = $('.sb').getBoundingClientRect(); HUD_RECT = { l:r.left - 6, t:r.top - 6, r:r.right + 6, b:r.bottom + 4, w:r.width }; }
  const inside = (R, x, y) => R && x > R.l && x < R.r && y > R.t && y < R.b;
  const b = G.ball, nT = nearTeam(), pts = [];
  if (b && (b.live || G.state === 'serve')){ const q = toScreen(proj(b.x, b.y, b.z)); pts.push(q); }
  for (const p of G.players) if (p.team !== nT){ pts.push(toScreen(proj(p.x, p.y, 1.9))); pts.push(toScreen(proj(p.x, p.y, 1.0))); }
  let block = pts.some(q => inside(HUD_RECT, q[0], q[1]));
  // the opponent's serve: clear the view until the ball is on its way
  if (G.state === 'serve' && G.serverP && G.serverP.team !== nT) block = true;
  G.hudDimT = block ? .45 : Math.max(0, (G.hudDimT || 0) - dt);
  const dim = G.hudDimT > 0;
  if (dim !== hud.classList.contains('sb-dim')) hud.classList.toggle('sb-dim', dim);
  if (cb.classList.contains('show')){
    if (!CB_RECT){ const r = cb.getBoundingClientRect(); CB_RECT = { l:r.left - 10, t:r.top - 10, r:r.right + 10, b:r.bottom + 10 }; }
    const cdim = b && b.live && inside(CB_RECT, ...proj(b.x, b.y, b.z));
    if (cdim !== cb.classList.contains('cb-dim')) cb.classList.toggle('cb-dim', !!cdim);
  } else { CB_RECT = null; if (cb.classList.contains('cb-dim')) cb.classList.remove('cb-dim'); }
}
function frame(nowMs){
  requestAnimationFrame(frame);
  const now = nowMs / 1000, raw = Math.max(0, now - last), d = Math.min(.05, raw); last = now;
  // auto graphics: if the device keeps missing frames, lower the resolution, then the detail
  if (raw > 0 && raw < .5){
    GFX.ema += (raw - GFX.ema) * .08;
    GFX.fpsN++; GFX.fpsT += raw;
    if (GFX.fpsT >= .5){ GFX.fps = Math.round(GFX.fpsN / GFX.fpsT); GFX.fpsN = 0; GFX.fpsT = 0; }
    if (!document.hidden){
      if (!GFX.floor || GFX.ema < GFX.floor) GFX.floor = Math.max(.0075, GFX.ema);   // the display's normal frame time, learned in the menus
      if (screenNow === 'game'){
        if (GFX.auto && GFX.ema > .027 && GFX.ema > GFX.floor * 1.5){ GFX.slowT += raw; if (GFX.slowT > 2.5) degradeGfx(); }
        else GFX.slowT = Math.max(0, GFX.slowT - raw);
      }
    }
  }
  pollPads();
  if (G.netRole === 'guest'){ guestInterp(); guestTick(d); }
  else if (G.hitstop > 0){ G.hitstop -= d; tickEffects(0); }
  else if (!G.paused && !(G.netRole === 'host' && netWaiting())){ accT += d * (G.mode === 'watch' ? 1.6 : 1); while (accT >= DT){ update(DT); accT -= DT; } }
  if (G.mode === 'online'){
    const w = G.netRole === 'host' ? netWaiting() : guestWaiting();
    setNetBanner(w);
    // no message for 6 seconds means the connection is dead even if the phone hasn't noticed yet
    if (NW.open && NW.ws && performance.now() - (NW.lastMsg || 0) > 6000){ try { NW.ws.close(); } catch (e) {} }
    if ((NW.saveT = (NW.saveT || 0) + d) > 5){ NW.saveT = 0; saveRejoin(); }
  }
  if (G.netRole === 'host' && now - NW.lastSt >= .014){ NW.lastSt = now; netSend(hostSnapshot()); }
  if ((G.mode === 'online' || NW.room) && (pingTick += d) > 2){ pingTick = 0; netSend({ t:'ping', ts:performance.now() }); }
  const inPlay = screenNow === 'game' || screenNow === 'pause' || screenNow === 'result';
  // menus run at 30 fps; behind the shop, locker and other big panels the background match only needs ~8 fps
  const busyMenu = ['shop', 'char', 'ach', 'tour', 'rank', 'ctrl', 'how', 'player', 'signup'].includes(screenNow);
  if (inPlay || now - lastRender >= (busyMenu ? 1 / 8 : 1 / 30) - .004){
    lastRender = now;
    render();
    if (inPlay) hudAutoHide(Math.min(.1, now - (G.hudLast || now))), G.hudLast = now;
    if (screenNow === 'menu') drawStage($('#pvMenu'), myLook(), now, { pose:STAGE.pose, tag:(myName() || '?').slice(0, 1).toUpperCase() });
    if (screenNow === 'char'){
      if (!STAGE.drag) STAGE.ang += Math.min(.05, d) * .6;
      const dn = STAGE.dance && now - STAGE.dance.start < 3.8 ? { id:STAGE.dance.id, t:now - STAGE.dance.start } : null;
      drawStage($('#pvBig'), editWho === 'p2' ? p2Look() : myLook(), now, { ang:dn ? 0 : STAGE.ang, facing:dn ? 'front' : undefined, dance:dn, pose:STAGE.pose, tag:(myName() || '?').slice(0, 1).toUpperCase() });
    }
    if (screenNow === 'signup' && ACC.user) drawPreview($('#pvSign'), myLook(), 'front', now, '');
    if (screenNow === 'shop' && now - lastShop >= 1 / 20){ lastShop = now; drawShop(now); }
    if (screenNow === 'room') drawLobby(now);
    if (screenNow === 'tour'){ const lc = document.querySelector('#tourBody canvas[data-lando]'); if (lc) drawStage(lc, MATE_LOOK.mate_lando, now, { ring:'#fb923c', tag:'L' }); }
    if (screenNow === 'gate') drawStage($('#pvGate'), myLook(), now, { tag:(myName() || '?').slice(0, 1).toUpperCase() });
    if (screenNow === 'player' && PROF.p) drawStage($('#pvPlayer'), PROF.p.look, now, { tag:PROF.p.username.slice(0, 1).toUpperCase() });
    if (['menu', 'online', 'room', 'player'].includes(screenNow) && (NW.frT = (NW.frT || 0) + d) > 15){ NW.frT = 0; loadFriends(); loadModList(); }
  }
  if ((hudTick += d) > .1){ hudTick = 0; tickBars(); if (screenNow === 'game') updateHUD(); }
  const fb = $('#fpsBox');
  if (data.opts.fps){ fb.classList.remove('hidden'); setTxt('#fpsBox', `${GFX.fps} fps · ${GFX.low ? 'low' : GFX.cap + 'x'}${G.mode === 'online' && NW.ping ? ' · ' + NW.ping + ' ms' : ''}`); }
  else if (!fb.classList.contains('hidden')) fb.classList.add('hidden');
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 150));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { WORLD.fontV = 1; });
applyGfx();
startMatch('demo');
show('s-gate');
// invite links: https://your-site/?room=ABCD joins that room straight away
const inviteCode = new URLSearchParams(location.search).get('room');
if (inviteCode) history.replaceState(null, '', location.pathname);
detectServer().then(() => {
  const rj = loadRejoin();
  if (rj && ACC.server && !inviteCode){ NW.rejoinOnLoad = rj; NW.rid = rj.rid; netConnect(); showToast('Rejoining your match…', `Room ${rj.code}`); return; }
  if (!inviteCode) return;
  if (!ACC.server){ showToast('Online play is unavailable', 'This link needs the Pickle Rush server'); return; }
  NW.autoJoin = inviteCode.toUpperCase().slice(0, 4); netConnect(); show('s-online');
});
window.__pickleRushNet = { drop(){ try { if (NW.ws) NW.ws.close(); } catch (e) {} } };   // used by the automated tests to simulate a lost connection
window.__pickleRush = () => ({ mode:G.mode, role:G.netRole, state:G.state, score:G.score.slice(), screen:screenNow, players:G.players.map(p => [p.name, +p.x.toFixed(2), +p.y.toFixed(2), p.charging]) });
window.__prStarted = true;
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

