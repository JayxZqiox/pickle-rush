/* ---------- HUD ---------- */
const MULTI_LOCAL = m => ['2p', '2v2', 'duo-coop', 'duo-vs'].includes(m);
const touchOn = () => isTouch && screenNow === 'game' && G.mode !== 'demo' && !MULTI_LOCAL(G.mode);
const meP = () => G.players.find(p => p.human && !p.human.remote && p.human.set === 'p1');
function keyName(c){
  if (!c) return '—';
  const m = { Space:'Space', Enter:'Enter', NumpadEnter:'Num Enter', ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→', ShiftLeft:'L Shift', ShiftRight:'R Shift',
    ControlLeft:'L Ctrl', ControlRight:'R Ctrl', AltLeft:'L Alt', AltRight:'R Alt', Backspace:'Backspace', Tab:'Tab', Semicolon:';', Quote:'’', Comma:',', Period:'.',
    Slash:'/', BracketLeft:'[', BracketRight:']', Backslash:'\\', Minus:'-', Equal:'=', Backquote:'`', NumpadDecimal:'Num .', NumpadAdd:'Num +', NumpadSubtract:'Num −', NumpadMultiply:'Num ×', NumpadDivide:'Num ÷', CapsLock:'Caps' };
  if (m[c]) return m[c];
  if (c.startsWith('Key')) return c.slice(3);
  if (c.startsWith('Digit')) return c.slice(5);
  if (c.startsWith('Numpad')) return 'Num ' + c.slice(6);
  return c;
}
let lastScore = [0, 0], lastRally = 0;
function fmtTime(t){ t = Math.max(0, Math.floor(t)); const m = Math.floor(t / 60), sec = t % 60; return `${m}:${String(sec).padStart(2, '0')}`; }
function gamePoint(){
  if (G.mode === 'rally' || G.over || !['serve', 'play'].includes(G.state)) return false;
  const a = G.score[G.server - 1] + 1, b = G.score[other(G.server) - 1];   // only the serving side can score
  return a >= 11 && a - b >= 2;
}
function sbNames(t){
  return team(t).map(p => {
    const on = G.serverP === p && G.mode !== 'rally';
    const col = p.human ? p.human.color : 'var(--hud-muted)';
    return `<div class="sbName ${on ? 'on' : ''}"><span class="sbBall"></span><b style="color:${p.human ? 'var(--hud-text)' : 'var(--hud-muted)'}"><span style="color:${col}">•</span> ${flagHTML(p.look && p.look.nation, 10)} ${esc(p.name)}</b>${G.doubles ? `<span class="sbNum">S${G.serveNum}</span>` : ''}</div>`;
  }).join('');
}
const setTxt = (sel, v) => { const el = $(sel); if (el._v !== v){ el._v = v; el.textContent = v; } };
function updateHUD(){
  const inGame = ['game', 'pause', 'result'].includes(screenNow) && G.mode !== 'demo';
  $('#hud').classList.toggle('hidden', !inGame);
  $('#netBadge').classList.toggle('hidden', G.mode !== 'online');
  const tOn = touchOn();
  $('#touch').classList.toggle('hidden', !tOn); $('#touch').classList.toggle('big', data.opts.touch === 'big');
  if (document.body.classList.contains('touchui') !== tOn){ document.body.classList.toggle('touchui', tOn); if (tOn) requestAnimationFrame(() => { const h = $('#hitBtn').offsetHeight; if (h) document.body.style.setProperty('--hitpx', h + 'px'); }); }
  const me = meP();
  if ($('#tutBox').classList.contains('hidden') === !!(G.tutorial && screenNow === 'game')) renderTut();
  $('#emoteBtn').classList.toggle('hidden', G.mode !== 'online'); if (G.mode !== 'online') $('#emoteBar').classList.add('hidden');
  const serveNow = tOn && G.state === 'serve' && me && G.serverP === me && !G.serveDrop;
  const hb = $('#hitBtn'); if (hb.classList.contains('serve') !== !!serveNow){ hb.classList.toggle('serve', !!serveNow); hb.textContent = serveNow ? 'Serve' : 'Hit'; }
  if (!inGame || !G.players.length){ $('#hint').classList.add('hidden'); return; }
  const rally = G.mode === 'rally';
  const n1 = sbNames(1), n2 = sbNames(2), e1 = $('#sbN1'), e2 = $('#sbN2');
  if (e1._v !== n1){ e1._v = n1; e1.innerHTML = n1; } if (e2._v !== n2){ e2._v = n2; e2.innerHTML = n2; }
  $('#sbT1').classList.toggle('serving', !rally && G.server === 1); $('#sbT2').classList.toggle('serving', !rally && G.server === 2);
  if (G.score[0] !== lastScore[0]) popEl($('#h1Score'));
  if (G.score[1] !== lastScore[1]) popEl($('#h2Score'));
  lastScore = G.score.slice();
  setTxt('#h1Score', String(rally ? G.rally : G.score[0]));
  setTxt('#h2Score', rally ? '·' : String(G.score[1]));
  if (rally && G.rally !== lastRally && G.rally > 0) popEl($('#h1Score'));
  lastRally = G.rally;
  setTxt('#sbCall', rally ? `Best ${((getAcc() || {}).bestRally) || 0}` : scoreCall());
  const gp = gamePoint();
  $('#sbTag').classList.toggle('hidden', !gp && !rally);
  setTxt('#sbTag', rally ? 'RALLY' : 'GAME POINT');
  const prim = t => { const tm = team(t); return tm.find(p => p.human && !p.human.remote) || tm.find(p => p.human) || tm[0]; };
  const sk = p => !p ? '' : p.ai ? (p.ai.d.coach ? 'Practice partner' : LADDER.includes(p.ai.d.key) ? `AI · ${p.ai.d.mmr} MMR` : 'AI teammate') : `Next shot: ${LABEL[p.armed]}`;
  setTxt('#h1Skill', sk(prim(1))); setTxt('#h2Skill', sk(prim(2)));
  const myServe = tOn && G.state === 'serve' && me && G.serverP === me;
  const SERVE_BTN = { slice:'Volley', curve:'Curve', dink:'Drop', spike:'' };
  $$('#touch .tbtn.skill').forEach(b => {
    if (!b.dataset.label) b.dataset.label = b.textContent;
    const t = b.dataset.t, lbl = myServe ? SERVE_BTN[t] : b.dataset.label;
    if (b.textContent !== lbl) b.textContent = lbl;
    b.style.visibility = lbl ? '' : 'hidden';
    b.classList.toggle('on', !!me && (myServe ? SERVE_KEY[t] === me.serveType && t !== 'spike' : me.armed === t));
  });
  const s = G.serverP;
  const showHint = G.state === 'serve' && s && s.human && !s.human.remote && screenNow === 'game';
  $('#hint').classList.toggle('hidden', !showHint);
  if (showHint){
    const bs = data.binds[s.human.set], st = SERVE_NAME[s.serveType || 'volley'];
    setTxt('#hint', tOn ? `${st} · tap Serve, hold for power` : `${st} · ${keyName(bs.slice)} volley · ${keyName(bs.curve)} curve · ${keyName(bs.dink)} drop · hold ${keyName(bs.hit)} and release to serve`);
  }
}
function popEl(el){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function tickBars(){
  if (!G.players.length) return;
  const prim = t => { const tm = team(t); return tm.find(p => p.human && !p.human.remote) || tm.find(p => p.human) || tm[0]; };
  const a = prim(1), b = prim(2);
  const w1 = (a ? a.energy : 0) + '%', w2 = (b ? b.energy : 0) + '%', b1 = $('#h1Bar'), b2 = $('#h2Bar');
  if (b1._v !== w1){ b1._v = w1; b1.style.width = w1; } if (b2._v !== w2){ b2._v = w2; b2.style.width = w2; }
  setTxt('#sbClock', fmtTime(G.matchT || 0));
}
let toastT = 0;
function showToast(t, s){
  $('#tTitle').textContent = t; $('#tSub').textContent = s || '';
  const el = $('#toast'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1300);
}
function toast(t, s){ emit({ k:'toast', a:t, b:s || '' }); showToast(t, s); }

/* ---------- screens ---------- */
let screenNow = 'menu', ctrlFrom = 'menu', charFrom = 'menu';
const MENU_SCREENS = ['menu', 'diff', 'char', 'rank', 'how', 'signup', 'online', 'room', 'duo', 'gate', 'shop', 'player', 'ach', 'tour'];
function show(id){
  $$('.screen').forEach(s => s.classList.toggle('off', s.id !== id));
  screenNow = id ? id.replace('s-', '') : 'game';
  const wantsDemo = MENU_SCREENS.includes(screenNow) || (screenNow === 'ctrl' && ctrlFrom === 'menu');
  if (wantsDemo && G.mode !== 'demo'){ G.netRole = null; startMatch('demo'); }
  invalidateRects(); HUD_RECT = null;
  if (screenNow === 'ach') renderAch();
  if (screenNow === 'tour') renderTour();
  ({ gate:renderGate, shop:renderShop, menu:refreshMenu, diff:renderDiff, char:renderChar, rank:renderRank, signup:renderSignup, online:renderOnline, room:renderRoom, ctrl:renderCtrl, pause:renderPause }[screenNow] || (() => {}))();
  if (screenNow === 'rank' && Date.now() - ACC.boardT > 5000) loadBoard();
  if (['menu', 'online', 'room'].includes(screenNow)){ renderFriendBits(); loadFriends(); }
  $('#bellBtn').classList.toggle('hidden', !MENU_SCREENS.includes(screenNow)); NOTIF.open = false; $('#notifPanel').classList.add('hidden');
  // signed-in players stay connected in the menus, so friends see them online and invites arrive anywhere
  if (ACC.server && ACC.user && MENU_SCREENS.includes(screenNow)) netConnect();
  if (screenNow === 'menu') claimDailyOnce();
  updateHUD(); refreshMusicBtns();
  if (screenNow !== 'result') updateMusic();
}
// browsers only allow sound after the first tap or key press
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { ensureAudio(); updateMusic(); }, { once:true, capture:true }));
let rotTimer = 0;
function playGame(mode, diff){
  ensureAudio(); goFullscreen(); startMatch(mode, diff); show(null);
  if (RANKED(mode)) startRanked(mode, diff);
  if (isTouch && VH > VW){ $('#rotTip').classList.remove('hidden'); clearTimeout(rotTimer); rotTimer = setTimeout(() => $('#rotTip').classList.add('hidden'), 4000); }
}
function refreshMenu(){
  if (!getAcc()) ensureLocal();
  const a = getAcc(), lv = CAT.levelInfo(a.xp);
  $('#mName').textContent = myName();
  $('#mLevel').textContent = lv.level;
  $('#mRing').style.strokeDashoffset = String(263.9 * (1 - lv.into / lv.need));
  const n = a.wins + a.losses;
  setTxt('#mKeys', String(a.keys | 0));
  renderChallenges(a); noteSeason(a);
  if (!a.tutorialDone && !(a.wins + a.losses) && !data.tutAsked){ data.tutAsked = true; save(); setTimeout(() => { if (screenNow === 'menu') askConfirm('New to Pickle Rush? 👋', 'Take the 1-minute tutorial: move, serve, return, dink and smash. You’ll earn 200 coins and a chest key.', 'Start tutorial', tutStart, 'Maybe later', 'go'); }, 700); }
  const si = seasonInfo(); setTxt('#heroSeason', `SEASON ${si.id} · ${si.days} DAY${si.days === 1 ? '' : 'S'} LEFT`);
  const dp = CAT.dupr(a.mmr);
  setTxt('#mDupr', dp.toFixed(3)); setTxt('#mDuprTier', CAT.duprTier(dp)); $('#mDuprBar').style.width = ((dp - 2) / 6 * 100).toFixed(1) + '%';
  setTxt('#mWins', String(a.wins)); setTxt('#mRate', n ? Math.round(a.wins / n * 100) + '%' : '—'); setTxt('#mPeak', String(a.peak || a.mmr));
  const hist = (a.history || []).slice(0, 3);
  $('#mRecent').innerHTML = hist.length ? hist.map(h => `<div class="mini"><span class="wl" style="background:${h.win ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)'}; color:${h.win ? 'var(--good)' : 'var(--bad)'}">${h.win ? 'W' : 'L'}</span><span class="flex-1 min-w-0 truncate">${esc(h.opp)}</span><span class="tabular-nums text-[var(--muted)]">${esc(h.score)}</span><b class="tabular-nums" style="color:${h.delta > 0 ? 'var(--good)' : 'var(--bad)'}">${h.delta > 0 ? '+' : '−'}${Math.abs(h.delta)}</b></div>`).join('')
    : '<div class="mini text-[var(--muted)]">Win a ranked match to start your history.</div>';
  const top = ACC.server ? ACC.board.slice(0, 3) : [];
  $('#mTop').innerHTML = top.length ? top.map((r, i) => `<div class="mini" data-act="viewPlayer" data-name="${esc(r.username)}" style="cursor:pointer"><span class="wl" style="background:${['#f5c542', '#cfd6e0', '#d9925b'][i]}; color:#1b1b1b">${i + 1}</span><span class="flex-1 min-w-0 truncate font-semibold">${esc(r.username)}</span><b class="tabular-nums hot">${r.mmr}</b></div>`).join('')
    : `<div class="mini text-[var(--muted)]">${ACC.server ? 'No ranked players yet. Be the first!' : 'Connect to the server to see the leaderboard.'}</div>`;
  if (ACC.server && Date.now() - ACC.boardT > 30000) loadBoard().then(() => { if (screenNow === 'menu') refreshMenu(); });
  $('#mXp').style.width = Math.round(lv.into / lv.need * 100) + '%';
  $('#mXpText').textContent = `${lv.into} / ${lv.need} XP to level ${lv.level + 1}`;
  $('#mCoins').textContent = a.coins;
  $('#mMmr').textContent = a.mmr;
  $('#mBest').textContent = `Best streak: ${a.bestRally || 0}`;
  $('#sndBtn').textContent = `Sound: ${data.sound ? 'on' : 'off'}`;
  $('#mAccBtn').textContent = isServerAcc() ? 'Account' : (ACC.server ? 'Sign up / Log in' : 'Guest profile');
  $('#mNet').textContent = !ACC.checked ? 'Checking for a server…' : isServerAcc() ? `Signed in · ${location.host}` : ACC.server ? 'Playing anonymously · progress saved in this browser' : 'Offline · progress saved in this browser';
  $('#mOnlineDot').style.background = ACC.server ? 'var(--good)' : 'var(--muted)';
  $('#mOnlineSub').textContent = ACC.server ? 'Quick match & rooms' : 'Needs the server';
  const next = LADDER.find(k => !(a.beaten || []).includes(k));
  $('#m1pSub').textContent = next ? `Beat each AI to unlock the next. ${LADDER.indexOf(next)} of ${LADDER.length} beaten.` : 'You beat the whole ladder! Keep climbing your MMR.';
  if (next){ const rw = CAT.matchRewards(next, true); $('#mNext').innerHTML = `<span class="lobbyTag">NEXT</span><div class="min-w-0 flex-1"><b class="block truncate">${esc(AIS[next].name)}</b><span class="text-xs text-[var(--muted)]">${AIS[next].mmr} MMR · win ${rw.coins} coins, ${rw.xp} XP</span></div>`; }
  else $('#mNext').innerHTML = '<span class="lobbyTag">CHAMPION</span><b>All 10 opponents beaten</b>';
}
let gateTab = 'play';
function renderGate(){
  const ok = ACC.server, chk = ACC.checked;
  $('#gLogin').disabled = !ok; $('#gSignup').disabled = !ok;
  if (!ok && gateTab !== 'play') gateTab = 'play';
  $$('#gTabs button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === (gateTab === 'recover' ? 'login' : gateTab)));
  $('#gPlay').classList.toggle('hidden', gateTab !== 'play'); $('#gForm').classList.toggle('hidden', gateTab !== 'login' && gateTab !== 'signup'); $('#gRecover').classList.toggle('hidden', gateTab !== 'recover');
  const su = gateTab === 'signup'; suMode = su ? 'signup' : 'login';
  setTxt('#gFormTitle', su ? 'Create your account' : 'Welcome back'); setTxt('#suGo', su ? 'Create account' : 'Log in');
  $('#suPass').setAttribute('autocomplete', su ? 'new-password' : 'current-password'); $('#suPass').placeholder = su ? 'Password (at least 4 characters)' : 'Password';
  $('#pwMeter').classList.toggle('hidden', !su); $('#agreeRow').classList.toggle('hidden', !su); $('#gForgot').classList.toggle('hidden', su);
  $('#gNote').textContent = !chk ? 'Checking for the server…' : ok ? (ACC.temporary ? '⚠ This server has no permanent database yet, so accounts are deleted whenever it restarts. The owner needs to connect Upstash (see README).' : 'Anonymous progress stays in this browser. An account keeps it on the server and puts you on the leaderboard.') : 'No server found, so accounts are off. Anonymous progress is saved in this browser.';
}
function renderDiff(){
  const m = G.pendingMode || '1p', ranked = RANKED(m), a = getAcc() || ensureLocal(), mmr = a.mmr;
  $('#diffTitle').textContent = m === '1p' ? 'Pick your opponent' : 'Pick the opposing pair';
  $('#diffLead').textContent = ranked ? 'Beat an opponent to unlock the next one. Opponents more than 1.0 below your rating are Practice (no rating change, ¼ rewards).' : 'This mode is unranked, so every opponent is open.';
  const pp = $('#diffPartner');
  pp.classList.toggle('hidden', m !== 'duo-ai');
  if (m === 'duo-ai'){
    const mates = itemsOf('partner').filter(i => a.owned.includes(i.id));
    pp.innerHTML = `<div class="text-sm font-semibold text-[var(--muted)] mb-1.5">Your teammate</div><div class="flex gap-2 flex-wrap">${mates.map(i => `<button data-act="pickMate" data-id="${i.id}" class="tile rounded-xl px-3 py-2 font-bold ${a.equip.partner === i.id ? 'chip-on' : ''}">${esc(i.name)}</button>`).join('')}<button data-act="shopPartners" class="rounded-xl px-3 py-2 font-semibold text-sm underline underline-offset-4">Unlock more</button></div>`;
  }
  const list = $('#diffList'); list.innerHTML = '';
  LADDER.forEach((k, i) => {
    const ai = AIS[k], exp = 1 / (1 + Math.pow(10, (ai.mmr - mmr) / 400));
    const win = Math.max(3, Math.round(40 * (1 - exp))), loss = Math.max(3, Math.round(40 * exp));
    const locked = ranked && !CAT.aiUnlocked(a.beaten, k), beaten = (a.beaten || []).includes(k);
    const pv = CAT.matchPreview(mmr, k) || { win, loss, coins:CAT.matchRewards(k, true).coins };
    const btn = document.createElement('button');
    btn.className = 'tile rounded-2xl p-3.5 text-left flex items-center gap-3' + (locked ? ' opacity-60' : '');
    btn.dataset.act = locked ? 'lockedAi' : 'diff'; btn.dataset.key = k;
    const tier = CAT.duprTier(ai.dupr), prevTier = i ? CAT.duprTier(AIS[LADDER[i - 1]].dupr) : '';
    if (tier !== prevTier){ const h = document.createElement('div'); h.className = 'sideHead'; h.style.margin = '10px 0 2px'; h.textContent = `${tier} · ${({ Beginner:'2.0–2.99', Intermediate:'3.0–3.49', 'Advanced intermediate':'3.5–3.99', Advanced:'4.0–4.99', 'Semi-professional':'5.0–5.99', Professional:'6.0–6.99', 'World-best':'7.0–8.0' })[tier]} rating`; list.appendChild(h); }
    btn.innerHTML = `<span class="font-display text-lg w-7 text-center text-[var(--muted)] tabular-nums">${locked ? '🔒' : beaten ? '✓' : i + 1}</span>
      <div class="flex-1 min-w-0"><div class="font-display text-lg leading-none">${esc(m === '1p' ? ai.name : ai.name + ' & ' + ai.name2.split(' ')[1])}</div>
      <div class="text-sm text-[var(--muted)] mt-1">${locked ? `Beat ${esc(AIS[LADDER[i - 1]].name)} to unlock` : ai.blurb}</div></div>
      <div class="text-right shrink-0"><div class="font-display text-xl leading-none tabular-nums">${ai.mmr}</div><div class="text-[11px] font-bold hot tabular-nums">${CAT.dupr(ai.mmr).toFixed(2)} rating</div>
      ${ranked && !locked ? (pv.practice
        ? `<div class="mt-1"><span class="lobbyTag" style="color:#93c5fd; border-color:rgba(147,197,253,.5); background:rgba(147,197,253,.1)">PRACTICE</span></div><div class="text-[11px] text-[var(--muted)] mt-0.5">no rating · ${pv.coins} coins</div>`
        : `<div class="text-[13px] font-semibold mt-1 tabular-nums"><span style="color:var(--good)">+${pv.win}</span> <span class="text-[var(--muted)]">/</span> <span style="color:var(--bad)">−${pv.loss}</span></div><div class="text-[11px] text-[var(--muted)]">win: ${pv.coins} coins${pv.easy ? ' · easy' : ''}</div>`) : ''}</div>`;
    list.appendChild(btn);
  });
}
function renderSignup(){
  const srv = ACC.server;
  $('#suTitle').textContent = !srv ? 'Accounts' : 'Your account';
  $('#suOut').classList.toggle('hidden', !(srv && ACC.user));
  if (srv && ACC.user){ const lv = CAT.levelInfo(ACC.user.xp); $('#suUser').textContent = ACC.user.username; $('#suStats').textContent = `Lv ${lv.level} · ${ACC.user.mmr} MMR · ${ACC.user.coins} coins · ${ACC.user.wins}–${ACC.user.losses}`; }
  $('#suNote').textContent = srv
    ? 'An account keeps your level, coins, gear and MMR on the server, so you can log in from any device. It starts fresh at level 1 and 0 MMR.'
    : 'Accounts need the Pickle Rush server. You can still play anonymously; progress is saved in this browser.';
}
let suMode = 'signup';
function pwScore(pw){ let sc = 0; if (pw.length >= 6) sc++; if (pw.length >= 10) sc++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) sc++; if (/\d/.test(pw)) sc++; if (/[^A-Za-z0-9]/.test(pw)) sc++; if (/^(1234|12345|123456|password|qwerty|abcd)/i.test(pw)) sc = 0; return sc; }
function showRecovery(code){ $('#recCode').textContent = code; $('#recOv').classList.remove('hidden'); }
async function rcGo(){
  const name = $('#rcName').value.trim(), code = $('#rcCode').value.trim(), pass = $('#rcPass').value;
  $('#rcErr').textContent = '';
  if (!name || code.replace(/[^A-Za-z0-9]/g, '').length < 12){ $('#rcErr').textContent = 'Enter your username and the 12-character code.'; return; }
  if (pass.length < 4){ $('#rcErr').textContent = 'The new password needs at least 4 characters.'; return; }
  try {
    const j = await api('api/recover', { username:name, code, password:pass });
    resetNotifs(); data.token = j.token; ACC.user = j.user; FR.t = 0; dailyTried = false; save(); netHello(); loadModList();
    $('#rcPass').value = ''; $('#rcCode').value = '';
    showToast('Password changed', 'Here is your new recovery code'); showRecovery(j.recovery);
  } catch (e) { $('#rcErr').textContent = e.message; }
}
async function suGo(){
  const name = $('#suName').value.trim(), pass = $('#suPass').value;
  $('#suErr').textContent = '';
  if (!ACC.server) return;
  if (!/^[A-Za-z0-9_]{3,14}$/.test(name)){ $('#suErr').textContent = 'Usernames are 3–14 letters, numbers or _'; return; }
  if (pass.length < 4){ $('#suErr').textContent = 'Passwords need at least 4 characters.'; return; }
  if (suMode === 'signup' && CAT.badName(name)){ $('#suErr').textContent = 'Please pick a different username.'; return; }
  if (suMode === 'signup' && !$('#suAgree').checked){ $('#suErr').textContent = 'Please agree to the Terms and Privacy Policy.'; return; }
  $('#suGo').disabled = true;
  try {
    const j = await api(suMode === 'login' ? 'api/login' : 'api/signup', { username:name, password:pass, look:data.p1 });
    resetNotifs(); FR.list = []; FR.keys = new Set(); FR.incoming = []; FR.outgoing = new Set();
    data.token = j.token; ACC.user = j.user; FR.t = 0; dailyTried = false; if (NW.open) netHello(); loadModList();
    if (suMode === 'login' && j.user.look) Object.assign(data.p1, j.user.look);
    data.p1.name = j.user.username.slice(0, 12); save();
    $('#suPass').value = ''; netHello();
    showToast(suMode === 'login' ? 'Welcome back' : 'Account created', j.user.username);
    if (j.recovery) showRecovery(j.recovery); else show('s-menu');
  } catch (e) { $('#suErr').textContent = e.message; }
  $('#suGo').disabled = false;
}
function renderRank(){
  const a = getAcc();
  if (a){
    const n = a.wins + a.losses;
    $('#rMe').innerHTML = `<div class="flex items-end justify-between gap-4 flex-wrap">
      <div><div class="font-display text-[60px] leading-none tabular-nums">${a.mmr}</div><div class="text-sm font-semibold text-[var(--muted)] mt-1">${esc(a.username || a.name)}’s MMR · <span class="hot">${CAT.dupr(a.mmr).toFixed(3)} PR Rating</span> · ${CAT.duprTier(CAT.dupr(a.mmr))}</div></div>
      <div class="grid grid-cols-3 gap-4 text-right">
        <div><div class="font-display text-xl tabular-nums">${a.peak || a.mmr}</div><div class="text-xs text-[var(--muted)] font-semibold">Peak</div></div>
        <div><div class="font-display text-xl tabular-nums">${a.wins}–${a.losses}</div><div class="text-xs text-[var(--muted)] font-semibold">W–L</div></div>
        <div><div class="font-display text-xl tabular-nums">${n ? Math.round(a.wins / n * 100) : 0}%</div><div class="text-xs text-[var(--muted)] font-semibold">Win rate</div></div>
      </div></div>`;
  } else {
    $('#rMe').innerHTML = `<div class="flex items-center justify-between gap-3"><div><div class="font-bold">You’re not ranked yet</div><div class="text-sm text-[var(--muted)]">${ACC.server ? 'Sign up, then win ranked matches to climb.' : 'Create a profile to track your MMR.'}</div></div><button data-act="signup" class="primary rounded-xl px-4 py-2.5 font-display shrink-0">${ACC.server ? 'Sign up' : 'Create profile'}</button></div>`;
  }
  $$('#rTabs button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === rankTab));
  let rows = ACC.server ? ACC.board : (a ? [{ username:a.name, mmr:a.mmr, wins:a.wins, losses:a.losses, level:CAT.levelInfo(a.xp).level }] : []);
  if (rankTab === 'friends'){
    const me = a ? [{ username:a.username || a.name, mmr:a.mmr, wins:a.wins, losses:a.losses, level:CAT.levelInfo(a.xp).level, nation:(myLook() || {}).nation }] : [];
    rows = me.concat(FR.list.map(f => ({ username:f.username, mmr:f.mmr, wins:f.wins, losses:f.losses, level:f.level, nation:f.look && f.look.nation, dupr:f.dupr }))).sort((x, y) => y.mmr - x.mmr);
  }
  const meName = a ? (a.username || a.name) : null;
  $('#rNote').textContent = ACC.server ? 'Real players on this server, sorted by MMR. AI opponents aren’t listed.' : 'Offline: only this device’s profile is shown. Run the server for a shared leaderboard.';
  $('#rCount').textContent = rows.length ? `${rows.length} player${rows.length === 1 ? '' : 's'}` : '';
  $('#rBoard').innerHTML = rows.length ? rows.map((r, i) => {
    const you = r.username === meName, medal = ['#f5c542', '#cfd6e0', '#d9925b'][i];
    return `<div ${ACC.server ? `data-act="viewPlayer" data-name="${esc(r.username)}" style="cursor:pointer"` : ''} class="flex items-center gap-3 rounded-xl px-3 py-2 ${you ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'tile'}">
      <span class="font-display w-7 text-center tabular-nums rounded-md" ${medal && !you ? `style="background:${medal};color:#1b1b1b"` : ''}>${i + 1}</span>
      <span class="flex-1 font-semibold truncate">${flagHTML(r.nation, 12)} ${esc(r.username)}${you ? ' (you)' : ''}</span>
      <span class="text-xs font-bold opacity-80">Lv ${r.level || 1}</span><span class="text-xs font-bold hot tabular-nums">${(r.dupr ?? CAT.dupr(r.mmr)).toFixed(2)}</span><span class="text-sm tabular-nums opacity-80">${r.wins}–${r.losses}</span><span class="font-display tabular-nums w-14 text-right">${r.mmr}</span></div>`;
  }).join('') : `<div class="text-[var(--muted)]">${ACC.server ? 'No players yet. Sign up and win a ranked match to be first.' : 'Nothing here yet.'}</div>`;
  const hist = (a && a.history) || [];
  $('#rHist').innerHTML = hist.length ? hist.map(h => `<div class="tile rounded-xl px-3 py-2 flex items-center gap-3">
    <span class="font-bold w-5" style="color:${h.win ? 'var(--good)' : 'var(--bad)'}">${h.win ? 'W' : 'L'}</span>
    <span class="flex-1 truncate">${esc(h.opp)} <span class="text-[var(--muted)] tabular-nums">${esc(h.score)}</span> <span class="text-xs text-[var(--muted)]">${esc(h.mode || '')}</span></span>
    <span class="font-display tabular-nums" style="color:${h.delta > 0 ? 'var(--good)' : 'var(--bad)'}">${h.delta > 0 ? '+' : '−'}${Math.abs(h.delta)}</span>
    <span class="font-display tabular-nums w-12 text-right">${h.mmr}</span></div>`).join('')
    : '<div class="text-[var(--muted)]">Ranked matches show up here.</div>';
}
function renderChar(){
  const a = getAcc() || ensureLocal(), p2 = editWho === 'p2', base = data[editWho];
  const eq = p2 ? data.p2.equip : a.equip;
  $('#tabP1').classList.toggle('chip-on', !p2); $('#tabP2').classList.toggle('chip-on', p2);
  $('#cNameWrap').classList.toggle('hidden', !p2 && isServerAcc());
  $('#cName').value = base.name;
  $$('.gbtn').forEach(b => b.classList.toggle('chip-on', b.dataset.v === base.gender));
  $('#skinRow').innerHTML = SKINS.map((c, i) => `<button data-act="skin" data-i="${i}" aria-label="Skin tone ${i + 1}" class="w-9 h-9 rounded-full border-[3px] ${base.skin === i ? 'border-[var(--accent)]' : 'border-[var(--line)]'}" style="background:${c}"></button>`).join('');
  $('#hairRow').innerHTML = HAIRS.map((c, i) => `<button data-act="hair" data-i="${i}" aria-label="Hair color ${i + 1}" class="w-9 h-9 rounded-full border-[3px] ${base.hair === i ? 'border-[var(--accent)]' : 'border-[var(--line)]'}" style="background:${c}"></button>`).join('');
  $('#bodyRow').innerHTML = CAT.BODY_TYPES.map(b => `<button data-act="bodyType" data-v="${b}" class="${(base.body || 'regular') === b ? 'chip-on' : ''}">${BODY_NAME[b]}</button>`).join('');
  const hgt = base.height || (base.gender === 'girl' ? 165 : 175); $('#heightIn').value = hgt; setTxt('#heightVal', `${hgt} cm`);
  const ns = $('#nationSel'); if (!ns.options.length) ns.innerHTML = '<option value="">No flag</option>' + NATION_CODES.map(k => `<option value="${k}">${esc(CAT.NATIONS[k])}</option>`).join('');
  ns.value = base.nation || ''; $('#nationFlag').innerHTML = flagHTML(base.nation, 20);
  $('#hairStyleRow').innerHTML = CAT.HAIR_STYLES[base.gender].map(h => `<button data-act="hairStyle" data-v="${h}" class="tile rounded-xl px-3 py-1.5 font-semibold ${base.hairStyle === h ? 'chip-on' : ''}">${HAIR_NAME[h]}</button>`).join('');
  const slots = p2 ? ['hairx', 'head', 'top', 'bottom', 'shoes', 'wrist', 'paddle', 'ball', 'dance'] : ['hairx', 'head', 'top', 'bottom', 'shoes', 'wrist', 'paddle', 'ball', 'dance', 'court', 'partner'];
  $('#equipList').innerHTML = slots.map(sl => {
    const own = itemsOf(sl).filter(i => a.owned.includes(i.id)), total = itemsOf(sl).length;
    return `<div><div class="flex items-baseline justify-between"><span class="text-sm font-semibold text-[var(--muted)]">${SLOT_NAME[sl]}</span><span class="text-xs text-[var(--muted)]">${own.length}/${total} owned</span></div>
      <div class="flex gap-2 flex-wrap mt-1.5">${own.map(i => `<button data-act="equip" data-slot="${sl}" data-id="${i.id}" class="tile rounded-xl px-3 py-1.5 text-sm font-semibold ${eq[sl] === i.id ? 'chip-on' : ''}" style="box-shadow:inset 3px 0 0 ${RARITY[rarity(i)]}">${esc(i.name)}</button>`).join('')}</div></div>`;
  }).join('');
}
function saveName(){
  const v = $('#cName').value.trim().slice(0, 12); if (!v) return;
  data[editWho].name = v;
  if (editWho === 'p1' && !isServerAcc() && data.localAcc) data.localAcc.name = v;
  save();
}
