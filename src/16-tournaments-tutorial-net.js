/* ---------- tournaments ---------- */
const TOUR = { cur:null };
const CUP_ICON = { cup_s1:'🥉', cup_s2:'🥈', cup_s3:'🥇', cup_club:'🥉', cup_open:'🥈', cup_world:'🥇', cup_brgy:'🥉', cup_visayas:'🥈', cup_phnats:'🥇', cup_street:'🔥' };
function streetCard(a, c){
  const owned = a.owned.includes('mate_lando'), beat = (a.trophies || {})[c.id] || 0;
  return `<div class="cupCard streetCard"><div class="flex gap-4 items-center flex-wrap"><canvas class="landoStage" data-lando="1"></canvas>
    <div class="min-w-0 flex-1"><span class="lobbyTag" style="color:#fb923c; border-color:rgba(251,146,60,.5)">STREET CHALLENGE · LEGEND</span>
      <div class="font-display text-2xl mt-1">${flagHTML('PH', 18)} Kuya Lando</div>
      <p class="text-sm text-[var(--muted)] mt-1">Worn-out shirt, tsinelas and a taped-up paddle. On the lansangan he has never lost. Beat him 1v1 at the Lansangan Street Court and he joins your team. Rating 7.8.</p>
      <div class="text-sm font-bold mt-2" style="color:#f5c542">${owned ? '✓ Kuya Lando is on your team' : 'Three ways to get him: beat him here · win the Philippine Nationals · buy him for 20,000 coins'}</div>
      <div class="flex gap-2 flex-wrap mt-3"><button data-act="tourStart" data-cup="cup_street" class="primary rounded-xl px-4 py-2.5 font-bold">${beat ? 'Challenge him again' : 'Challenge Kuya Lando'} · ${COIN_SVG} ${c.ticket}</button>${owned ? '' : `<button data-act="shopTeammates" class="tile rounded-xl px-4 py-2.5 font-bold">Buy him · ${COIN_SVG} 20,000</button>`}</div></div></div></div>`;
}
const mateName = () => { const a = getAcc(); return IT((a && a.equip.partner) || 'mate_ace').name.split(' · ')[0]; };
function cupCard(a, c){
  if (c.boss) return streetCard(a, c);
  const open = CAT.cupUnlocked(a, c.id), won = (a.trophies || {})[c.id] || 0;
  const lock = c.need ? `Reach a ${c.need.toFixed(1)} rating or win the ${CAT.CUP_BY[c.prev].name} to unlock` : '';
  return `<div class="cupCard ${open ? '' : 'locked'}"><div class="cupHead"><div class="cupIcon">${CUP_ICON[c.id]}</div>
    <div class="min-w-0 flex-1"><div class="font-display text-2xl">${esc(c.name)} <span class="lobbyTag" style="vertical-align:middle">${esc(c.tier.toUpperCase())}</span></div><div class="text-sm text-[var(--muted)]">${c.venue ? 'At the ' + esc(IT(c.venue).name) + ' · ' : ''}Opponents ${c.lo.toFixed(1)}–${c.hi.toFixed(1)} rating · 3 rounds · each win pays ${c.coins.join(' / ')} coins · champions get ${c.keys} 🔑</div></div>
    ${won ? `<span class="lobbyTag" style="color:#f5c542; border-color:rgba(245,197,66,.5)">🏆 × ${won}</span>` : ''}</div>
    <div class="prizeRow">${c.prizes.map(id => `<div class="prize r-${CAT.rarityOf(IT(id))}"><canvas data-id="${id}"></canvas><span>${esc(IT(id).name)}</span>${a.owned.includes(id) ? '<em>OWNED</em>' : ''}</div>`).join('')}<div class="prizeNote">🏆 Only won here</div></div>
    ${open ? `<div class="flex gap-2 flex-wrap mt-3"><button data-act="tourStart" data-cup="${c.id}" class="primary rounded-xl px-4 py-2.5 font-bold">${c.singles ? 'Enter solo' : 'Enter with ' + esc(mateName())} · ${COIN_SVG} ${c.ticket}</button>${c.singles ? '' : `<button data-act="tourOnline" data-cup="${c.id}" class="tile rounded-xl px-4 py-2.5 font-bold">Team up with a friend online</button>`}</div>`
      : `<div class="text-sm font-bold mt-3 text-[var(--muted)]">🔒 ${lock}</div>`}</div>`;
}
function bracketHTML(t, youName, youNation){
  const team = i => i === 0 ? { name:youName, nation:youNation, you:true } : t.teams[i];
  const out = !t.alive && !t.champion;
  const myWins = t.round;                      // rounds you have won
  const W = k => CAT.tourWinner(t, k);
  const qfShown = myWins >= 1 || out, sfShown = myWins >= 2 || (out && myWins >= 1), fShown = t.champion || (out && myWins >= 2);
  const qfW = [myWins >= 1 ? 0 : 1, W('q1'), W('q2'), W('q3')], sfW = [myWins >= 2 ? 0 : W('q1'), W('s1')];
  const seen = k => qfShown || (t.dec && t.dec[k] != null);
  const row = (i, show, w) => { const x = team(i); return `<div class="bTeam ${x.you ? 'you' : ''} ${show ? (w === i ? 'win' : 'lose') : ''}">${flagHTML(x.nation, 11)}<span class="truncate">${esc(x.name)}</span></div>`; };
  const tbd = '<div class="bTeam tbd">To be decided</div>';
  const dec = t.dec || {}, watchBtn = key => CAT.tourWatchable(t, key) ? `<div class="bWatch"><button data-act="tourWatch" data-key="${key}" class="tile rounded-lg px-2.5 py-1 text-xs font-bold">▶ Watch</button></div>` : '';
  const m = (a1, b1, show, w, key) => `<div class="bMatch">${a1 == null ? tbd : row(a1, show, w)}${b1 == null ? tbd : row(b1, show, w)}${key ? watchBtn(key) : ''}</div>`;
  const champ = t.champion ? 0 : fShown ? t.path[2] : null;
  return `<div class="bracket">
    <div class="bCol"><h4>QUARTERFINALS</h4>${m(0, 1, qfShown, qfW[0])}${m(2, 3, seen('q1'), qfW[1], 'q1')}${m(4, 5, seen('q2'), qfW[2], 'q2')}${m(6, 7, seen('q3'), qfW[3], 'q3')}</div>
    <div class="bCol"><h4>SEMIFINALS</h4>${m(qfShown ? qfW[0] : null, seen('q1') ? qfW[1] : null, sfShown, sfW[0])}${m(seen('q2') ? qfW[2] : null, seen('q3') ? qfW[3] : null, sfShown || (t.dec && t.dec.s1 != null), sfW[1], 's1')}</div>
    <div class="bCol"><h4>FINAL</h4>${m(sfShown ? sfW[0] : null, sfShown ? sfW[1] : null, fShown, champ)}</div>
    <div class="bCol"><h4>CHAMPION</h4><div class="bMatch">${champ == null ? '<div class="bTeam tbd">🏆 ?</div>' : `<div class="bTeam ${champ === 0 ? 'you win' : ''}">🏆 ${flagHTML(team(champ).nation, 11)}<span class="truncate">${esc(team(champ).name)}</span></div>`}</div></div>
  </div>`;
}
function renderTour(){
  const a = getAcc() || ensureLocal(), t = a.tour;
  if (t && t.alive){
    const c = CAT.CUP_BY[t.cup], o = CAT.tourOpp(t), ai = AIS[o.ai];
    setTxt('#tourTitle', `${CUP_ICON[t.cup]} ${c.name}`);
    const single = c.rounds === 1, solo = !!c.singles;
    $('#tourBody').innerHTML = `<div class="nextCard"><div class="min-w-0"><span class="lobbyTag">${single ? '1v1 STREET CHALLENGE' : CAT.ROUND_NAME[t.round].toUpperCase()}</span>
      <div class="font-display text-2xl mt-1">${solo ? 'You' : esc(t.teams[0].name || 'You & ' + mateName())} <span class="text-[var(--muted)]">vs</span> ${flagHTML(o.nation, 18)} ${esc(o.name)}</div>
      <div class="text-sm text-[var(--muted)]">${solo ? '' : esc(ai.name) + ' &amp; ' + esc(ai.name2) + ' · '}${ai.dupr.toFixed(2)} rating · ${c.venue ? esc(IT(c.venue).name) + ' · ' : ''}a win pays ${c.coins[t.round]} coins</div></div>
      <div class="flex gap-2"><button data-act="tourPlay" class="primary rounded-2xl px-6 py-3 font-display text-lg">${single ? 'Play the challenge' : 'Play ' + CAT.ROUND_NAME[t.round]}</button><button data-act="tourForfeit" class="tile rounded-2xl px-4 py-3 font-bold text-[var(--muted)]">Forfeit</button></div></div>
      ${single ? '' : bracketHTML(t, solo ? 'You' : (t.teams[0].name || 'You & ' + mateName()), myLook().nation)}`;
    return;
  }
  setTxt('#tourTitle', 'Pick a tournament');
  const group = (rg, title) => `<div class="tourGroup"><span>${title}</span></div>` + CAT.CUPS.filter(c => c.region === rg).map(c => cupCard(a, c)).join('');
  const lc = t && CAT.CUP_BY[t.cup], last = t && !t.alive ? `<div class="nextCard" style="border-color:${t.champion ? 'rgba(245,197,66,.6)' : 'var(--line)'}"><div><span class="lobbyTag">LAST TOURNAMENT</span><div class="font-display text-xl mt-1">${t.champion ? (lc.rounds === 1 ? '🔥 You beat ' : '🏆 Champions of the ') : (lc.rounds === 1 ? 'Lost the ' : 'Out in the ' + CAT.ROUND_NAME[t.round] + ' of the ')}${esc(lc.rounds === 1 ? 'Street Challenge' : lc.name)}</div></div></div>${lc.rounds === 1 ? '' : bracketHTML(t, lc.singles ? 'You' : (t.teams[0].name || 'You & ' + mateName()), myLook().nation)}` : '';
  $('#tourBody').innerHTML = last + group('SOLO', '🎾 Singles Tour') + group('PH', `${flagHTML('PH', 16)} Philippine Tour`) + group('WORLD', '🌍 World Tour');
  requestAnimationFrame(() => $$('#tourBody canvas[data-id]').forEach(cv2 => thumbOf(cv2, cv2.dataset.id)));
}
// entering costs a ticket; doubles teams pick a name first
let ENTRY = { cup:null, online:false };
function openEntry(cup, online){
  const a = getAcc() || ensureLocal(), c = CAT.CUP_BY[cup]; ENTRY = { cup, online };
  setTxt('#teCup', `${CUP_ICON[cup] || '🏆'} ${c.name}`);
  setTxt('#teInfo', c.boss ? '1v1 against Kuya Lando at the Lansangan Street Court.' : `${c.singles ? 'Solo' : online ? 'You and a friend online' : 'You and ' + mateName()} · 3 rounds · the Final is the toughest match.`);
  $('#teNameRow').classList.toggle('hidden', !!c.singles);
  if (!$('#teName').value) $('#teName').value = `${myName()}’s Team`.slice(0, 20);
  $('#tePrice').innerHTML = `${COIN_SVG} ${c.ticket}`; $('#teCoins').textContent = String(a.coins | 0);
  $('#teGo').disabled = (a.coins | 0) < c.ticket; setTxt('#teErr', (a.coins | 0) < c.ticket ? `You need ${c.ticket - (a.coins | 0)} more coins.` : '');
  setTxt('#teGo', online ? 'Make the room' : 'Buy ticket & enter');
  $('#tourEntry').classList.remove('hidden');
  if (!c.singles) setTimeout(() => $('#teName').select(), 50);
}
async function entryGo(){
  const c = CAT.CUP_BY[ENTRY.cup], nm = CAT.cleanTeamName($('#teName').value);
  if (!c.singles){ const err = CAT.teamNameError(nm); if (err){ setTxt('#teErr', err); return; } }
  if (ENTRY.online){
    $('#tourEntry').classList.add('hidden');
    NW.mode = '2v2'; NW.pendingTour = ENTRY.cup; NW.tourTeam = nm; show('s-online'); netConnect();
    let tries = 0; const go = () => { if (NW.open) netSend({ t:'create', mode:'2v2', name:nm }); else if (tries++ < 30) setTimeout(go, 300); }; go();
    showToast('Room made for your team', 'The ticket is paid when the host starts'); return;
  }
  const ok = await tourStart(ENTRY.cup, nm);
  if (ok){ $('#tourEntry').classList.add('hidden'); showToast(`Ticket bought: −${c.ticket} coins`, c.singles ? 'Good luck!' : `Good luck, ${nm}!`); }
}
async function tourStart(cup, teamName){
  try {
    if (isServerAcc()){ const j = await api('api/tour/start', { cup, teamName }); ACC.user = j.user; }
    else { const a = ensureLocal(); const t = CAT.tourEnter(a, cup, teamName, myLook().nation || ''); if (typeof t === 'string') throw new Error(t); save(); }
    renderTour(); return true;
  } catch (e){ setTxt('#teErr', e.message); return false; }
}
function tourPlay(){
  const a = getAcc(), t = a && a.tour; if (!t || !t.alive) return;
  const o = CAT.tourOpp(t); TOUR.cur = { id:t.id, cup:t.cup, round:t.round, opp:o };
  playGame('tour', o.ai);
}
// watch one of the other matches: the AI teams really play and the winner moves on
function tourWatch(key){
  const a = getAcc(), t = a && a.tour; if (!CAT.tourWatchable(t, key)) return;
  const parts = CAT.tourParts(t, key);
  TOUR.watch = { key, parts, teams:parts.map(i => t.teams[i]), id:t.id }; TOUR.cur = { id:t.id, cup:t.cup, round:t.round, opp:null };
  playGame('watch', null); showToast(`${t.teams[parts[0]].name} vs ${t.teams[parts[1]].name}`, 'Watching at 1.6× speed · press Skip any time');
}
async function recordWatch(winner){
  const a = getAcc(), W2 = TOUR.watch; if (!W2) return null;
  try {
    if (isServerAcc()){ const j = await api('api/tour/watch', { id:W2.id, key:W2.key, winner }); ACC.user = j.user; }
    else { const err = CAT.tourDecide(a.tour, W2.key, winner); if (err) throw new Error(err); save(); }
    return true;
  } catch (e){ showToast('Couldn’t record that match', e.message); return null; }
}
async function watchDone(w){
  const W2 = TOUR.watch; if (!W2) return;
  const winner = w === 1 ? W2.parts[0] : W2.parts[1];
  await recordWatch(winner);
  $('#resNew').textContent = '—'; $('#resDelta').textContent = '';
  $('#resRank').textContent = `${W2.teams[w === 1 ? 0 : 1].name} win and move on in the bracket.`;
  $('#resAgain').textContent = 'View bracket'; $('#resBracket').classList.add('hidden');
}
async function watchSkip(){
  const a = getAcc(), W2 = TOUR.watch; if (!W2 || !a.tour) return;
  await recordWatch(CAT.tourWinner(a.tour, W2.key)); TOUR.watch = null; show('s-tour');
}
async function tourQuit(){
  try { if (isServerAcc()){ const j = await api('api/tour/quit', {}); ACC.user = j.user; } else { const a = getAcc(); if (a && a.tour) a.tour.alive = false; save(); } } catch (e) {}
}
async function tourMatchDone(won, sc){
  const a = getAcc() || ensureLocal(), score = String(sc).replace('–', '-');
  $('#resNew').textContent = '—'; $('#resDelta').textContent = ''; $('#resAgain').textContent = 'Continue';
  $('#resBracket').classList.add('hidden');
  let res, t;
  try {
    if (isServerAcc()){ const j = await api('api/tour/result', { id:TOUR.cur && TOUR.cur.id, won, score, stats:matchStats() }); ACC.user = j.user; res = j.res; t = j.tour; handleProg(j.prog); }
    else { t = a.tour; res = CAT.tourResult(a, t, won, score); if (typeof res === 'string') throw new Error(res); handleProg(CAT.trackStats(a, Object.assign(matchStats(), { matches:1 }))); save(); }
  } catch (e){ $('#resRank').textContent = 'This match wasn’t counted: ' + e.message; return; }
  handleProg({ achievements:res.achievements || [] });
  const rn = CAT.ROUND_NAME[res.round], cname = CAT.CUP_BY[t.cup].name;
  const single = CAT.CUP_BY[t.cup].rounds === 1;
  $('#resRank').textContent = single ? (won ? '🔥 You beat Kuya Lando on his own court!' : 'Kuya Lando wins this time. Challenge him again!')
    : res.champion ? `🏆 Champions of the ${cname}!` : won ? `${rn} won! Up next: the ${CAT.ROUND_NAME[res.round + 1]}.` : `Knocked out in the ${rn} of the ${cname}.`;
  // after a win there's always somewhere to go: the next match, or the bracket
  $('#resAgain').textContent = t.alive ? `Next match: ${CAT.ROUND_NAME[t.round]}` : (single ? 'Back to tournaments' : 'View bracket');
  $('#resBracket').classList.toggle('hidden', !t.alive || single);
  showRewards(res);
  if (res.champion) setTimeout(() => showChampion(t.cup, res), 600);
}
function showChampion(cup, res){
  const c = CAT.CUP_BY[cup];
  setTxt('#champTitle', `${c.name} champions!`);
  setTxt('#champText', `+${res.coins} coins · +${res.keys || 0} 🔑${res.dupCoins ? ` · +${res.dupCoins} coins for prizes you already had` : ''}`);
  $('#champPrizes').innerHTML = (res.prizes || []).map(id => `<div class="prize r-${CAT.rarityOf(IT(id))}"><canvas data-id="${id}"></canvas><span>${esc(IT(id).name)}</span><em>NEW</em></div>`).join('') || '<div class="text-sm text-[var(--muted)]">You already own this cup’s prizes.</div>';
  $('#champOv').classList.remove('hidden'); confetti(); playSfx('win');
  addNotif({ type:'info', text:`🏆 You won the ${c.name}!${(res.prizes || []).length ? ' New: ' + res.prizes.map(id => IT(id).name).join(', ') : ''}` });
  requestAnimationFrame(() => $$('#champPrizes canvas[data-id]').forEach(cv2 => thumbOf(cv2, cv2.dataset.id)));
}
/* ---------- tutorial: a guided first rally against the coach ---------- */
const TUT_STEPS = [
  { t:'Move around', k:'Use W A S D (or the arrow keys) to move around your side of the court.', m:'Drag anywhere on the left half of the screen to move.' },
  { t:'Serve', k:'Hold Space, then let go while the meter is in the green zone. Serves go diagonally.', m:'Hold the Serve button, then let go while the meter is in the green zone.' },
  { t:'Return 3 balls', k:'Let the ball bounce once, then press Space to hit it back. (The first two shots must bounce.)', m:'Let the ball bounce once, then tap Hit. (The first two shots must bounce.)' },
  { t:'Dink into the kitchen', k:'Press R, then hit: a soft dink that lands in the green kitchen near the net.', m:'Tap Dink, then Hit: a soft shot into the green kitchen near the net.' },
  { t:'Smash!', k:'Coach will lob a high ball. Get under it and press Space: high balls become smashes.', m:'Coach will lob a high ball. Get under it and tap Hit: high balls become smashes.' },
];
function tutStart(){ playGame('rally'); G.tutorial = { step:0, dist:0, hits:0 }; renderTut(); }
function renderTut(){
  const T2 = G.tutorial, box = $('#tutBox'); box.classList.toggle('hidden', !T2 || screenNow !== 'game'); if (!T2) return;
  const st = TUT_STEPS[T2.step]; setTxt('#tutStep', `STEP ${T2.step + 1} OF ${TUT_STEPS.length}`); setTxt('#tutTitle', st.t);
  setTxt('#tutText', (isTouch ? st.m : st.k) + (T2.step === 2 ? ` (${T2.hits}/3)` : ''));
  $('#tutDots').innerHTML = TUT_STEPS.map((_, i) => `<i class="${i < T2.step ? 'on' : i === T2.step ? 'now' : ''}"></i>`).join('');
}
function tutNext(){
  const T2 = G.tutorial; if (!T2) return;
  T2.step++; playSfx('perfect');
  if (T2.step >= TUT_STEPS.length){ G.tutorial = null; renderTut(); tutDone(); return; }
  T2.hits = 0; renderTut(); showToast('Nice!', TUT_STEPS[T2.step].t);
}
function tutEvent(kind, type){
  const T2 = G.tutorial; if (!T2) return;
  if (T2.step === 0 && kind === 'move' && T2.dist > 3) tutNext();
  else if (T2.step === 1 && kind === 'hit' && type === 'serve') tutNext();
  else if (T2.step === 2 && kind === 'hit' && type !== 'serve'){ T2.hits++; renderTut(); if (T2.hits >= 3) tutNext(); }
  else if (T2.step === 3 && kind === 'hit' && type === 'dink') tutNext();
  else if (T2.step === 4 && kind === 'hit' && (type === 'smash' || type === 'spike')) tutNext();
}
async function tutDone(){
  let got = false;
  try {
    if (isServerAcc()){ const j = await api('api/tutorial', {}); ACC.user = j.user; got = !!j.reward; }
    else { const a = ensureLocal(); if (!a.tutorialDone){ a.tutorialDone = true; CAT.addRewards(a, { coins:200, xp:50 }); a.keys = (a.keys | 0) + 1; save(); got = true; } }
  } catch (e) {}
  confetti();
  askConfirm('Tutorial complete! 🎉', got ? 'You earned 200 coins and a chest key. Ready for your first ranked match?' : 'You know the basics. Ready for a ranked match?', 'Play ranked', () => show('s-diff'), 'Keep practicing', 'go');
  G.pendingMode = '1p';
}
let rankTab = 'all';
function challengeFriend(name){
  if (!ACC.server || !ACC.user){ showToast('Sign in to challenge friends', ''); return; }
  if (NW.room && NW.room.state === 'lobby'){ netSend({ t:'invite', to:name }); show('s-room'); return; }
  NW.pendingInvite = name; NW.mode = '1v1'; netConnect();
  const go = () => { if (NW.open) netSend({ t:'create', mode:'1v1', name:`${myName()} vs ${name}` }); else setTimeout(go, 300); }; go();
}
const PROF = { p:null, from:'menu' }, FR = { list:[], keys:new Set(), incoming:[], outgoing:new Set(), t:0 };
const NOTIF = { items:[], open:false, mod:[], seen:{} };
function resetNotifs(){ NOTIF.items = []; NOTIF.mod = []; NOTIF.seen = {}; NOTIF.open = false; $('#notifPanel').classList.add('hidden'); renderNotifs(); }
function loadModList(){ if (!(ACC.user && ACC.user.owner)) { NOTIF.mod = []; return; } api('api/mod/list', {}).then(j => { NOTIF.mod = j.list; renderNotifs(); }).catch(() => { NOTIF.mod = []; renderNotifs(); }); }
function addNotif(n){ NOTIF.items.unshift(Object.assign({ t:Date.now(), read:false }, n)); NOTIF.items = NOTIF.items.slice(0, 30); renderNotifs(); $('#bellBtn').classList.remove('ring'); void $('#bellBtn').offsetWidth; $('#bellBtn').classList.add('ring'); }
function renderNotifs(){
  const unread = FR.incoming.length + NOTIF.items.filter(n => !n.read).length + (ACC.user && ACC.user.owner ? (NOTIF.mod || []).filter(x => !x.banned && x.reports > (NOTIF.seen[x.username] || 0)).length : 0);
  $('#bellCount').classList.toggle('hidden', !unread); $('#bellCount').textContent = unread > 9 ? '9+' : String(unread);
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'now' : m < 60 ? m + 'm' : Math.round(m / 60) + 'h'; };
  const req = FR.incoming.map(f => `<div class="notif unread"><div class="min-w-0 flex-1"><b data-act="viewPlayer" data-name="${esc(f.username)}" style="cursor:pointer">${flagHTML(f.look && f.look.nation)} ${esc(f.username)}</b><div class="text-xs text-[var(--muted)]">wants to be your friend · ${f.dupr.toFixed(2)} rating</div></div>
    <button data-act="frAccept" data-name="${esc(f.username)}" class="primary rounded-xl px-3 py-1.5 text-sm font-bold">Accept</button><button data-act="frDecline" data-name="${esc(f.username)}" class="tile rounded-xl px-2.5 py-1.5 text-sm font-bold" aria-label="Decline">✕</button></div>`);
  const rest = NOTIF.items.map((n, i) => `<div class="notif ${n.read ? '' : 'unread'}"><div class="min-w-0 flex-1"><div class="font-semibold">${esc(n.text)}</div><div class="text-xs text-[var(--muted)]">${ago(n.t)}</div></div>
    ${n.type === 'invite' ? `<button data-act="notifJoin" data-i="${i}" class="primary rounded-xl px-3 py-1.5 text-sm font-bold">Join</button>` : ''}<button data-act="notifDrop" data-i="${i}" class="tile rounded-xl px-2.5 py-1.5 text-sm font-bold" aria-label="Dismiss">✕</button></div>`);
  const isOwnerNow = !!(ACC.user && ACC.user.owner);
  if (!isOwnerNow) NOTIF.mod = [];                       // reports are for the owner's eyes only
  const mod = (NOTIF.mod || []).map(x => `<div class="notif" style="border-color:rgba(239,68,68,.5)"><div class="min-w-0 flex-1"><b>⚑ ${esc(x.username)}</b><div class="text-xs text-[var(--muted)]">${x.reports} report${x.reports === 1 ? '' : 's'} · ${esc(x.reasons.join(', '))}${x.banned ? ' · banned' : x.flagged ? ' · hidden' : ''}</div></div><button data-act="viewPlayer" data-name="${esc(x.username)}" class="tile rounded-xl px-3 py-1.5 text-sm font-bold">Review</button></div>`);
  $('#notifList').innerHTML = req.concat(rest, mod).join('') || '<div class="mini text-[var(--muted)]">You’re all caught up.</div>';
}
const meKey = () => (ACC.user && ACC.user.username || '').toLowerCase();
async function openPlayer(name){
  if (!ACC.server) return showToast('Profiles need the server', 'Play on your Render link to see other players');
  if (screenNow !== 'player') PROF.from = screenNow;
  PROF.p = null; show('s-player'); setTxt('#ppName', name); setTxt('#ppMsg', 'Loading…'); $('#ppMsg').style.color = 'var(--muted)';
  try { const j = await api('api/player/' + encodeURIComponent(name)); PROF.p = j.player; setTxt('#ppMsg', ''); renderPlayer(); }
  catch (e){ setTxt('#ppMsg', e.message); $('#ppMsg').style.color = 'var(--bad)'; }
}
function renderPlayer(){
  const p = PROF.p; if (!p) return;
  $('#ppName').innerHTML = `${flagHTML(p.look && p.look.nation, 22)} ${esc(p.username)}`; $('#ppName')._v = null; $('#ppDot').style.background = p.online ? 'var(--good)' : 'var(--muted)';
  setTxt('#ppSub', `${p.online ? 'Online now' : 'Offline'}${p.look && p.look.nation ? ' · ' + CAT.NATIONS[p.look.nation] : ''}${p.look ? ` · ${p.look.height || 170} cm, ${p.look.body || 'regular'} build` : ''} · playing since ${new Date(p.created || Date.now()).toLocaleDateString()}`);
  setTxt('#ppDupr', p.dupr.toFixed(3)); setTxt('#ppTier', p.tier); $('#ppBar').style.width = ((p.dupr - 2) / 6 * 100).toFixed(1) + '%';
  setTxt('#ppLevel', String(p.level)); setTxt('#ppMmr', String(p.mmr)); setTxt('#ppRec', `${p.wins}–${p.losses}`);
  setTxt('#ppRate', p.wins + p.losses ? Math.round(p.wins / (p.wins + p.losses) * 100) + '%' : '—'); setTxt('#ppRally', String(p.bestRally)); setTxt('#ppPeak', String(p.peak || p.mmr));
  $('#ppHist').innerHTML = p.history.length ? p.history.map(h => `<div class="mini"><span class="wl" style="background:${h.win ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)'}; color:${h.win ? 'var(--good)' : 'var(--bad)'}">${h.win ? 'W' : 'L'}</span><span class="flex-1 min-w-0 truncate">${esc(h.opp)}</span><span class="tabular-nums text-[var(--muted)]">${esc(h.score)}</span></div>`).join('') : '<div class="mini text-[var(--muted)]">No ranked matches yet.</div>';
  const k = p.username.toLowerCase(), self = k === meKey(), friend = FR.keys.has(k), sent = FR.outgoing.has(k), asked = FR.incoming.some(f => f.username.toLowerCase() === k);
  $('#ppFriend').classList.toggle('hidden', self || !ACC.user);
  const st = friend ? 'friend' : asked ? 'asked' : sent ? 'sent' : 'none';
  $('#ppFriend').dataset.state = st;
  $('#ppFriend').textContent = { friend:'Remove friend', asked:'Accept friend request', sent:'Request sent · tap to cancel', none:'Add friend' }[st];
  $('#ppFriend').classList.toggle('primary', st === 'none' || st === 'asked'); $('#ppFriend').classList.toggle('tile', st === 'friend' || st === 'sent');
  $('#ppInvite').classList.toggle('hidden', self || !p.online || !NW.room || NW.room.state !== 'lobby');
  $('#ppReport').classList.toggle('hidden', self || !ACC.user);
  $('#ppChallenge').classList.toggle('hidden', self || !ACC.user || !p.online);
  const owner = !!(ACC.user && ACC.user.owner); $('#ppMod').classList.toggle('hidden', !owner || self);
  if (owner) setTxt('#ppModInfo', `· ${p.reports || 0} report${p.reports === 1 ? '' : 's'}${p.banned ? ' · BANNED' : ''}`);
  setTxt('#ppSub', $('#ppSub').textContent + ` · 🏅 ${p.ach || 0} achievements`);
  if (!ACC.user && !self) { setTxt('#ppMsg', 'Sign in to add friends.'); $('#ppMsg').style.color = 'var(--muted)'; }
}
async function loadFriends(force){
  if (!ACC.server || !ACC.user){ FR.list = []; FR.keys = new Set(); renderFriendBits(); return; }
  if (!force && Date.now() - FR.t < 15000) return;
  FR.t = Date.now();
  try {
    const j = await api('api/friends'); FR.list = j.friends; FR.keys = new Set(FR.list.map(f => f.username.toLowerCase()));
    FR.incoming = j.incoming || []; FR.outgoing = new Set((j.outgoing || []).map(n => n.toLowerCase()));
    renderFriendBits(); renderNotifs(); if (screenNow === 'player') renderPlayer();
  } catch (e) {}
}
async function friendChange(name, action){
  try {
    const j = await api('api/friends/' + action, { username:name }); await loadFriends(true);
    const msg = { add:j.status === 'friends' ? [`You and ${name} are now friends`, ''] : [`Friend request sent to ${name}`, 'It shows as pending until they accept'],
      accept:[`You and ${name} are now friends`, ''], decline:['Request declined', ''], cancel:['Request cancelled', ''], remove:[`${name} removed from friends`, ''] }[action];
    showToast(msg[0], msg[1]); return true;
  } catch (e){ showToast('Couldn’t update friends', e.message); return false; }
}
function renderFriendBits(){
  const row = (f, invite) => `<div class="mini"><i class="navDot" style="margin:0; background:${f.online ? 'var(--good)' : 'var(--muted)'}"></i><span data-act="viewPlayer" data-name="${esc(f.username)}" class="flex-1 min-w-0 truncate font-semibold" style="cursor:pointer">${flagHTML(f.look && f.look.nation, 11)} ${esc(f.username)}</span><b class="tabular-nums hot">${f.dupr.toFixed(2)}</b>${f.online ? (invite ? `<button data-act="frInvite" data-name="${esc(f.username)}" class="primary rounded-lg px-2.5 py-1 text-xs font-bold">Invite</button>` : `<button data-act="frChallenge" data-name="${esc(f.username)}" class="tile rounded-lg px-2 py-1 text-xs font-bold" title="Challenge to a 1v1">⚔</button>`) : ''}</div>`;
  const none = !ACC.server ? 'Connect to the server to add friends.' : !ACC.user ? 'Sign in to add friends.' : 'No friends yet. Open a player’s profile to add them.';
  const list = FR.list.length ? FR.list : null;
  if ($('#mFriends')) $('#mFriends').innerHTML = list ? list.slice(0, 6).map(f => row(f)).join('') : `<div class="mini text-[var(--muted)]">${none}</div>`;
  if ($('#onFriends')) $('#onFriends').innerHTML = list ? list.map(f => row(f, !!(NW.room && NW.room.state === 'lobby'))).join('') : `<div class="mini text-[var(--muted)]">${none}</div>`;
  if ($('#rmFriends')){
    const inRoom = new Set(((NW.room && NW.room.slots) || []).filter(Boolean).map(x => (x.name || '').toLowerCase()));
    const on = FR.list.filter(f => f.online && !inRoom.has(f.username.toLowerCase()));
    $('#rmFriends').innerHTML = NW.room && NW.room.state === 'lobby' && on.length ? `<span class="text-sm font-semibold text-[var(--muted)] self-center">Invite a friend:</span>` + on.map(f => `<button data-act="frInvite" data-name="${esc(f.username)}" class="tile rounded-xl px-3 py-1.5 text-sm font-bold"><i class="navDot" style="display:inline-block; margin:0 6px 0 0; background:var(--good)"></i>${esc(f.username)}</button>`).join('') : '';
  }
}
function showInvite(m){
  NW.invite = m; setTxt('#invTxt', `${m.from} invited you to a ${m.mode} match`); $('#inviteCard').classList.remove('hidden');
  clearTimeout(NW.invT); NW.invT = setTimeout(() => $('#inviteCard').classList.add('hidden'), 25000);
  playSfx('perfect');
}
let dailyTried = false;
async function claimDailyOnce(){
  if (dailyTried) return; dailyTried = true;
  try {
    if (isServerAcc()){ const j = await api('api/daily', {}); if (j.bonus){ ACC.user = j.user; showToast(`Daily bonus: +${j.bonus.coins} coins`, 'Come back tomorrow for more'); addNotif({ type:'info', text:`Daily bonus: +${j.bonus.coins} coins` }); refreshMenu(); } }
    else { const a = getAcc(); const b = a && CAT.claimDaily(a); if (b){ save(); showToast(`Daily bonus: +${b.coins} coins`, 'Come back tomorrow for more'); addNotif({ type:'info', text:`Daily bonus: +${b.coins} coins` }); refreshMenu(); } }
  } catch (e) { dailyTried = false; }
}
function refreshMusicBtns(){ $$('.musicBtn').forEach(b => { if (b.classList.contains('tile')) b.classList.toggle('chip-on', musicOn()); else b.textContent = `Music: ${musicOn() ? 'on' : 'off'}`; }); }
function setNetBanner(txt){
  const el = $('#netWarn'); if (!el) return;
  el.classList.toggle('hidden', !txt); if (txt) setTxt('#netWarn', txt);
}
function netSend(o){
  if (!(NW.ws && NW.open)) return;
  const txt = JSON.stringify(o);
  if (FAKE_LAG) setTimeout(() => { if (NW.ws && NW.open) NW.ws.send(txt); }, FAKE_LAG); else NW.ws.send(txt);
}
function netHello(){ netSend({ t:'hello', token:data.token, name:myName(), look:myLook() }); }
function netMsg(m){
  switch (m.t){
    case 'welcome': NW.name = m.name; NW.account = m.account; renderOnline(); break;
    case 'rooms': NW.rooms = m.rooms || []; renderOnline(); break;
    case 'room': {
      const fresh = !NW.room || NW.room.code !== m.room.code;
      NW.room = m.room; NW.you = m.you; if (m.rid) NW.rid = m.rid; saveRejoin();
      if (fresh && m.room.host === m.you && m.room.state === 'lobby' && (data.opts.customCourt || 'random') !== (m.room.court || 'random')) netSend({ t:'court', v:data.opts.customCourt || 'random' });
      if (fresh && m.room.host === m.you && NW.pendingTour){ netSend({ t:'tourMode', v:NW.pendingTour }); NW.pendingTour = null; }
      if (fresh && m.room.host === m.you && NW.pendingInvite){ netSend({ t:'invite', to:NW.pendingInvite }); showToast(`Challenge sent to ${NW.pendingInvite}`, 'They get a Join button'); NW.pendingInvite = null; }
      if (G.mode === 'online' && ['game', 'pause', 'result', 'ctrl'].includes(screenNow)){
        if (m.room.state === 'lobby'){ G.netRole = null; show('s-room'); break; }
        syncSlots(m.room);
      } else if (['online', 'room', 'menu'].includes(screenNow)) show('s-room');
      renderRoom();
      break;
    }
    case 'start': {
      const wasReconnect = !!NW.reconnecting;
      NW.reconnecting = null; setNetBanner('');
      NW.room = m.room; NW.you = m.you; saveRejoin();
      // a host whose page never reloaded still has the match: just carry on
      if (m.rejoin && G.mode === 'online' && G.netRole === 'host' && m.room.host === m.you){ showToast('Reconnected', 'The match continues'); break; }
      beginOnline(); if (wasReconnect || m.rejoin) showToast('Reconnected', 'You’re back in the match');
      break;
    }
    case 'emote': showEmote(m.s, m.e); break;
    case 'me': if (m.user){ ACC.user = m.user; showToast('Tournament ticket bought', `${ACC.user.coins} coins left`); } break;
    case 'tourResult': {
      NW.lastRes = { m, t:Date.now() };
      if (NW.room) NW.room.tour = m.tour; if (m.user) ACC.user = m.user;
      const t = m.tour, r = m.res, cname = CAT.CUP_BY[t.cup].name, rn = CAT.ROUND_NAME[Math.min(2, t.champion ? 2 : t.alive ? t.round - 1 : t.round)];
      $('#resNew').textContent = '—'; $('#resDelta').textContent = '';
      $('#resRank').textContent = t.champion ? `🏆 Champions of the ${cname}!` : t.alive ? `${CAT.ROUND_NAME[t.round - 1]} won! Next: the ${CAT.ROUND_NAME[t.round]} vs ${t.opp ? t.opp.name : ''}.${G.netRole === 'host' ? '' : ' The host starts it.'}` : `Knocked out in the ${CAT.ROUND_NAME[t.round]} of the ${cname}.`;
      $('#resAgain').textContent = t.alive ? 'Next round' : 'Rematch';
      if (r) { showRewards(r); handleProg({ achievements:r.achievements || [] }); if (r.champion) setTimeout(() => showChampion(t.cup, r), 600); }
      break;
    }
    case 'invited': showInvite(m); addNotif({ type:'invite', code:m.code, text:`${m.from} invited you to a ${m.mode} match` }); break;
    case 'notify':
      if (m.kind === 'request'){ showToast(`${m.from} sent you a friend request`, 'Open the bell to accept'); $('#bellBtn').classList.remove('ring'); void $('#bellBtn').offsetWidth; $('#bellBtn').classList.add('ring'); }
      if (m.kind === 'accepted') addNotif({ type:'info', text:`${m.from} accepted your friend request` });
      FR.t = 0; loadFriends(true); break;
    case 'inviteSent': showToast(m.ok ? `Invite sent to ${m.to}` : `${m.to} isn’t online right now`, ''); break;
    case 'rejoinFail': NW.reconnecting = null; setNetBanner(''); clearRejoin(); if (G.mode === 'online') leaveOnline(m.msg); break;
    case 'in': hostInput(m); break;
    case 'st': if (G.netRole === 'guest') guestSnap(m); break;
    case 'closed': clearRejoin(); leaveOnline(m.reason); break;
    case 'error': NW.err = m.msg; renderOnline(); if (screenNow === 'room') setTxt('#rmErr', m.msg); break;
    case 'mmr':
      NW.lastRes = { m, t:Date.now() };
      if (m.ranked && m.user){ const before = ACC.user ? ACC.user.mmr : m.user.mmr - m.delta; ACC.user = m.user; showDelta(before, m.user.mmr, m.delta); $('#resRank').textContent = 'Saved to the player leaderboard'; showRewards(m.result); }
      else { $('#resNew').textContent = '—'; $('#resDelta').textContent = ''; $('#resRank').textContent = m.msg || 'Unranked: each team needs a signed-in player.'; }
      break;
    case 'pong': {
      NW.ping = Math.round(performance.now() - m.ts);
      const el = $('#netBadge'); el.textContent = `${NW.ping} ms`; el.style.color = NW.ping < 90 ? '#4ade80' : NW.ping < 180 ? '#fde047' : '#f87171';
      if (NW.ping > 250 && !NW.warned && G.mode === 'online'){ NW.warned = true; showToast('Slow connection', `${NW.ping} ms to the server. Try Wi-Fi, or let the player with the best signal host.`); }
      break;
    }
  }
}
function renderOnline(){
  if (screenNow !== 'online') return;
  $('#onNoServer').classList.toggle('hidden', ACC.server);
  $('#onYes').classList.toggle('hidden', !ACC.server);
  if (!ACC.server) return;
  $('#onName').textContent = NW.name || myName();
  $('#onAccNote').innerHTML = ACC.user ? 'Online matches between signed-in players are ranked.' : '<button data-act="signup" class="font-semibold underline underline-offset-4">Sign in</button> to rank online matches.';
  $('#onConn').textContent = NW.open ? `Connected to ${location.host}` : 'Connecting…';
  $$('#onMode button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === NW.mode));
  $('#onErr').textContent = NW.err || '';
  const rooms = NW.rooms;
  $('#onRooms').innerHTML = rooms.length ? rooms.map(r => `<div class="roomCard">
      <span class="lobbyTag">${r.mode.toUpperCase()}</span>
      <span class="flex-1 min-w-0"><span class="block font-bold truncate">${esc(r.name)}</span><span class="text-xs text-[var(--muted)]">${r.host ? 'Host ' + esc(r.host) + ' · ' : ''}${r.state === 'playing' ? 'in a match' : 'waiting for players'}</span></span>
      <span class="roomDots">${Array.from({ length:r.max }, (_, k) => `<i class="${k < r.count ? 'f' : ''}"></i>`).join('')}</span>
      ${r.state === 'lobby' && r.count < r.max ? `<button data-act="onJoin" data-code="${esc(r.code)}" class="primary rounded-xl px-4 py-2 font-bold">Join</button>` : ''}</div>`).join('')
    : '<div class="text-[var(--muted)]">No rooms yet. Create one and share the code.</div>';
}
const CHECK_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 25l9 9 19-21" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function renderRoom(){
  if (screenNow !== 'room' || !NW.room) return;
  const r = NW.room, host = r.host === NW.you, n = r.slots.length, me = r.slots[NW.you];
  setTxt('#rmCode', r.code); setTxt('#rmName', r.name || 'Room');
  setTxt('#rmMode', `${r.mode.toUpperCase()} ${r.quick ? 'QUICK MATCH' : 'ROOM'}`);
  const card = i => {
    const sl = r.slots[i], team = i % 2 === 0 ? 't1' : 't2', num = `${i + 1}P`;
    if (!sl) return `<button data-act="onSlot" data-i="${i}" class="pcard empty" style="animation-delay:${i * .07}s"><div class="pcNum" style="color:var(--muted)">${num}</div><div class="pcPlus">+</div><div class="pcName">Open slot</div><div class="pcMeta">Tap to move here.<br>The AI plays if nobody joins.</div></button>`;
    const you = i === NW.you, isHost = i === r.host;
    const meta = [sl.level ? `Lv ${sl.level}` : (sl.account ? '' : 'Guest'), sl.account ? `${CAT.dupr(sl.mmr).toFixed(2)} rating` : ''].filter(Boolean).join(' · ');
    const state = sl.away ? `<span class="pulse">RECONNECTING ${sl.awayLeft}s</span>` : sl.ready ? `${CHECK_SVG}<span>READY</span>` : `<span style="opacity:.7">NOT READY</span>`;
    return `<div class="pcard ${team} ${sl.ready ? 'ready' : ''} ${you ? 'me' : ''} ${sl.away ? 'away' : ''}" style="animation-delay:${i * .07}s">
      ${you || isHost ? `<span class="pcBadge">${[you ? 'YOU' : '', isHost ? 'HOST' : ''].filter(Boolean).join(' · ')}</span>` : ''}
      <div class="pcNum">${num}</div><canvas class="pcAvatar" data-slot="${i}"></canvas>
      <div class="pcName" ${sl.look && sl.look.nation ? `title="${esc(CAT.NATIONS[sl.look.nation] || '')}"` : ''} ${sl.account ? `data-act="viewPlayer" data-name="${esc(sl.name)}" style="cursor:pointer; text-decoration:underline dotted; text-underline-offset:4px"` : ''}>${flagHTML(sl.look && sl.look.nation, 12)} ${esc(sl.name)}</div><div class="pcMeta">${meta || '&nbsp;'}</div><div class="pcState">${state}</div></div>`;
  };
  const html = n === 2 ? `${card(0)}<div class="vs">VS</div>${card(1)}`
    : `<div class="teamCol"><div class="teamName" style="color:var(--accent)">TEAM 1</div><div class="cards">${card(0)}${card(2)}</div></div><div class="vs">VS</div><div class="teamCol"><div class="teamName" style="color:var(--hot)">TEAM 2</div><div class="cards">${card(1)}${card(3)}</div></div>`;
  const el = $('#rmSlots'); if (el._v !== html){ el._v = html; el.innerHTML = html; invalidateRects(); }
  const tr = $('#rmTourRow'), is2 = r.mode === '2v2'; tr.classList.toggle('hidden', !is2); $('#rmTourHelp').classList.toggle('hidden', !(is2 && r.tourMode));
  $('#rmTour').classList.toggle('hidden', !host); $('#rmTour').value = r.tourMode || ''; $('#rmTourTxt').classList.toggle('hidden', host); setTxt('#rmTourTxt', r.tourMode ? '🏆 ' + CAT.CUP_BY[r.tourMode].name : 'Normal match');
  const sel = $('#rmCourt'), cname = v => v === 'random' ? '🎲 Random court' : IT(v).name;
  if (!sel.options.length) sel.innerHTML = ['random', ...COURT_IDS].map(k => `<option value="${k}">${esc(cname(k))}</option>`).join('');
  sel.value = r.court || 'random'; sel.classList.toggle('hidden', !host); setTxt('#rmCourtTxt', cname(r.court || 'random')); $('#rmCourtTxt').classList.toggle('hidden', host);
  const humans = r.slots.filter(Boolean), waiting = humans.filter((sl, i) => r.slots.indexOf(sl) !== r.host && !sl.away && !sl.ready).length;
  const empties = r.slots.filter(x => !x).length;
  $('#rmReady').classList.toggle('hidden', host);
  const meReady = !!(me && me.ready);
  $('#rmReady').classList.toggle('on', meReady); setTxt('#rmReady', meReady ? '✓ Ready' : 'Ready up');
  $('#rmStart').classList.toggle('hidden', !host); $('#rmStart').disabled = waiting > 0;
  $('#rmForce').classList.toggle('hidden', !(host && waiting > 0));
  setTxt('#rmInfo', host
    ? (waiting ? `Waiting for ${waiting} player${waiting > 1 ? 's' : ''} to ready up${empties ? ` · ${empties} open slot${empties > 1 ? 's' : ''} for the AI` : ''}` : `Everyone is ready${empties ? ` · the AI fills ${empties} open slot${empties > 1 ? 's' : ''}` : ''}. Start when you like!`)
    : (meReady ? 'You’re ready. Waiting for the host to start…' : 'Tap Ready up when you’re set.'));
}
function drawLobby(t){
  if (!NW.room) return;
  for (const cv2 of $$('.pcAvatar')){
    const i = +cv2.dataset.slot, sl = NW.room.slots[i]; if (!sl) continue;
    drawStage(cv2, i === NW.you ? myLook() : (sl.look || myLook()), t + i * .7, { facing:'front', noCone:true, ring:i % 2 === 0 ? '#a6f23d' : '#ff7a3d', pose:sl.ready && cv2._ready === false ? (cv2._pose = t) : cv2._pose, tag:(sl.name || '?').slice(0, 1).toUpperCase() });
    cv2._ready = !!sl.ready;
  }
}
function slotTeam(i){ return i % 2 === 0 ? 1 : 2; }
function slotLane(i, n){ return n === 2 ? 0 : [-1, 1, 1, -1][i]; }
const CUSTOM_MODES = ['2p', '2v2', 'duo-coop', 'duo-vs'];
function resolveCourt(v){ return v && v !== 'random' && COURT_IDS.includes(v) ? v : COURT_IDS[(Math.random() * COURT_IDS.length) | 0]; }
function beginOnline(){
  const r = NW.room, n = r.slots.length, isHost = r.host === NW.you;
  const ps = r.slots.map((s, i) => {
    const base = { team:slotTeam(i), lane:slotLane(i, n) };
    if (!s){
      const o = r.tour && r.tour.alive && r.tour.opp;
      if (o && AIS[o.ai]){ const p = makePlayer(Object.assign(base, { name:i < 2 ? AIS[o.ai].name : AIS[o.ai].name2, look:Object.assign(randomLook(), { nation:o.nation }) })); p.ai = mkAI(AIS[o.ai]); return p; }
      const p = makePlayer(Object.assign(base, { name:'CPU' })); p.ai = mkAI(AIS.pro); return p;
    }
    if (i === NW.you) return makePlayer(Object.assign(base, { look:myLook(), name:s.name, human:{ set:'p1', alt:true, pad:0, tag:'P1', color:SLOT_COL[i] } }));
    return makePlayer(Object.assign(base, { look:s.look, name:s.name, human:{ remote:true, slot:i, set:'p2', tag:'P' + (i + 1), color:SLOT_COL[i] } }));
  });
  G.netRole = isHost ? 'host' : 'guest'; G.netEv = []; NW.snaps = []; NW.hit = false; NW.arms = [];
  G.flip = slotTeam(NW.you) === 2; NW.warned = false; NW.auth = null; fitCamera();
  startMatch('online', null, ps);
  if (isHost) G.court = resolveCourt(r.court);          // the room's court (or a random one); guests get it from the host
  show(null);
  showToast(isHost ? 'You’re hosting' : 'Match started', `${teamName(1)} vs ${teamName(2)}`);
}
function syncSlots(room){
  G.players.forEach((p, i) => {
    const sl = room.slots[i];
    if (p.human && p.human.remote && !sl){ p.human = null; p.ai = mkAI(AIS.pro); p.name = 'CPU'; p.away = false; showToast('Player left', 'The AI takes their place'); }
    else if (p.human && p.human.remote && sl){
      if (sl.away && !p.away) showToast(`${p.name} disconnected`, 'Waiting up to 30 seconds for them to come back');
      if (!sl.away && p.away) showToast(`${p.name} is back`, 'The match continues');
      p.away = !!sl.away;
      if (p.away){ p.netIn.x = p.netIn.y = 0; if (p.netIn.h){ p.netIn.h = 0; release(p); } }
    }
  });
  updateHUD();
}
function guestWaiting(){
  if (NW.reconnecting || !NW.open) return 'Connection lost · reconnecting…';
  const hs = NW.room && NW.room.slots[NW.room.host];
  if (hs && hs.away) return `Waiting for the host to reconnect${hs.awayLeft ? ` (${hs.awayLeft}s)` : ''}…`;
  return (NW.snaps.length && NW.snaps[NW.snaps.length - 1].wait) || '';
}
/* the host pauses the match while a player is reconnecting (and while the host itself is offline) */
function netWaiting(){
  if (G.mode !== 'online') return '';
  if (G.netRole === 'host'){
    if (!NW.open) return 'Connection lost · reconnecting…';
    const away = G.players.filter(p => p.away);
    if (away.length && NW.room){ const sl = NW.room.slots[G.players.indexOf(away[0])]; return `Waiting for ${away.map(p => p.name).join(' & ')} to reconnect${sl && sl.awayLeft ? ` (${sl.awayLeft}s)` : ''}…`; }
  }
  return '';
}
function leaveOnline(reason){
  NW.room = null; NW.snaps = []; G.netRole = null; G.flip = false; NW.reconnecting = null; setNetBanner(''); fitCamera();
  if (reason) showToast('Left the room', reason);
  show(ACC.server ? 's-online' : 's-menu');
}
function hostInput(m){
  if (G.netRole !== 'host') return;
  const p = G.players[m.s];
  if (!p || !p.human || !p.human.remote) return;
  if (typeof m.x === 'number') p.netIn.x = clamp(m.x, -1, 1);
  if (typeof m.y === 'number') p.netIn.y = clamp(m.y, -1, 1);
  if (m.s !== undefined) p.netIn.s = !!m.s;
  const h = !!m.h;
  if (h !== !!p.netIn.h){ p.netIn.h = h; h ? startCharge(p) : release(p); }
  if (Array.isArray(m.a)) m.a.slice(0, 4).forEach(a => { if (['slice', 'curve', 'dink', 'spike'].includes(a)) arm(p, a); });
}
function hostSnapshot(){
  const b = G.ball;
  return { t:'st', s:G.state, sc:G.score, sv:G.server, sp:G.players.indexOf(G.serverP), rp:G.players.indexOf(G.recvP), sn:G.serveNum, lw:G.lastWin, rl:G.replay ? G.replay.label : '', ce:G.cele && G.state === 'point' ? G.cele.team : 0, wait:netWaiting(), sty:SERVES.indexOf(G.serverP ? G.serverP.serveType || 'volley' : 'volley'), mt:Math.round(G.matchT), r:G.rally,
    b:[r3(b.x), r3(b.y), r3(b.z), TYPES.indexOf(b.type), b.live ? 1 : 0, b.hitCount, b.lastHitter, b.serveSign, BALL_IDS.indexOf(b.skin || 'ball_classic')], ct:COURT_IDS.indexOf(G.court),
    p:G.players.map(p => [r3(p.x), r3(p.y), r3(p.swing), r3(p.run), p.moving ? 1 : 0, Math.round(p.energy), ARMS.indexOf(p.armed), p.charging ? 1 : 0, r3(p.charge), r3(p.meterT), r3(p.meterQ), r3(p.jumpT || 0), Math.round(p.stamina ?? 100), p.sprinting ? 1 : 0]),
    ev:G.netEv.splice(0) };
}
function guestSnap(m){
  m.rt = performance.now() / 1000;
  NW.snaps.push(m); if (NW.snaps.length > 40) NW.snaps.shift();
  for (const ev of m.ev || []) applyEvent(ev);
}
function applyEvent(ev){
  switch (ev.k){
    case 'sfx': playSfx(ev.n); break;
    case 'txt': G.texts.push(ev.t); break;
    case 'ring': G.rings.push(ev.r); break;
    case 'fx': hitFx(ev.type, ev.x, ev.y, ev.z, true); break;
    case 'shake': if (data.opts.shake) G.shake = Math.max(G.shake, ev.v); if (ev.v >= .28) G.punch = .3; break;
    case 'pf': G.whiteFlash = .14; break;
    case 'dust': dustPuff(ev.x, ev.y, ev.big, true); break;
    case 'toast': if (ev.c) showCall(ev.a); else showToast(ev.a, ev.b); break;
    case 'call': showCall(ev.c, ev.sv, ev.n); break;
    case 'pt': playSfx(ev.w === myTeam() ? 'point' : 'lose'); break;
    case 'over': { const last = NW.snaps[NW.snaps.length - 1]; if (last) G.score = last.sc.slice(); showResult(ev.w, ev.sc); break; }
  }
}
function guestInterp(){
  const S = NW.snaps; if (!S.length) return;
  const rt = performance.now() / 1000 - .065;
  let a = S[0], b = S[S.length - 1];
  for (let i = S.length - 1; i > 0; i--){ if (S[i - 1].rt <= rt){ a = S[i - 1]; b = S[i]; break; } }
  const k = b.rt > a.rt ? clamp((rt - a.rt) / (b.rt - a.rt), 0, 1) : 1;
  G.players.forEach((p, i) => {
    const A = a.p[i], B = b.p[i]; if (!A || !B) return;
    if (i === NW.you && G.state !== 'replay'){
      const Z = S[S.length - 1].p[i];
      NW.auth = [Z[0], Z[1]];
      p.swing = Math.max(p.swing, B[2]); p.energy = B[5]; p.armed = ARMS[B[6]] || 'drive';
      return;
    }
    const kk = Math.hypot(B[0] - A[0], B[1] - A[1]) > 2.5 ? 1 : k;
    p.x = lerp(A[0], B[0], kk); p.y = lerp(A[1], B[1], kk); p.swing = B[2]; p.run = lerp(A[3], B[3], kk); p.moving = !!B[4];
    p.energy = B[5]; p.armed = ARMS[B[6]] || 'drive'; p.charging = !!B[7]; p.charge = B[8]; p.meterT = B[9]; p.meterQ = B[10]; p.jumpT = B[11] || 0;
    p.stamina = B[12] ?? 100; p.sprinting = !!B[13];
  });
  const A = a.b, B = b.b, bb = G.ball;
  const kk = (A[4] !== B[4] || A[5] !== B[5] || Math.hypot(B[0] - A[0], B[1] - A[1]) > 3) ? 1 : k;
  if (bb.hitCount !== B[5]) G.trail.length = 0;
  bb.vx = (B[0] - A[0]) / Math.max(.01, b.rt - a.rt); bb.vy = (B[1] - A[1]) / Math.max(.01, b.rt - a.rt);
  bb.x = lerp(A[0], B[0], kk); bb.y = lerp(A[1], B[1], kk); bb.z = lerp(A[2], B[2], kk);
  bb.type = TYPES[B[3]] || 'drive'; bb.live = !!B[4]; bb.hitCount = B[5]; bb.lastHitter = B[6]; bb.serveSign = B[7]; bb.skin = BALL_IDS[B[8]] || 'ball_classic';
  const last = S[S.length - 1];
  if (G.state !== 'over') G.state = last.s;
  if (COURT_IDS[last.ct]) G.court = COURT_IDS[last.ct];
  G.lastWin = last.lw || 0; G.replayLabel = last.rl || '';
  if (last.ce && last.s === 'point' && !(G.cele && G.cele.live)){ G.cele = { team:last.ce, start:G.time, live:true }; const mine = team(last.ce).find(p => p.human && !p.human.remote); if (mine && musicOn() && actx) startTrack(IT((mine.look && mine.look.dance) || 'dance_pump').style || 'pump', { seconds:1.6, vol:.32 }); }
  if (!last.ce && G.cele && G.cele.live) G.cele = null;
  G.serverP = G.players[last.sp] || null; if (G.serverP) G.serverP.serveType = SERVES[last.sty] || 'volley'; G.recvP = G.players[last.rp] || null; G.serveNum = last.sn || 1; G.server = last.sv; G.rally = last.r;
  if (typeof last.mt === 'number' && Math.abs(last.mt - G.matchT) > 1.5) G.matchT = last.mt;
  if (last.sc[0] !== G.score[0] || last.sc[1] !== G.score[1]){ G.score = last.sc.slice(); updateHUD(); }
  while (S.length > 2 && S[1].rt < rt) S.shift();
}
function netInput(force){
  const me = G.players[NW.you]; if (!me) return;
  const now = performance.now() / 1000;
  const x = r3(me.inX), y = r3(me.inY), h = NW.hit ? 1 : 0, sp = me.human && wantsSprint(me) ? 1 : 0;
  const changed = x !== NW.sx || y !== NW.sy || h !== NW.sh || sp !== NW.ss || NW.arms.length > 0;
  if (!force && now - NW.lastIn < (changed ? 1 / 60 : .25)) return;
  NW.lastIn = now; NW.sx = x; NW.sy = y; NW.sh = h; NW.ss = sp;
  netSend({ t:'in', x, y, h, s:sp, a:NW.arms.splice(0) });
}
function guestTick(dt){
  G.time += dt;
  if (G.state !== 'over') G.matchT = (G.matchT || 0) + dt;
  const me = G.players[NW.you];
  if (me && me.human){
    if (screenNow === 'game') readInput(me); else { me.inX = me.inY = 0; }
    const frozen = G.state === 'serve' && G.serverP === me;
    if (G.state === 'replay'){ me.moving = false; }           // the host's replay moves everyone
    else if (frozen){ me.vx = me.vy = 0; me.moving = false; if (NW.auth){ me.x = NW.auth[0]; me.y = NW.auth[1]; } }
    else {
      updateStamina(me, wantsSprint(me) && Math.hypot(me.inX, me.inY) > .25, dt);
      movePlayer(me, me.inX, me.inY, dt, 5.2 * (me.sprinting ? SPRINT.mult : 1));
      if (NW.auth){
        const ex = NW.auth[0] - me.x, ey = NW.auth[1] - me.y;
        if (Math.hypot(ex, ey) > 1.6){ me.x = NW.auth[0]; me.y = NW.auth[1]; }
        else { const k = Math.min(1, dt * (me.moving ? 1.2 : 7)); me.x += ex * k; me.y += ey * k; }
      }
    }
    if (me.charging) me.charge = Math.min(PMAX, me.charge + dt / (METER_T[data.opts.meter] || .8));
    if (me.meterT > 0 && !me.charging) me.meterT -= dt;
  }
  netInput(false);
  tickEffects(dt);
}

