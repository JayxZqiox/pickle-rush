/* ---------- online: LAN / server rooms ---------- */
const FAKE_LAG = Math.min(500, +(new URLSearchParams(location.search).get('lag') || 0));   // testing only: add ?lag=100 to the link
const NW = { ws:null, open:false, name:'', account:false, rooms:[], room:null, you:-1, mode:'1v1', hit:false, arms:[], lastIn:0, lastSt:0, snaps:[], ping:0, pingT:0, err:'' };
const SLOT_COL = ['#e8ff3d', '#ff8a5b', '#22d3ee', '#ff5c9a'];
function wsUrl(){ return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
/* rejoin info survives a page reload for a short time, so a dropped phone can get its slot back */
const REJOIN_KEY = 'pickleRush.rejoin';
function saveRejoin(){ try { if (NW.room && NW.rid) localStorage.setItem(REJOIN_KEY, JSON.stringify({ code:NW.room.code, rid:NW.rid, t:Date.now() })); } catch (e) {} }
function loadRejoin(){ try { const r = JSON.parse(localStorage.getItem(REJOIN_KEY) || 'null'); return r && Date.now() - r.t < 40000 ? r : null; } catch (e) { return null; } }
function clearRejoin(){ try { localStorage.removeItem(REJOIN_KEY); } catch (e) {} NW.rid = null; }
function netConnect(){
  if (!ACC.server || NW.ws) return;
  let ws; try { ws = new WebSocket(wsUrl()); } catch (e) { return; }
  NW.ws = ws; NW.lastMsg = performance.now();
  ws.onopen = () => {
    NW.open = true; NW.lastMsg = performance.now(); netHello(); renderOnline();
    const rj = NW.reconnecting ? { code:NW.reconnecting.code, rid:NW.reconnecting.rid } : NW.rejoinOnLoad;
    if (rj){ netSend({ t:'rejoin', code:rj.code, rid:rj.rid }); NW.rejoinOnLoad = null; }
    else if (NW.autoJoin){ netSend({ t:'join', code:NW.autoJoin }); NW.autoJoin = null; }
  };
  ws.onmessage = e => { NW.lastMsg = performance.now(); let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (FAKE_LAG) setTimeout(() => netMsg(m), FAKE_LAG); else netMsg(m); };
  ws.onclose = () => {
    const was = NW.room; NW.ws = null; NW.open = false;
    if (was && !NW.leaving){
      // unexpected drop: keep the match, try to get back in for up to 30 seconds
      if (!NW.reconnecting) NW.reconnecting = { code:was.code, rid:NW.rid, since:performance.now() };
      setNetBanner('Connection lost · reconnecting…');
      if (performance.now() - NW.reconnecting.since > 30000){ NW.reconnecting = null; setNetBanner(''); clearRejoin(); leaveOnline('Couldn’t reconnect to the server.'); return; }
      setTimeout(netConnect, 1000);
      return;
    }
    NW.leaving = false;
    renderOnline();
    setTimeout(() => { if (['online', 'room'].includes(screenNow) || ACC.user) netConnect(); }, 2000);
  };
}
/* ---------- profiles, friends, invites, daily bonus ---------- */
/* ---------- chests: a spinning reel picks the prize (the server rolls it for accounts) ---------- */
const CH = { busy:false, last:null, chest:null, key:false };
const RAR_LABEL = { common:'Common', rare:'Rare', epic:'Epic', legendary:'Legendary' };
function renderChests(a){
  $('#shopGrid').innerHTML = CAT.CHESTS.map(ch => {
    const gold = ch.id === 'chest_gold', rk = gold ? 'legendary' : 'rare';
    return `<div class="chestCard r-${rk}" style="grid-column:1 / -1"><canvas class="shopPv" data-id="${ch.id}" data-slot="chestArt"></canvas>
      <div class="min-w-0 flex flex-col gap-2"><div class="font-display text-2xl">${esc(ch.name)}</div>
      <div class="text-sm text-[var(--muted)]">Balls, courts, special hair and chest-only outfits. Duplicates turn into coins.</div>
      <div class="odds">${['common', 'rare', 'epic', 'legendary'].map(r => `<span style="color:${RARITY[r]}">${RAR_LABEL[r]} ${Math.round(ch.odds[r] * 100)}%</span>`).join('')}</div>
      <div class="flex gap-2 flex-wrap mt-auto">
        <button data-act="chestOpen" data-id="${ch.id}" class="primary rounded-xl px-4 py-2.5 font-bold" ${a.coins < ch.price ? 'disabled' : ''}>Open · ${COIN_SVG} ${ch.price}</button>
        ${ch.keys ? `<button data-act="chestOpen" data-id="${ch.id}" data-key="1" class="tile rounded-xl px-4 py-2.5 font-bold" ${(a.keys | 0) < 1 ? 'disabled' : ''}>Use a key 🔑 (${a.keys | 0})</button>` : ''}
      </div></div></div>`;
  }).join('') + `<div class="text-sm text-[var(--muted)]" style="grid-column:1 / -1">You get a free chest key every time you level up. Collection: ${CAT.CHEST_POOL.filter(i => a.owned.includes(i.id)).length}/${CAT.CHEST_POOL.length} chest items.</div>`;
}
function drawChestArt(cv2, id, t){
  if (!fitCanvas(cv2)) return;
  const c = cv2.getContext('2d'), W = cv2.width / DPR, H = cv2.height / DPR, gold = id === 'chest_gold';
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 8 + Math.sin(t * 2) * 3, w = Math.min(W * .62, 120), h = w * .62;
  const glow = c.createRadialGradient(cx, cy, 0, cx, cy, w); glow.addColorStop(0, gold ? 'rgba(245,197,66,.45)' : 'rgba(56,189,248,.35)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, H);
  const body = gold ? ['#b7791f', '#7c4a03'] : ['#8b5a2b', '#5a3816'], trim = gold ? '#fff3bf' : '#f5c542';
  let g = c.createLinearGradient(0, cy - h * .2, 0, cy + h * .5); g.addColorStop(0, body[0]); g.addColorStop(1, body[1]);
  c.fillStyle = g; rr(c, cx - w / 2, cy - h * .15, w, h * .65, 8); c.fill();
  g = c.createLinearGradient(0, cy - h * .6, 0, cy - h * .1); g.addColorStop(0, shade(body[0], .15)); g.addColorStop(1, body[0]);
  c.fillStyle = g; c.beginPath(); c.moveTo(cx - w / 2, cy - h * .12); c.quadraticCurveTo(cx - w / 2, cy - h * .62, cx, cy - h * .62); c.quadraticCurveTo(cx + w / 2, cy - h * .62, cx + w / 2, cy - h * .12); c.closePath(); c.fill();
  c.fillStyle = trim; for (const fx2 of [-.38, .38]) c.fillRect(cx + w * fx2 - 5, cy - h * .58, 10, h * 1.05);
  c.fillRect(cx - w / 2, cy - h * .17, w, 7); rr(c, cx - 11, cy - h * .25, 22, 26, 5); c.fill(); c.fillStyle = '#2b1a05'; ell(c, cx, cy - h * .12, 3.5, 5);
  for (let i = 0; i < 6; i++){ const k = (t * .35 + i / 6) % 1, x = cx + Math.sin(i * 7.3) * w * .55, y = cy - h * .3 - k * h; c.globalAlpha = (1 - k) * .9; c.fillStyle = gold ? '#fff3bf' : '#bfefff'; ell(c, x, y, 2, 2); }
  c.globalAlpha = 1;
}
function thumbOf(cv2, id){
  const it = IT(id), slot = it.slot;
  if (['top', 'bottom', 'hairx', 'head', 'shoes', 'wrist'].includes(slot)) drawPreview(cv2, Object.assign(myLook(), { [slot]:id }), 'front', 0, '');
  else if (slot === 'dance'){ drawStage(cv2, myLook(), .4, { facing:'front', noCone:true, dance:{ id, t:.4 } }); return; }
  else if (slot === 'partner'){ drawPreview(cv2, MATE_LOOK[id] || myLook(), 'front', 0, ''); return; }
  else if (!fitCanvas(cv2)) return;
  else if (slot === 'ball') previewBall(cv2, id, .4);
  else if (slot === 'court') previewCourt(cv2, id);
  else if (slot === 'paddle') previewPaddle(cv2, id);
  else if (slot === 'dance') drawStage(cv2, myLook(), .4, { facing:'front', noCone:true, dance:{ id, t:.4 } });
}
function rollFor(ch){
  let r = Math.random(), rar = 'common';
  for (const k of ['legendary', 'epic', 'rare', 'common']){ if (r < ch.odds[k]){ rar = k; break; } r -= ch.odds[k]; }
  const pool = CAT.CHEST_POOL.filter(i => CAT.rarityOf(i) === rar); return pool[(Math.random() * pool.length) | 0].id;
}
async function openChestUI(id, useKey){
  if (CH.busy) return;
  const ch = CAT.CHESTS.find(c => c.id === id); if (!ch) return;
  CH.busy = true; CH.chest = id; CH.key = useKey;
  let res;
  try {
    if (isServerAcc()){ const j = await api('api/chest', { id, key:useKey }); ACC.user = j.user; res = j.result; }
    else { const a = ensureLocal(); const r = CAT.openChest(a, id, useKey); if (typeof r === 'string') throw new Error(r); save(); res = r; }
  } catch (e){ CH.busy = false; showToast('Couldn’t open the chest', e.message); renderShop(); return; }
  CH.last = res;
  ensureAudio();
  $('#chestOv').classList.remove('hidden'); setTxt('#chestTitle', ch.name); setTxt('#chestTag', useKey ? 'OPENED WITH A KEY' : 'OPENING');
  $('#chestRes').innerHTML = ''; ['#chestEquip', '#chestAgain', '#chestClose'].forEach(sel => $(sel).classList.add('hidden'));
  const N = 46, WIN = 40, STEP = 126, ids = Array.from({ length:N }, (_, i) => i === WIN ? res.id : rollFor(ch));
  const reel = $('#reel');
  reel.innerHTML = ids.map((iid, i) => { const it = IT(iid), rk = CAT.rarityOf(it); return `<div class="rc r-${rk}" data-i="${i}"><canvas data-id="${iid}"></canvas><span>${esc(it.name)}</span></div>`; }).join('');
  reel.style.transition = 'none'; reel.style.transform = 'translateX(0px)';
  invalidateRects();
  requestAnimationFrame(() => {
    reel.querySelectorAll('canvas').forEach(cv2 => thumbOf(cv2, cv2.dataset.id));
    const win = $('.reelWin').clientWidth, target = WIN * STEP + 8 + 59 - win / 2 + (Math.random() - .5) * 70;
    void reel.offsetWidth;
    reel.style.transition = 'transform 5.4s cubic-bezier(.1,.75,.12,1)'; reel.style.transform = `translateX(${-target}px)`;
    let lastIdx = -1;
    const tick = () => {
      if (!CH.busy) return;
      const m = new DOMMatrixReadOnly(getComputedStyle(reel).transform), idx = Math.floor((-m.m41 + win / 2 - 8) / STEP);
      if (idx !== lastIdx){ lastIdx = idx; if (actx) mTone(actx.currentTime, 1500, .03, 'square', .035, actx.destination); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => {
      CH.busy = false;
      const card = reel.querySelector(`[data-i="${WIN}"]`); if (card) card.classList.add('win');
      const it = IT(res.id), rk = res.rarity;
      $('#chestRes').innerHTML = `<span class="lobbyTag" style="color:${RARITY[rk]}; border-color:${RARITY[rk]}">${RAR_LABEL[rk].toUpperCase()}</span><b style="color:${RARITY[rk]}">${esc(it.name)}</b>
        <div class="text-sm font-semibold text-[var(--muted)]">${res.dup ? `Already in your collection · +${res.refund} coins` : `New ${({ ball:'ball', court:'court', top:'shirt', bottom:'shorts', hairx:'hairstyle' })[it.slot] || 'item'} unlocked!`}</div>`;
      if (rk === 'epic' || rk === 'legendary') confetti();
      playSfx(rk === 'legendary' || rk === 'epic' ? 'win' : 'perfect');
      $('#chestEquip').classList.toggle('hidden', res.dup); $('#chestAgain').classList.remove('hidden'); $('#chestClose').classList.remove('hidden');
      if (res.dup || !res.dup) addNotif({ type:'info', text:res.dup ? `Chest: duplicate ${it.name} → +${res.refund} coins` : `Chest: you got ${it.name} (${RAR_LABEL[rk]})` });
      renderShop(); if (screenNow === 'menu') refreshMenu();
    }, 5600);
  });
}
const EMOTES = ['👏', '😂', '🔥', '😮', '🙏', '😎', '💪', 'GG'];
function showEmote(i, e){ const p = G.players[i]; if (p) p.emote = { e:EMOTES[e] || '👏', t:performance.now() }; }
function sendEmote(e){
  if (G.mode !== 'online' || performance.now() - (NW.emoteT || 0) < 1500) return;
  NW.emoteT = performance.now(); netSend({ t:'emote', e }); showEmote(NW.you, e); $('#emoteBar').classList.add('hidden');
}
function drawEmotes(c){
  const now = performance.now();
  for (const p of G.players){
    if (!p.emote) continue; const age = (now - p.emote.t) / 1000; if (age > 2.4){ p.emote = null; continue; }
    const q = toScreen(proj(p.x, p.y, 2.3)), k = Math.min(1, age * 7) * (age > 2 ? 1 - (age - 2) / .4 : 1), r = 22 * Math.max(.01, k), y = q[1] - 26 - Math.min(age, .3) * 20;
    c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = Math.max(0, k);
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(q[0], y, r, 0, TAU); c.fill(); c.beginPath(); c.moveTo(q[0] - 6, y + r - 3); c.lineTo(q[0], y + r + 8); c.lineTo(q[0] + 6, y + r - 3); c.fill();
    c.font = p.emote.e === 'GG' ? `800 ${Math.round(17 * k)}px Barlow, sans-serif` : `${Math.round(24 * k)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#14213d'; c.fillText(p.emote.e, q[0], y + 1); c.restore();
  }
}
const CONFIRM = { cb:null };
function askConfirm(title, text, yes, cb, no, yesStyle){ setTxt('#cfTitle', title); setTxt('#cfText', text); setTxt('#cfYes', yes); setTxt('#cfNo', no || 'Keep playing');
  $('#cfYes').style.background = yesStyle === 'go' ? 'linear-gradient(180deg, #bdff55, var(--accent))' : '#ef4444'; $('#cfYes').style.color = yesStyle === 'go' ? 'var(--accent-ink)' : '#fff';
  CONFIRM.cb = cb; $('#confirmOv').classList.remove('hidden'); }
