/* ---------- actions ---------- */
// phones and tablets without a keyboard can't share one screen, so send them to online rooms
const noKeyboard = () => isTouch && !matchMedia('(any-pointer: fine)').matches;
function needOnline(){
  showToast('This mode needs a keyboard', 'To play with a friend on a phone, use Play online');
  if (ACC.server){ netConnect(); show('s-online'); } else show('s-menu');
}
function act(name, el){
  ensureAudio();
  switch (name){
    case 'menu': show('s-menu'); break;
    case '1p': G.pendingMode = '1p'; show('s-diff'); break;
    case 'duo': show('s-duo'); break;
    case 'duoPick': { const m = el.dataset.m; if (m === 'duo-ai' || m === 'duo-coop'){ G.pendingMode = m; show('s-diff'); } else { if (noKeyboard()){ needOnline(); break; } playGame(m); } break; }
    case 'diff': playGame(G.pendingMode || '1p', el.dataset.key); break;
    case 'diffBack': show(G.pendingMode === '1p' ? 's-menu' : 's-duo'); break;
    case '2p': if (noKeyboard()){ needOnline(); break; } playGame('2p'); break;
    case 'rally': playGame('rally'); break;
    case 'online': netConnect(); show('s-online'); break;
    case 'onMode': NW.mode = el.dataset.v; renderOnline(); break;
    case 'onCreate': NW.err = ''; netSend({ t:'create', mode:NW.mode, name:myName() + '’s room' }); break;
    case 'onJoinCode': goFullscreen(); NW.err = ''; netSend({ t:'join', code:$('#onCode').value }); break;
    case 'onJoin': goFullscreen(); NW.err = ''; netSend({ t:'join', code:el.dataset.code }); break;
    case 'onLeave': clearRejoin(); netSend({ t:'leave' }); NW.room = null; show('s-online'); break;
    case 'onStart': goFullscreen(); setTxt('#rmErr', ''); netSend(NW.room && NW.room.tourMode ? { t:'start', tour:NW.room.tourMode } : { t:'start' }); break;
    case 'onForce': goFullscreen(); setTxt('#rmErr', ''); netSend({ t:'start', force:true }); break;
    case 'onReady': { const me = NW.room && NW.room.slots[NW.you]; netSend({ t:'ready', v:!(me && me.ready) }); break; }
    case 'onQuick': goFullscreen(); NW.err = ''; netSend({ t:'quick', mode:el.dataset.v }); break;
    case 'onInvite': {
      if (!NW.room) break;
      const url = location.origin + location.pathname + '?room=' + NW.room.code;
      if (navigator.share && isTouch) navigator.share({ title:'Pickle Rush', text:'Join my Pickle Rush match!', url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast('Invite link copied', 'Paste it in Messenger or Discord')).catch(() => prompt('Copy this link:', url));
      else prompt('Copy this link:', url);
      break;
    }
    case 'onSlot': netSend({ t:'slot', i:+el.dataset.i }); break;
    case 'char': charFrom = screenNow === 'signup' ? 'signup' : 'menu'; editWho = 'p1'; show('s-char'); break;
    case 'guest': ensureLocal(); show('s-menu'); break;
    case 'gatePlay': gateTab = 'play'; renderGate(); break;
    case 'gateLogin': gateTab = 'login'; $('#suErr').textContent = ''; if (screenNow !== 'gate') show('s-gate'); else renderGate(); setTimeout(() => $('#suName').focus(), 50); break;
    case 'gateSignup': gateTab = 'signup'; $('#suErr').textContent = ''; if (screenNow !== 'gate') show('s-gate'); else renderGate(); setTimeout(() => $('#suName').focus(), 50); break;
    case 'gateRecover': gateTab = 'recover'; $('#rcErr').textContent = ''; $('#rcName').value = $('#suName').value; renderGate(); break;
    case 'eye': { const inp = $('#' + el.dataset.for); inp.type = inp.type === 'password' ? 'text' : 'password'; el.classList.toggle('on', inp.type === 'text'); break; }
    case 'rcGo': rcGo(); break;
    case 'recCopy': { const code = $('#recCode').textContent; try { navigator.clipboard.writeText(code); showToast('Copied', 'Keep it somewhere safe'); } catch (e) { showToast('Copy it by hand', code); } break; }
    case 'recDone': $('#recOv').classList.add('hidden'); if (screenNow === 'gate') show('s-menu'); break;
    case 'recNew': api('api/recovery/new', {}).then(j => showRecovery(j.recovery)).catch(e => showToast('Couldn’t make a code', e.message)); break;
    case 'ppReport': if (PROF.p) askConfirm(`Report ${PROF.p.username}?`, 'Report an offensive name or bad behavior. After several reports the player is hidden until the owner reviews it.', 'Report', () => api('api/report', { username:PROF.p.username, reason:'Offensive name or behavior' }).then(() => showToast('Report sent', 'Thanks for keeping the game friendly')).catch(e => showToast('Couldn’t send report', e.message))); break;
    case 'modAct': if (PROF.p) api('api/mod/action', { username:PROF.p.username, action:el.dataset.v }).then(() => { showToast('Done', `${el.dataset.v} · ${PROF.p.username}`); openPlayer(PROF.p.username); }).catch(e => showToast('Couldn’t do that', e.message)); break;
    case 'shop': if (screenNow !== 'shop') shopFrom = screenNow; show('s-shop'); break;
    case 'shopPartners': shopFrom = 'diff'; shopTab = 'partner'; show('s-shop'); break;
    case 'shopBack': show('s-' + (['char', 'diff'].includes(shopFrom) ? shopFrom : 'menu')); break;
    case 'shopTab': shopTab = el.dataset.v; $('#shopErr').textContent = ''; renderShop(); break;
    case 'shopSub': shopSub = el.dataset.v; renderShop(); break;
    case 'shopBuy': {
      const it = IT(el.dataset.id); $('#shopErr').textContent = ''; el.disabled = true;
      progBuy(it.id).then(() => progEquip(it.slot, it.id)).then(() => { playSfx('win'); showToast('Unlocked!', `${it.name} is equipped`); renderShop(); refreshMenu(); })
        .catch(e => { $('#shopErr').textContent = e.message; renderShop(); });
      break;
    }
    case 'shopEquip': progEquip(el.dataset.slot, el.dataset.id).then(renderShop).catch(e => { $('#shopErr').textContent = e.message; }); break;
    case 'equip':
      if (editWho === 'p2'){ data.p2.equip[el.dataset.slot] = el.dataset.id; save(); STAGE.pose = performance.now() / 1000; renderChar(); }
      else progEquip(el.dataset.slot, el.dataset.id).then(renderChar).catch(e => showToast('Can’t equip', e.message));
      break;
    case 'pickMate': progEquip('partner', el.dataset.id).then(renderDiff).catch(() => {}); break;
    case 'lockedAi': showToast('Locked', 'Beat the opponent above to unlock this one'); break;
    case 'hairStyle': data[editWho].hairStyle = el.dataset.v; save(); renderChar(); if (editWho === 'p1') syncLook(); break;
    case 'bodyType': data[editWho].body = el.dataset.v; save(); renderChar(); if (editWho === 'p1') syncLook(); break;
    case 'charDone': saveName(); syncLook(); netHello(); show('s-' + charFrom); break;
    case 'tab': saveName(); editWho = el.dataset.who; renderChar(); break;
    case 'turn': STAGE.ang += Math.PI; break;
    case 'gender': { const b0 = data[editWho]; b0.gender = el.dataset.v; if (!CAT.HAIR_STYLES[b0.gender].includes(b0.hairStyle)) b0.hairStyle = CAT.HAIR_STYLES[b0.gender][0]; save(); renderChar(); break; }
    case 'skin': data[editWho].skin = +el.dataset.i; save(); renderChar(); break;
    case 'hair': data[editWho].hair = +el.dataset.i; save(); renderChar(); break;
    case 'ctrl': ctrlFrom = 'menu'; show('s-ctrl'); break;
    case 'pauseSettings': ctrlFrom = 'pause'; show('s-ctrl'); break;
    case 'ctrlBack': REB = null; show(ctrlFrom === 'pause' ? 's-pause' : 's-menu'); break;
    case 'ctrlTab': REB = null; ctrlSet = el.dataset.v; renderCtrl(); break;
    case 'bind': REB = { set:ctrlSet, act:el.dataset.a }; renderCtrl(); break;
    case 'dancePreview': previewDance(el.dataset.id); break;
    case 'chTab': chTab = el.dataset.v; renderChallenges(getAcc()); break;
    case 'tour': show('s-tour'); break;
    case 'tourStart': tourStart(el.dataset.cup); break;
    case 'tourPlay': tourPlay(); break;
    case 'tourForfeit': askConfirm('Forfeit this tournament?', 'You’ll be out of the tournament and keep the coins you already won.', 'Forfeit', () => tourQuit().then(renderTour), 'Stay in'); break;
    case 'tourOnline': if (!ACC.server){ showToast('Online needs the server', ''); break; } NW.mode = '2v2'; NW.pendingTour = el.dataset.cup; show('s-online'); netConnect(); { let tries = 0; const go = () => { if (NW.open) netSend({ t:'create', mode:'2v2', name:myName() + '’s tournament' }); else if (tries++ < 30) setTimeout(go, 300); }; go(); } break;
    case 'champClose': $('#champOv').classList.add('hidden'); break;
    case 'tutStart': tutStart(); break;
    case 'tutSkip': G.tutorial = null; renderTut(); show('s-menu'); break;
    case 'rankTab': rankTab = el.dataset.v; renderRank(); break;
    case 'frChallenge': challengeFriend(el.dataset.name); break;
    case 'ppChallenge': if (PROF.p) challengeFriend(PROF.p.username); break;
    case 'cpGo': { const cur = $('#cpCur').value, nw = $('#cpNew').value; $('#cpMsg').style.color = 'var(--bad)';
      if (nw.length < 4){ setTxt('#cpMsg', 'The new password needs at least 4 characters.'); break; }
      api('api/password', { current:cur, password:nw }).then(() => { $('#cpMsg').style.color = 'var(--good)'; setTxt('#cpMsg', 'Password changed. Other devices were logged out.'); $('#cpCur').value = $('#cpNew').value = ''; }).catch(e => setTxt('#cpMsg', e.message)); break; }
    case 'delGo': { const pw = $('#delPw').value; if (!pw){ setTxt('#delMsg', 'Enter your password first.'); break; }
      askConfirm('Delete your account?', 'Your account, progress, items and friends will be deleted forever. This can’t be undone.', 'Delete forever', () => api('api/account/delete', { password:pw }).then(() => {
        data.token = null; ACC.user = null; FR.list = []; FR.keys = new Set(); FR.incoming = []; FR.outgoing = new Set(); resetNotifs(); save(); netHello(); show('s-gate'); showToast('Account deleted', 'Thanks for playing Pickle Rush');
      }).catch(e => setTxt('#delMsg', e.message)), 'Cancel'); break; }
    case 'emoteBar': { const bar = $('#emoteBar'); if (!bar.children.length) bar.innerHTML = EMOTES.map((e2, i) => `<button data-act="emote" data-e="${i}" class="tile rounded-xl font-bold" style="width:42px; height:42px; font-size:${e2 === 'GG' ? 15 : 22}px">${e2}</button>`).join(''); bar.classList.toggle('hidden'); break; }
    case 'emote': sendEmote(+el.dataset.e); break;
    case 'ach': show('s-ach'); break;
    case 'cfNo': $('#confirmOv').classList.add('hidden'); CONFIRM.cb = null; break;
    case 'cfYes': { $('#confirmOv').classList.add('hidden'); const cb = CONFIRM.cb; CONFIRM.cb = null; if (cb) cb(); break; }
    case 'chestOpen': openChestUI(el.dataset.id, !!el.dataset.key); break;
    case 'chestAgain': if (!CH.busy){ const a = getAcc() || ensureLocal(); const useKey = CH.key && (a.keys | 0) > 0; openChestUI(CH.chest, useKey); } break;
    case 'chestClose': if (!CH.busy){ $('#chestOv').classList.add('hidden'); renderShop(); } break;
    case 'chestEquip': if (CH.last && !CH.busy){ const it = IT(CH.last.id); progEquip(it.slot, it.id).then(() => { $('#chestOv').classList.add('hidden'); renderShop(); }); } break;
    case 'viewPlayer': openPlayer(el.dataset.name); break;
    case 'playerBack': show('s-' + (PROF.from && PROF.from !== 'player' ? PROF.from : 'menu')); break;
    case 'ppFriend': if (PROF.p){ const act2 = { friend:'remove', asked:'accept', sent:'cancel', none:'add' }[el.dataset.state || 'none']; friendChange(PROF.p.username, act2).then(renderPlayer); } break;
    case 'frAccept': friendChange(el.dataset.name, 'accept'); break;
    case 'frDecline': friendChange(el.dataset.name, 'decline'); break;
    case 'bell': NOTIF.open = !NOTIF.open; $('#notifPanel').classList.toggle('hidden', !NOTIF.open); if (NOTIF.open){ loadFriends(true); renderNotifs(); loadModList(); setTimeout(() => { for (const x of NOTIF.mod || []) NOTIF.seen[x.username] = x.reports; renderNotifs(); }, 1600); setTimeout(() => { NOTIF.items.forEach(n => n.read = true); renderNotifs(); }, 1500); } break;
    case 'notifDrop': NOTIF.items.splice(+el.dataset.i, 1); renderNotifs(); break;
    case 'notifJoin': { const n = NOTIF.items[+el.dataset.i]; NOTIF.items.splice(+el.dataset.i, 1); renderNotifs(); if (n && !['game', 'pause'].includes(screenNow)){ NW.err = ''; netSend({ t:'join', code:n.code }); NOTIF.open = false; $('#notifPanel').classList.add('hidden'); } break; }
    case 'ppInvite': if (PROF.p) netSend({ t:'invite', to:PROF.p.username }); break;
    case 'frInvite': netSend({ t:'invite', to:el.dataset.name }); break;
    case 'frAdd': { const n = $('#frName').value.trim(); if (n.length >= 3) friendChange(n, 'add').then(ok => { if (ok) $('#frName').value = ''; }); break; }
    case 'inviteClose': $('#inviteCard').classList.add('hidden'); break;
    case 'inviteJoin': {
      $('#inviteCard').classList.add('hidden');
      if (screenNow === 'game' || screenNow === 'pause'){ showToast('Finish your match first', 'Then join from Online'); break; }
      if (NW.invite){ NW.err = ''; netSend({ t:'join', code:NW.invite.code }); }
      break;
    }
    case 'music': data.opts.music = !musicOn(); save(); if (musicOn()) updateMusic(); else stopTrack(); refreshMusicBtns(); break;
    case 'camCycle': {
      const i = CAM_ORDER.indexOf(data.opts.camera || 'classic'), k = CAM_ORDER[(i + 1) % CAM_ORDER.length];
      data.opts.camera = k; save(); fitCamera(); showToast(`Camera: ${CAMS[k].name}`, CAMS[k].hint);
      break;
    }
    case 'opt': data.opts[el.dataset.k] = el.dataset.v; save(); if (el.dataset.k === 'gfx') applyGfx(); if (el.dataset.k === 'camera') fitCamera(); renderCtrl(); updateHUD(); break;
    case 'optToggle': { const k = el.dataset.k, cur = data.opts[k] === undefined ? ['fullscreen', 'pointDance', 'shake', 'music', 'replays'].includes(k) : !!data.opts[k]; data.opts[k] = !cur; save(); renderCtrl(); break; }
    case 'resetBinds': data.binds[ctrlSet] = clone(DEF_BINDS[ctrlSet]); save(); renderCtrl(); break;
    case 'rank': show('s-rank'); break;
    case 'how': show('s-how'); break;
    case 'sound': data.sound = !data.sound; save(); refreshMenu(); if (screenNow === 'ctrl') renderCtrl(); break;
    case 'signup': if (isServerAcc()) show('s-signup'); else { gateTab = 'signup'; $('#suErr').textContent = ''; show('s-gate'); } break;
    case 'suTab': suMode = el.dataset.v; $('#suErr').textContent = ''; renderSignup(); break;
    case 'suGo': suGo(); break;
    case 'logout': api('api/logout', {}).catch(() => {}); data.token = null; ACC.user = null; FR.list = []; FR.keys = new Set(); FR.incoming = []; FR.outgoing = new Set(); resetNotifs(); FR.t = 0; dailyTried = false; save(); netHello(); show('s-gate'); break;
    case 'pause': togglePause(true); break;
    case 'resume': togglePause(false); break;
    case 'restart': case 'rematch':
      if (G.mode === 'tour'){ show('s-tour'); break; }
      if (G.mode === 'online'){ if (G.netRole === 'host'){ const tr = NW.room && NW.room.tour; netSend(tr && tr.alive ? { t:'start', tour:tr.cup, force:true } : { t:'start' }); } }
      else playGame(G.mode, G.diff);
      break;
    case 'quit': {
      const midMatch = screenNow !== 'result' && G.state !== 'over';
      if (G.mode === 'online'){
        if (screenNow === 'result' && G.netRole === 'host'){ netSend({ t:'lobby' }); break; }
        const leave = () => { NW.leaving = false; clearRejoin(); netSend({ t:'leave' }); leaveOnline(); };
        if (midMatch && isServerAcc()) askConfirm('Leave this match?', 'Leaving an online match before it ends counts as a loss (−15 rating).', 'Leave', leave); else leave();
      } else if (midMatch && G.mode === 'tour'){
        askConfirm('Leave this tournament match?', 'Leaving now knocks your team out of the tournament.', 'Leave', () => { tourQuit(); show('s-tour'); });
      } else if (midMatch && RANKED(G.mode) && CAT.isPractice((getAcc() || {}).mmr || 0, G.diff)){
        quitRanked(); show('s-menu');                                  // practice: leave freely
      } else if (midMatch && RANKED(G.mode)){
        askConfirm('Quit this ranked match?', 'Quitting counts as a loss, plus a small extra rating penalty.', 'Quit', () => { quitRanked(); show('s-menu'); });
      } else show('s-menu');
      break;
    }
  }
}
document.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a) act(a.dataset.act, a); });
$('#suPass').addEventListener('keydown', e => { if (e.key === 'Enter') suGo(); });
$('#suName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#suPass').focus(); });
$('#rcPass').addEventListener('keydown', e => { if (e.key === 'Enter') rcGo(); });
$('#suPass').addEventListener('input', () => {
  const sc = pwScore($('#suPass').value), lbl = ['Too easy', 'Weak', 'Okay', 'Good', 'Strong', 'Very strong'][sc], col = ['#f87171', '#f87171', '#fbbf24', '#a3e635', '#4ade80', '#22c55e'][sc];
  $('#pwMeter').style.setProperty('--w', ((sc + 1) / 6 * 100) + '%'); $('#pwMeter').style.setProperty('--c', col); $('#pwMeter span').textContent = $('#suPass').value ? lbl : ''; $('#pwMeter span').style.color = col;
});
$('#onCode').addEventListener('keydown', e => { if (e.key === 'Enter') act('onJoinCode'); });

/* ---------- keyboard ---------- */
const SHOT_ACTS = ['hit', 'slice', 'curve', 'dink', 'spike'];
addEventListener('keydown', e => {
  const c = e.code;
  if (REB){ e.preventDefault(); if (c !== 'Escape') assignBind(c); REB = null; renderCtrl(); return; }
  if (e.target && e.target.tagName === 'INPUT') return;
  if (screenNow === 'game' && (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(c) || Object.values(data.binds).some(s => Object.values(s).includes(c)))) e.preventDefault();
  K[c] = true;
  if (e.repeat) return;
  ensureAudio();
  if (c === 'Escape'){ if (screenNow === 'game') togglePause(true); else if (screenNow === 'pause') togglePause(false); else if (screenNow === 'ctrl') act('ctrlBack'); return; }
  if (screenNow !== 'game' || G.paused || G.state === 'over' || G.mode === 'demo') return;
  if (G.state === 'replay' && G.netRole !== 'guest' && ['Space', 'Enter', 'NumpadEnter'].includes(c)){ endReplay(); return; }
  if (G.mode === 'online' && /^Digit[1-8]$/.test(c)){ sendEmote(+c.slice(5) - 1); return; }
  if (c === 'KeyC' && !localHumans().some(p => Object.values(bindSets(p)).some(set => Object.values(set).includes('KeyC')))){ act('camCycle'); return; }
  for (const p of localHumans()) for (const a of SHOT_ACTS) if (isBind(p, a, c)) control(p, a, true);
});
addEventListener('keyup', e => {
  K[e.code] = false;
  if (screenNow !== 'game') return;
  for (const p of localHumans()) if (isBind(p, 'hit', e.code)) control(p, 'hit', false);
});
addEventListener('blur', () => { for (const k in K) K[k] = false; for (const p of localHumans()) if (p.charging) control(p, 'hit', false); });
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
addEventListener('touchstart', () => { if (!isTouch){ isTouch = true; resize(); updateHUD(); } }, { passive:true, once:true });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (['game', 'pause'].includes(screenNow)) e.preventDefault(); }, { passive:false });
function goFullscreen(){
  if (!isTouch || data.opts.fullscreen === false || document.fullscreenElement) return;
  const el = document.documentElement, fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if (fn) try { const r = fn.call(el, { navigationUI:'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
document.addEventListener('fullscreenchange', () => setTimeout(resize, 120));
document.addEventListener('dblclick', e => e.preventDefault());

/* ---------- touch ---------- */
const joy = $('#joy'), knob = $('#knob'), zone = $('#joyZone');
const JOY = { cx:0, cy:0, r:60 };
function moveJoy(e){
  let dx = (e.clientX - JOY.cx) / JOY.r, dy = (e.clientY - JOY.cy) / JOY.r;
  const m = Math.hypot(dx, dy); if (m > 1){ dx /= m; dy /= m; }
  touch.x = dx; touch.y = -dy;
  knob.style.transform = `translate(calc(-50% + ${dx * JOY.r * .62}px), calc(-50% + ${dy * JOY.r * .62}px))`;
}
zone.addEventListener('pointerdown', e => {
  e.preventDefault(); ensureAudio();
  const size = joy.offsetWidth || 120; JOY.r = size / 2;
  // the stick appears where the thumb lands
  JOY.cx = clamp(e.clientX, JOY.r + 6, VW * .5 - JOY.r); JOY.cy = clamp(e.clientY, JOY.r + 70, VH - JOY.r - 6);
  joy.style.left = (JOY.cx - JOY.r) + 'px'; joy.style.top = (JOY.cy - JOY.r) + 'px'; joy.style.bottom = 'auto'; joy.classList.add('live');
  touch.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (_) {} touch.active = true; moveJoy(e);
});
zone.addEventListener('pointermove', e => { if (e.pointerId === touch.id) moveJoy(e); });
const endJoy = e => {
  if (e.pointerId !== touch.id) return;
  touch.active = false; touch.x = touch.y = 0; touch.id = null;
  knob.style.transform = 'translate(-50%,-50%)'; joy.classList.remove('live'); joy.style.left = joy.style.top = joy.style.bottom = '';
};
zone.addEventListener('pointerup', endJoy); zone.addEventListener('pointercancel', endJoy);
let hitPtr = null;
$$('.tbtn').forEach(b => {
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); ensureAudio();
    if (G.paused || G.mode === 'demo' || screenNow !== 'game') return;
    const t = b.dataset.t, me = meP();
    if (!me) return;
    if (t === 'serve'){ control(me, 'hit', true); control(me, 'hit', false); return; }
    if (t === 'hit'){ hitPtr = e.pointerId; try { b.setPointerCapture(e.pointerId); } catch (_) {} control(me, 'hit', true); return; }
    control(me, t, true);
  });
  const up = e => { if (b.dataset.t === 'hit' && hitPtr !== null && e.pointerId === hitPtr){ hitPtr = null; control(meP(), 'hit', false); } };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
});

