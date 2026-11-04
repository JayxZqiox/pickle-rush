/* ---------- result ---------- */
function myTeam(){ const me = G.players.find(p => p.human && !p.human.remote && p.human.set === 'p1'); return me ? me.team : 1; }
function gameOver(w){
  G.state = 'over';
  const sc = `${G.score[0]}–${G.score[1]}`;
  if (G.netRole === 'host'){ emit({ k:'over', w, sc }); netSend({ t:'result', win:w, score:sc }); }
  showResult(w, sc);
}
function showResult(w, sc){
  G.state = 'over';
  const mine = myTeam(), won = w === mine, online = G.mode === 'online';
  $('#resScore').textContent = sc;
  $('#resStats').textContent = `Match time ${fmtTime(G.matchT || 0)} · Longest rally ${G.stats.longest} · ${G.stats.perfect} perfect shot${G.stats.perfect === 1 ? '' : 's'}`;
  $('#resRank').textContent = '';
  const versus = G.mode === '2p' || G.mode === '2v2' || G.mode === 'duo-vs' || G.mode === 'watch';
  $('#resTitle').textContent = versus ? `${teamName(w)} win${team(w).length > 1 ? '' : 's'}` : (won ? 'Victory' : 'Defeat');
  $('#resSub').textContent = `${teamName(1)} vs ${teamName(2)}`;
  $('#resMmr').classList.add('hidden'); $('#resRew').classList.add('hidden');
  if (won || versus){ confetti(); playSfx('win'); } else playSfx('lose');
  if (RANKED(G.mode)) rankedResult(w === 1, sc);
  else if (G.mode === 'tour') tourMatchDone(w === 1, sc);
  else if (G.mode === 'watch') watchDone(w, sc);
  else if (G.mode !== 'demo' && G.mode !== 'online' && G.mode !== 'watch') reportProgress();
  if (online){
    $('#resMmr').classList.remove('hidden'); $('#resNew').textContent = '…'; $('#resDelta').textContent = '';
    $('#resRank').textContent = 'Updating rankings…';
    // the server's answer can arrive before this screen opens: show it now
    if (NW.lastRes && Date.now() - NW.lastRes.t < 15000){ const lr = NW.lastRes; NW.lastRes = null; setTimeout(() => netMsg(lr.m), 0); }
  }
  const host = G.netRole === 'host';
  $('#resAgain').classList.toggle('hidden', online && !host);
  if (G.mode !== 'tour' && G.mode !== 'watch'){ $('#resAgain').textContent = 'Rematch'; $('#resBracket').classList.add('hidden'); }
  $('#resMenu').textContent = online ? (host ? 'Back to room' : 'Leave room') : 'Menu';
  $('#resWait').classList.toggle('hidden', !(online && !host));
  // the winners celebrate on court with their victory dance before the results appear
  G.dance = { team:w, start:G.time };
  const dancer = team(w).find(p => p.human && !p.human.remote) || team(w)[0];
  const did = (dancer && dancer.look && dancer.look.dance) || 'dance_pump';
  playDance(did, won || versus ? .45 : .25);
  setTimeout(() => { if (G.state === 'over') show('s-result'); }, 3900);
}
async function rankedResult(won, sc){
  const doubles = G.mode === 'duo-ai', a = getAcc();
  $('#resMmr').classList.remove('hidden');
  const before = a ? a.mmr : 0;
  $('#resNew').textContent = before; $('#resDelta').textContent = '';
  try {
    const r = await progMatch(G.diff, won, sc, doubles);
    showDelta(before, getAcc().mmr, r.delta); showRewards(r);
    if (r.practice){ $('#resRank').textContent = 'Practice match: this opponent is more than 1.0 below your rating, so your rating didn’t change (¼ coins and XP).'; return; }
    if (r.easy){ $('#resRank').textContent = `Easy win: +${r.delta} for the score (+3 for winning by 7+, +2 by 4–6, +1 by 2–3), half coins and XP. Play stronger opponents to climb faster!`; return; }
    if (isServerAcc()) loadBoard().then(() => { const i = ACC.board.findIndex(x => x.username === ACC.user.username); if (i >= 0) $('#resRank').textContent = `Leaderboard position #${i + 1} of ${ACC.board.length}`; });
    else $('#resRank').textContent = ACC.server ? 'Playing anonymously: saved in this browser. Sign up to join the leaderboard.' : 'Saved in this browser';
  } catch (e) { $('#resRank').textContent = e.message || 'Couldn’t save this result.'; }
}
function rewardText(r){
  const bits = [];
  if (r.skills && r.skills.length) bits.push('Unlocked ' + r.skills.map(k => LABEL[k]).join(', '));
  if (r.newItems) bits.push(`${r.newItems} new item${r.newItems > 1 ? 's' : ''} in the shop`);
  if (r.keys) bits.push(`+${r.keys} chest key${r.keys > 1 ? 's' : ''} 🔑`);
  return bits.join(' · ');
}
function showRewards(r){
  const el = $('#resRew');
  if (!r){ el.classList.add('hidden'); return; }
  const a = getAcc(), lv = CAT.levelInfo(a ? a.xp : 0);
  const lines = [];
  if (r.level > r.levelBefore) lines.push(`<div class="font-display text-lg" style="color:var(--accent)">Level up! Lv ${r.level}</div>`);
  if (r.skills && r.skills.length) lines.push(`<div class="font-semibold">New skill: ${r.skills.map(k => LABEL[k]).join(', ')}</div>`);
  if (r.unlockedAi && AIS[r.unlockedAi]) lines.push(`<div class="font-semibold">New opponent unlocked: ${esc(AIS[r.unlockedAi].name)}</div>`);
  if (r.newItems) lines.push(`<div class="text-sm text-[var(--muted)]">${r.newItems} new item${r.newItems > 1 ? 's' : ''} in the shop</div>`);
  el.innerHTML = `<div class="flex items-center justify-between font-bold"><span><span style="color:#f5c542">+${r.coins}</span> coins</span><span><span style="color:var(--accent)">+${r.xp}</span> XP</span><span class="text-sm text-[var(--muted)]">Lv ${lv.level} · ${lv.into}/${lv.need}</span></div>
    <div class="bar mt-2" style="background:var(--line)"><i style="background:var(--accent); width:${Math.round(lv.into / lv.need * 100)}%"></i></div>${lines.join('')}`;
  el.classList.remove('hidden');
}
function showDelta(before, after, delta){
  const dEl = $('#resDelta'); dEl.textContent = delta ? (delta > 0 ? '+' : '−') + Math.abs(delta) : '±0'; dEl.style.color = delta > 0 ? 'var(--good)' : delta < 0 ? 'var(--bad)' : 'var(--muted)';
  countUp($('#resNew'), before, after);
}
function countUp(el, a, b){
  el.textContent = a;
  setTimeout(() => { const t0 = performance.now(), dur = 900; const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(a + (b - a) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, 650);
}
