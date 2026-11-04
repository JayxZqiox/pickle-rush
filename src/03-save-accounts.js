/* ---------- local save ---------- */
const KEY = 'pickleRush.v3';
const ACTIONS = [['up','Move up'],['down','Move down'],['left','Move left'],['right','Move right'],['sprint','Sprint (hold)'],['hit','Hit / serve (hold)'],['slice','Slice'],['curve','Curve'],['dink','Dink'],['spike','Spike']];
const DEF_BINDS = {
  p1:{ up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', sprint:'ShiftLeft', hit:'Space', slice:'KeyQ', curve:'KeyE', dink:'KeyR', spike:'KeyT' },
  p2:{ up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', sprint:'ShiftRight', hit:'Enter', slice:'KeyK', curve:'KeyL', dink:'KeyI', spike:'KeyO' },
  p3:{ up:'Numpad8', down:'Numpad5', left:'Numpad4', right:'Numpad6', sprint:'NumpadAdd', hit:'Numpad0', slice:'Numpad1', curve:'Numpad2', dink:'Numpad3', spike:'NumpadDecimal' },
  p4:{ up:'KeyY', down:'KeyH', left:'KeyG', right:'KeyJ', sprint:'KeyF', hit:'KeyB', slice:'KeyV', curve:'KeyN', dink:'KeyM', spike:'KeyU' },
};
const DEF = { p1:{ name:'Player 1', gender:'boy', skin:1, hair:0, hairStyle:'short' },
  p2:{ name:'Player 2', gender:'girl', skin:0, hair:1, hairStyle:'ponytail', equip:{ head:'head_none', top:'tee_blue', bottom:'shorts_black', shoes:'sneak_black', paddle:'pad_wood', ball:'ball_classic' } },
  bestRally:0, sound:true, binds:JSON.parse(JSON.stringify(DEF_BINDS)), opts:{ meter:'normal', swing:'auto', touch:'normal', shake:true, gfx:'auto', fps:false, fullscreen:true, camera:'classic', music:true, customCourt:'random' },
  localAcc:null, token:null };
const clone = o => JSON.parse(JSON.stringify(o));
function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw){
      const d = JSON.parse(raw), out = Object.assign(clone(DEF), d);
      out.p1 = Object.assign(clone(DEF.p1), d.p1 || {}); out.p2 = Object.assign(clone(DEF.p2), d.p2 || {});
      out.binds = {}; for (const k of ['p1','p2','p3','p4']) out.binds[k] = Object.assign(clone(DEF_BINDS[k]), (d.binds || {})[k] || {});
      out.opts = Object.assign(clone(DEF.opts), d.opts || {});
      for (const k of ['p1', 'p2']){ const st = CAT.HAIR_STYLES[out[k].gender] || CAT.HAIR_STYLES.boy; if (!st.includes(out[k].hairStyle)) out[k].hairStyle = st[0]; }
      out.p2.equip = Object.assign(clone(DEF.p2.equip), out.p2.equip || {});
      if (out.localAcc) out.localAcc = CAT.normalize(out.localAcc);
      return out;
    }
    // carry over a profile from the older single-file version
    const old = JSON.parse(localStorage.getItem('pickleRush.v1') || 'null');
    if (old){
      const out = clone(DEF);
      if (old.p1) out.p1 = Object.assign(out.p1, old.p1); if (old.p2) out.p2 = Object.assign(out.p2, old.p2);
      out.bestRally = old.bestRally || 0; out.sound = old.sound !== false;
      return out;
    }
  } catch (e) {}
  return clone(DEF);
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
let data = load();
const METER_T = { slow:1.05, normal:.8, fast:.6 };

/* ---------- server API + accounts ---------- */
const ACC = { server:false, checked:false, user:null, board:[], boardT:0 };
async function api(path, body){
  const headers = { 'Content-Type':'application/json' };
  if (data.token) headers.Authorization = 'Bearer ' + data.token;
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const err = new Error(j.error || 'Something went wrong. Try again.'); err.status = r.status; throw err; }
  return j;
}
async function detectServer(){
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch('api/health', { signal:ctl.signal, cache:'no-store' }); clearTimeout(to);
    const j = await r.json();
    ACC.server = !!(j && j.ok && j.game === 'pickle-rush'); ACC.temporary = !!(j && j.temporary);
  } catch (e) { ACC.server = false; }
  ACC.checked = true;
  if (ACC.server && data.token){
    try { ACC.user = (await api('api/me')).user; loadModList(); } catch (e) { if (e.status === 401){ data.token = null; save(); } }
  }
  if (screenNow === 'gate' && isServerAcc()) show('s-menu');
  refreshAll();
}
const isServerAcc = () => !!(ACC.server && ACC.user);
function getAcc(){ return isServerAcc() ? ACC.user : data.localAcc; }
// errors on real phones and browsers are sent to the server log, so problems can be fixed
let errSent = 0;
function reportError(msg, at){ if (errSent++ > 4) return; try { fetch('api/clientError', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ msg:String(msg || '').slice(0, 300), at:at || '', ua:navigator.userAgent, page:typeof screenNow === 'string' ? screenNow : '' }) }).catch(() => {}); } catch (e) {} }
window.addEventListener('error', e => reportError(e.message, String(e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', e => reportError('Promise: ' + ((e.reason && e.reason.message) || e.reason), ''));
if (data.localAcc){
  CAT.normalize(data.localAcc); const sr = CAT.seasonRoll(data.localAcc); if (sr) data.localAcc.seasonNote = sr; CAT.ensureChallenges(data.localAcc);
  if (data.localAcc.open) setTimeout(() => { const d = settleLocalQuit(data.localAcc); if (d !== null) addNotif({ type:'info', text:`Your unfinished ranked match counted as a loss (${d} rating)` }); }, 1500);
}
if (data.bestRally){ if (data.localAcc && !(data.localAcc.bestRally >= data.bestRally)) data.localAcc.bestRally = data.bestRally; data.bestRally = 0; }
function ensureLocal(){
  if (!data.localAcc){ data.localAcc = Object.assign({ name:'Guest' + (100 + Math.floor(Math.random() * 900)) }, CAT.newProgress()); save(); }
  return data.localAcc;
}
function myName(){ const a = getAcc(); return (a && (a.username || a.name)) || data.p1.name || 'Player 1'; }
const myLevel = () => { const a = getAcc(); return a ? CAT.levelInfo(a.xp).level : 1; };
function myLook(){ const a = getAcc(); return Object.assign({}, data.p1, CAT.DEFAULT_EQUIP, a ? a.equip : {}, { title:(a && a.title) || '', titleN:a && a.title ? ((a.trophies || {})[a.title] || 0) : 0 }); }
// the title someone wears ("Singles Grand Slam Champion"); AI players have their own
function titleOf(p){ if (p && p.titleTxt) return p.titleTxt; const lk = p && (p.look || p); return lk && lk.title ? CAT.titleName(lk.title, lk.titleN) : ''; }
function p2Look(){ return Object.assign({}, data.p2, CAT.DEFAULT_EQUIP, data.p2.equip || {}); }
const elo = CAT.elo;
/* buying, equipping and rewards: the server decides for accounts, this browser for anonymous players */
async function progBuy(id){
  if (isServerAcc()){ ACC.user = (await api('api/buy', { id })).user; return; }
  const e = CAT.buy(ensureLocal(), id); if (e) throw new Error(e); save();
}
async function progEquip(slot, id){
  if (slot === 'p2'){ return; }
  STAGE.pose = performance.now() / 1000;
  if (slot === 'dance') previewDance(id);
  if (isServerAcc()){ ACC.user = (await api('api/equip', { slot, id })).user; }
  else { const e = CAT.equip(ensureLocal(), slot, id); if (e) throw new Error(e); save(); }
  netHello();
}
/* match stats feed challenges and achievements */
function matchStats(){ const st2 = G.stats || {}; return { dinks:st2.dinks || 0, smashes:st2.smashes || 0, perfects:st2.perfect || 0, points:st2.points || 0, longRally:st2.longest || 0 }; }
async function progMatch(key, won, sc, doubles){
  if (isServerAcc()){
    const j = await api('api/ranked', { ai:key, won, score:sc, mode:doubles ? 'doubles' : 'singles', matchId:G.rankedId, stats:matchStats() });
    G.rankedId = null; ACC.user = j.user; handleProg(j.prog); return j.result;
  }
  const a = ensureLocal(); a.open = null;
  const r = CAT.applyMatch(a, key, won, sc, doubles); if (typeof r === 'string') throw new Error(r);
  const practice = CAT.isPractice(a.mmr, key);
  handleProg(CAT.trackStats(a, Object.assign(matchStats(), { matches:1, rankedWins:won && !practice ? 1 : 0, points:(G.score || [0])[myTeam() - 1] || 0 }))); save(); return r;
}
// ranked matches get a ticket from the server when they start; quitting one counts as a loss
async function startRanked(mode, diff){
  G.rankedId = null;
  if (isServerAcc()){
    try { const j = await api('api/ranked/start', { ai:diff, mode:mode === 'duo-ai' ? 'doubles' : 'singles' }); G.rankedId = j.matchId; ACC.user = j.user;
      if (j.quit) showToast('Your unfinished match counted as a loss', `${j.quit.delta} rating`); }
    catch (e){ showToast('This match won’t be ranked', e.message); }
  } else {
    const a = ensureLocal(); settleLocalQuit(a);
    a.open = { ai:diff, mode:mode === 'duo-ai' ? 'doubles' : 'singles', t:Date.now() }; save();
  }
}
function settleLocalQuit(a){
  if (!a || !a.open) return null;
  const o = a.open; a.open = null;
  const r = CAT.applyMatch(a, o.ai, false, 'Quit', o.mode === 'doubles'); if (typeof r === 'string') return null;
  if (r.practice){ save(); return 0; }
  a.mmr = Math.max(0, a.mmr - 10); if (a.history[0]){ a.history[0].delta -= 10; a.history[0].mmr = a.mmr; a.history[0].score = 'Quit'; }
  save(); return r.delta - 10;
}
async function quitRanked(){
  if (isServerAcc()){ try { const j = await api('api/ranked/abandon', { matchId:G.rankedId }); if (j.user) ACC.user = j.user; if (j.delta) showToast('Match counted as a loss', `${j.delta} rating`); } catch (e) {} G.rankedId = null; }
  else { const d = settleLocalQuit(getAcc()); if (d) showToast('Match counted as a loss', `${d} rating`); }
}
async function reportProgress(){
  const stats = Object.assign(matchStats(), { matches:1, online:G.mode === 'online' ? 1 : 0 });
  try {
    if (isServerAcc()){ const j = await api('api/progress', { stats, match:true }); ACC.user = j.user; handleProg(j.prog); }
    else { const a = ensureLocal(); handleProg(CAT.trackStats(a, stats)); save(); }
  } catch (e) {}
}
function handleProg(pr){
  if (!pr) return;
  for (const id of pr.challenges || []){ const c = CAT.CH_BY_ID[id]; if (!c) continue; showToast('✅ Challenge complete!', `${c.text} · +${c.coins} coins${c.keys ? ' +1 🔑' : ''}`); addNotif({ type:'info', text:`Challenge complete: ${c.text} (+${c.coins} coins${c.keys ? ', +1 key' : ''})` }); }
  for (const id of pr.achievements || []){ const a = CAT.ACHIEVEMENTS.find(x => x.id === id); if (!a) continue; setTimeout(() => showToast(`${a.icon} Achievement unlocked!`, `${a.name} · +${a.coins} coins${a.keys ? ` +${a.keys} 🔑` : ''}`), 1800); addNotif({ type:'info', text:`${a.icon} Achievement: ${a.name} (+${a.coins} coins${a.keys ? `, +${a.keys} keys` : ''})` }); }
}
function seasonInfo(){ const ends = CAT.seasonEnds(), days = Math.max(0, Math.ceil((ends - Date.now()) / 864e5)); return { id:CAT.seasonId(), days }; }
function noteSeason(a){
  const n = a && a.seasonNote; if (!n) return;
  addNotif({ type:'info', text:`Season ${n.from} ended: you finished ${n.tier} · +${n.coins} coins${n.keys ? `, +${n.keys} keys` : ''}. Your rating was soft-reset for the new season.` });
  showToast(`Season ${n.from} rewards`, `${n.tier} · +${n.coins} coins${n.keys ? ` +${n.keys} 🔑` : ''}`);
  a.seasonNote = null; if (!isServerAcc()) save();
}
let chTab = 'd';
function renderChallenges(a){
  if (!a) return;
  CAT.ensureChallenges(a);
  const list = chTab === 'd' ? a.ch.d : a.ch.w;
  const end = chTab === 'd' ? (() => { const t = new Date(); return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1); })() : (() => { const t = new Date(); const d0 = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()); return d0 + (7 - (t.getUTCDay() + 6) % 7) * 864e5; })();
  const hrs = Math.max(0, Math.round((end - Date.now()) / 36e5));
  setTxt('#chLeft', hrs >= 48 ? `New in ${Math.round(hrs / 24)} days` : `New in ${hrs} h`);
  $$('#chTabs button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === chTab));
  $('#chList').innerHTML = list.map(c => { const d = CAT.CH_BY_ID[c.id]; if (!d) return ''; const pc = Math.min(100, c.prog / d.n * 100);
    return `<div class="chRow ${c.done ? 'done' : ''}"><div class="font-semibold min-w-0 truncate">${c.done ? '✅ ' : ''}${esc(d.text)}</div><div class="text-sm font-bold whitespace-nowrap" style="color:#f5c542">${COIN_SVG} ${d.coins}${d.keys ? ' + 🔑' : ''}</div>
      <div class="chBar"><i style="width:${pc.toFixed(0)}%"></i></div><div class="text-xs text-[var(--muted)]">${Math.min(c.prog, d.n)} / ${d.n}</div></div>`; }).join('');
}
function renderAch(){
  const a = getAcc() || ensureLocal(); const got = new Set(a.ach || []);
  setTxt('#achTitle', `${got.size} of ${CAT.ACHIEVEMENTS.length} unlocked`);
  const si = seasonInfo(), hist = (a.seasons || []).slice(-4).reverse();
  $('#achSeason').innerHTML = `<div class="tile rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"><div><div class="font-display text-xl">Season ${si.id}</div><div class="text-sm text-[var(--muted)]">Ends in ${si.days} day${si.days === 1 ? '' : 's'}. Finish higher for bigger rewards (up to 3,000 coins + 4 🔑 for World-best). Ratings soft-reset to 75% each season.</div></div>
    <div class="flex gap-2 flex-wrap">${hist.map(h => `<span class="lobbyTag">${esc(h.id)} · ${esc(h.tier)}</span>`).join('') || '<span class="text-sm text-[var(--muted)]">No past seasons yet</span>'}</div></div>`;
  $('#achGrid').innerHTML = CAT.ACHIEVEMENTS.map((x, i) => `<div class="achCard ${got.has(x.id) ? 'on' : 'off'}" style="animation-delay:${Math.min(i, 12) * .03}s"><div class="ai">${x.icon}</div><div class="min-w-0"><div class="font-bold">${esc(x.name)}</div><div class="text-xs text-[var(--muted)]">${esc(x.desc)}</div><div class="text-xs font-bold mt-1" style="color:#f5c542">${got.has(x.id) ? '✓ Unlocked' : `+${x.coins} coins${x.keys ? ` · +${x.keys} 🔑` : ''}`}</div></div></div>`).join('');
}
let lastRallyRew = 0;
async function progRally(n){
  if (isServerAcc()){ const j = await api('api/rally', { returns:n }); ACC.user = j.user; return j.result; }
  const a = ensureLocal(); if (n > (a.bestRally || 0)) a.bestRally = n;
  let r = null; if (n > 0 && Date.now() - lastRallyRew > 8000){ lastRallyRew = Date.now(); r = CAT.addRewards(a, CAT.rallyRewards(n)); handleProg(CAT.trackStats(a, { longRally:Math.min(n, 200) })); }
  save(); return r;
}
async function loadBoard(){
  if (!ACC.server){ ACC.board = []; return; }
  try { ACC.board = (await api('api/leaderboard')).rows || []; ACC.boardT = Date.now(); } catch (e) {}
  if (screenNow === 'rank') renderRank();
}
let lookTimer = 0;
function syncLook(){ if (!ACC.server || !ACC.user) return; clearTimeout(lookTimer); lookTimer = setTimeout(() => api('api/look', { look:data.p1 }).then(j => { ACC.user = j.user; }).catch(() => {}), 600); }
function refreshAll(){
  if (screenNow === 'gate') renderGate();
  if (screenNow === 'shop') renderShop();
  if (screenNow === 'menu') refreshMenu();
  if (screenNow === 'rank') renderRank();
  if (screenNow === 'signup') renderSignup();
  if (screenNow === 'online') renderOnline();
}

