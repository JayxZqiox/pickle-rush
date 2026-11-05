/* ---------- shop ---------- */
const RARITY = { common:'#9aa4b4', rare:'#38bdf8', epic:'#c084fc', legendary:'#f5c542' };
const rarity = it => CAT.rarityOf(it);       // the item's own rarity (falls back to its price)
const COIN_SVG = '<svg class="inline-block align-[-3px]" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#f5c542" stroke="#9a6b00" stroke-width="1.5"/><path d="M8 4.2v7.6M5.8 6.2h3.4a1.4 1.4 0 0 1 0 2.8H6.8a1.4 1.4 0 0 0 0 2.8h3.4" stroke="#7a5200" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';
let shopTab = 'outfit', shopSub = 'top', shopFrom = 'menu';
const pips = n => '●'.repeat(n) + '○'.repeat(Math.max(0, 2 - n));
const FX_NAME = { none:'Plain', fire:'Flame trail', ice:'Frost sparkles', lightning:'Electric bolts', rainbow:'Color trail', galaxy:'Starry trail', gold:'Golden glitter' };
const STYLE_NAME = { none:'', band:'Headband', cap:'Cap', capback:'Cap, worn backwards', visor:'Visor', bucket:'Bucket hat', beanie:'Beanie', crown:'Crown', tee:'T-shirt', polo:'Polo', tank:'Tank top', jersey:'Jersey', hoodie:'Hoodie', kit:'Pro kit', shorts:'Shorts', skirt:'Skirt', long:'Long shorts', track:'Track shorts', sneaker:'Sneakers', runner:'Runners', hightop:'High-tops' };
function statLine(i){
  if (i.slot === 'paddle') return `Power ${pips(i.power)} · Control ${pips(i.control)} · Spin ${pips(i.spin)}`;
  if (i.slot === 'ball') return FX_NAME[i.fx] || '';
  if (i.slot === 'partner') return `Speed ${i.speed.toFixed(1)} · Accuracy ${Math.round(i.acc * 100)}%`;
  if (i.slot === 'court') return i.price ? 'New arena' : 'Home court';
  if (i.slot === 'wrist') return i.c1 ? 'Wristband' : 'Bare wrists';
  if (i.slot === 'hairx') return i.style ? (i.glow ? 'Glowing hairstyle' : 'Special hairstyle') : 'Uses your own hairstyle';
  if (i.slot === 'dance') return '♪ Original beat · tap the picture to hear it';
  return STYLE_NAME[i.style] || '';
}
function renderShop(){
  const a = getAcc() || ensureLocal(), lv = CAT.levelInfo(a.xp).level;
  $('#shopCoins').textContent = a.coins; $('#shopLevel').textContent = `Lv ${lv}`;
  $$('#shopTabs button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === shopTab));
  $$('#shopSub button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === shopSub));
  $('#shopSub').classList.toggle('hidden', shopTab !== 'outfit');
  setTxt('#shopKeys', String(a.keys | 0));
  if (shopTab === 'chest'){ renderChests(a); return; }
  const slot = shopTab === 'outfit' ? shopSub : shopTab;
  $('#shopGrid').innerHTML = itemsOf(slot).map(i => {
    const owned = a.owned.includes(i.id), eqd = a.equip[slot] === i.id, low = lv < i.lvl;
    let btn;
    if (eqd) btn = `<button class="tile rounded-xl py-2 font-bold w-full" disabled>Equipped</button>`;
    else if (owned) btn = `<button data-act="shopEquip" data-slot="${slot}" data-id="${i.id}" class="tile rounded-xl py-2 font-bold w-full">Equip</button>`;
    else if (i.chest) btn = `<button data-act="shopTab" data-v="chest" class="tile rounded-xl py-2 font-bold w-full">🎁 From chests</button>`;
    else if (i.tour) btn = `<button data-act="tour" class="tile rounded-xl py-2 font-bold w-full" style="color:#f5c542">🏆 Win the ${esc(CAT.CUP_BY[i.tour].name)}</button>`;
    else if (low) btn = `<button class="tile rounded-xl py-2 font-bold w-full" disabled>🔒 Level ${i.lvl}</button>`;
    else btn = `<button data-act="shopBuy" data-id="${i.id}" class="primary rounded-xl py-2 font-bold w-full" ${a.coins < i.price ? 'disabled' : ''}>${COIN_SVG} ${i.price}</button>`;
    const rk = rarity(i);
    return `<div class="rcard r-${rk}"><span class="rtag">${rk.toUpperCase()}</span><canvas class="shopPv w-full h-[120px] rounded-xl" data-id="${i.id}" data-slot="${slot}" ${slot === 'dance' ? `data-act="dancePreview" style="cursor:pointer"` : ''}></canvas>
      <div class="font-bold truncate">${esc(i.name)}</div><div class="text-xs text-[var(--muted)] min-h-[16px]">${statLine(i)}</div>${btn}</div>`;
  }).join('');
}
function fitCanvas(cv2){
  const r = rectOf(cv2); if (!r.width) return false;
  const w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
  if (cv2.width !== w || cv2.height !== h){ cv2.width = w; cv2.height = h; }
  return true;
}
/* Previews are drawn once when they scroll into view; only the card under the pointer keeps animating.
   (Drawing ~200 previews every frame was what made the shop lag.) */
let FLAG_VER = 0, shopObs = null;
function watchOne(cv2){
  const card = cv2.closest('.rcard, .chestCard') || cv2;
  card.addEventListener('pointerenter', () => { cv2._hot = true; }); card.addEventListener('pointerleave', () => { cv2._hot = false; cv2._drawn = false; });
  if (!('IntersectionObserver' in window)) return;
  if (!shopObs) shopObs = new IntersectionObserver(es => es.forEach(e => { e.target._vis = e.isIntersecting; if (e.isIntersecting) e.target._drawn = false; }), { root:null, rootMargin:'120px' });
  shopObs.observe(cv2);
}
function drawShop(t){
  const noObs = !('IntersectionObserver' in window);
  for (const cv2 of $$('.shopPv')){
    const id = cv2.dataset.id, slot = cv2.dataset.slot;
    if (!cv2._obs){ cv2._obs = true; watchOne(cv2); }
    if (!noObs && !cv2._vis) continue;
    const animated = cv2._hot || slot === 'chestArt';
    if (cv2._drawn && !animated && cv2._fv === FLAG_VER) continue;
    cv2._drawn = true; cv2._fv = FLAG_VER;
    if (!animated) t = .4;                           // a nice still frame
    if (['head', 'top', 'bottom', 'shoes', 'wrist', 'hairx'].includes(slot)) drawPreview(cv2, Object.assign(myLook(), { [slot]:id }), 'front', t, '');
    else if (slot === 'chestArt') drawChestArt(cv2, id, t);
    else if (slot === 'dance') drawStage(cv2, myLook(), t, { facing:'front', noCone:true, dance:{ id, t:t % 4 } });
    else if (slot === 'partner') drawPreview(cv2, MATE_LOOK[id] || myLook(), 'front', t, '');
    else if (!fitCanvas(cv2)) continue;
    else if (slot === 'ball') previewBall(cv2, id, t);
    else if (slot === 'court') previewCourt(cv2, id);
    else if (slot === 'paddle') previewPaddle(cv2, id);
  }
}
$('#cName').addEventListener('input', saveName);
$('#titleSel').addEventListener('change', async e => {
  const id = e.target.value;
  try {
    if (isServerAcc()){ const j = await api('api/title', { id }); ACC.user = j.user; }
    else { const a = ensureLocal(), err = CAT.setTitle(a, id); if (err) throw new Error(err); save(); }
    showToast(id ? 'Title on' : 'Title off', id ? '🏆 ' + CAT.titleName(id) : 'Your name shows on its own');
  } catch (er){ showToast('Couldn’t change title', er.message); }
});
for (const k of ['volMusic', 'volSfx', 'volVoice']) $('#' + k).addEventListener('input', e => { data.opts[k] = +e.target.value; setTxt('#' + k + 'V', e.target.value + '%'); applyVolumes(); save(); });
$('#volSfx').addEventListener('change', () => { ensureAudio(); playSfx('perfect'); });
$('#volVoice').addEventListener('change', () => { ensureAudio(); if (data.sound && 'speechSynthesis' in window && volOf('volVoice') > 0){ try { const u = new SpeechSynthesisUtterance('15, 14, 2'); u.volume = .9 * volOf('volVoice'); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} } });
/* motion: a soft ripple from wherever you press a button or card */
document.addEventListener('pointerdown', e => {
  const host = e.target.closest && e.target.closest('button, .tile, .modeCard, .navBtn, .rcard, .chestCard, .cupCard');
  if (!host || host.disabled || host.closest('#touch, #hud, #ctrlBtns, #bellBtn') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (getComputedStyle(host).position === 'static') host.classList.add('ripHost');
  let w = host.querySelector(':scope > .ripWrap'); if (!w){ w = document.createElement('span'); w.className = 'ripWrap'; host.appendChild(w); }
  const r = host.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('i');
  s.className = 'rip'; s.style.cssText = `left:${e.clientX - r.left}px; top:${e.clientY - r.top}px; width:${d}px; height:${d}px`;
  w.appendChild(s); setTimeout(() => s.remove(), 650);
}, { passive:true });
// motion: the login hero leans toward the pointer
for (const el of $$('.authHero')){
  el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.rotate = `${-y} ${x} 0 ${Math.min(7, Math.hypot(x, y) * 12).toFixed(2)}deg`; });
  el.addEventListener('pointerleave', () => { el.style.rotate = ''; });
}
$('#teName').addEventListener('input', () => { if (!$('#teGo').disabled) setTxt('#teErr', ''); });
$('#teName').addEventListener('keydown', e => { if (e.key === 'Enter') entryGo(); });
$('#rmCourt').addEventListener('change', e => netSend({ t:'court', v:e.target.value }));
$('#rmTour').addEventListener('change', e => netSend({ t:'tourMode', v:e.target.value }));
$('#heightIn').addEventListener('input', e => { data[editWho].height = +e.target.value; setTxt('#heightVal', `${e.target.value} cm`); save(); if (editWho === 'p1') syncLook(); });
$('#nationSel').addEventListener('change', e => { data[editWho].nation = e.target.value; $('#nationFlag').innerHTML = flagHTML(e.target.value, 20); save(); if (editWho === 'p1') syncLook(); });
{ const pv = $('#pvBig');
  pv.addEventListener('pointerdown', e => { STAGE.drag = { x:e.clientX, a:STAGE.ang }; try { pv.setPointerCapture(e.pointerId); } catch (_) {} });
  pv.addEventListener('pointermove', e => { if (STAGE.drag) STAGE.ang = STAGE.drag.a + (e.clientX - STAGE.drag.x) * .012; });
  const end = () => { STAGE.drag = null; }; pv.addEventListener('pointerup', end); pv.addEventListener('pointercancel', end); }

/* ---------- settings + key binding ---------- */
let ctrlSet = 'p1', REB = null;
let setTab = 'video';
function renderCtrl(){
  $$('#setTabs button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === setTab));
  $$('.setPane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== setTab));
  for (const k of ['volMusic', 'volSfx', 'volVoice']){ const v = data.opts[k] == null ? 100 : data.opts[k], el = $('#' + k); if (document.activeElement !== el) el.value = v; setTxt('#' + k + 'V', v + '%'); }
  $$('#ctrlTabs button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === ctrlSet));
  const bs = data.binds[ctrlSet];
  $('#bindList').innerHTML = ACTIONS.map(([a, label]) => {
    const wait = REB && REB.set === ctrlSet && REB.act === a;
    return `<div class="flex items-center justify-between gap-2 py-1"><span class="font-semibold">${label}</span><button data-act="bind" data-a="${a}" class="kbd ${wait ? 'wait pulse' : ''}">${wait ? 'Press a key' : esc(keyName(bs[a]))}</button></div>`;
  }).join('');
  $('#ctrlLead').textContent = ctrlSet === 'p1' ? 'Tap a key, then press the new key. Esc cancels. Player 1 also gets the Player 2 keys when playing alone.' : 'Tap a key, then press the new key. Esc cancels.';
  $$('#optMeter button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === data.opts.meter));
  $$('#optSwing button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === data.opts.swing));
  $$('#optTouch button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === data.opts.touch));
  $('#optCourt').innerHTML = ['random', ...COURT_IDS].map(k => `<button data-act="opt" data-k="customCourt" data-v="${k}" class="${(data.opts.customCourt || 'random') === k ? 'chip-on' : ''}">${k === 'random' ? '🎲 Random' : esc(IT(k).name)}</button>`).join('');
  $$('#optTags button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === (data.opts.nameTags || 'auto')));
  $$('#optCam button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === (data.opts.camera || 'classic')));
  $$('#optGfx button').forEach(b => b.classList.toggle('chip-on', b.dataset.v === (data.opts.gfx || 'auto')));
  $('#optFps').classList.toggle('chip-on', !!data.opts.fps);
  $('#optFull').classList.toggle('chip-on', data.opts.fullscreen !== false);
  $('#optDance').classList.toggle('chip-on', data.opts.pointDance !== false);
  $('#optReplay').classList.toggle('chip-on', data.opts.replays !== false);
  $('#optShake').classList.toggle('chip-on', !!data.opts.shake); $('#optSound').classList.toggle('chip-on', !!data.sound);
  $('#padInfo').textContent = padsSeen ? `${padsSeen} gamepad${padsSeen > 1 ? 's' : ''} connected. Gamepad 1 controls Player 1, gamepad 2 Player 2, and so on.` : 'Press any button on a gamepad to connect it.';
}
function assignBind(code){
  const { set, act } = REB, old = data.binds[set][act];
  for (const s of ['p1', 'p2', 'p3', 'p4']) for (const [a] of ACTIONS) if (data.binds[s][a] === code && !(s === set && a === act)) data.binds[s][a] = old;
  data.binds[set][act] = code; save();
}

/* ---------- pause ---------- */
function renderPause(){
  const online = G.mode === 'online', host = G.netRole === 'host';
  $('#pauseNote').classList.toggle('hidden', !online);
  $('#pauseRestart').classList.toggle('hidden', online && !host);
  $('#pauseRestart').textContent = online ? 'Restart match for everyone' : 'Restart';
  $('#pauseQuit').textContent = online ? 'Leave match' : 'Main menu';
}
function togglePause(on){
  if (G.mode === 'demo') return;
  if (on && screenNow === 'game' && G.state !== 'over'){ if (G.mode !== 'online') G.paused = true; for (const p of localHumans()) p.charging = false; show('s-pause'); }
  else if (!on && screenNow === 'pause'){ G.paused = false; show(null); }
}

