/* ---------- shop ---------- */
const RARITY = { common:'#9aa4b4', rare:'#38bdf8', epic:'#c084fc', legendary:'#f5c542' };
const rarity = it => !it.price ? 'common' : it.price <= 300 ? 'rare' : it.price <= 800 ? 'epic' : 'legendary';
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
function drawShop(t){
  for (const cv2 of $$('.shopPv')){
    const id = cv2.dataset.id, slot = cv2.dataset.slot;
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
function renderCtrl(){
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

