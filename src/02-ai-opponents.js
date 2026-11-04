/* ---------- AI opponents (10 levels + partner + coach) ---------- */
const AIS = {
  rookie:      { key:'rookie', name:'Rookie Rex', name2:'Rookie Ria', mmr:650, speed:3.45, react:.34, aimSd:.72, mistake:.13, skill:.05, smash:.35, tScale:1.2, judge:.25, depth:6.1, netRush:false, acc:.48, blurb:'A relaxed warm-up with slower movement and generous mistakes.' },
  amateur:     { key:'amateur', name:'Amateur Amy', name2:'Amateur Abe', mmr:850, speed:3.8, react:.29, aimSd:.60, mistake:.10, skill:.09, smash:.45, tScale:1.14, judge:.35, depth:5.9, netRush:false, acc:.57, blurb:'Learning to place shots, but leaves openings.' },
  club:        { key:'club', name:'Club Casey', name2:'Club Cody', mmr:1000, speed:4.05, react:.25, aimSd:.52, mistake:.08, skill:.14, smash:.55, tScale:1.08, judge:.48, depth:5.7, netRush:false, acc:.66, blurb:'A balanced club player who can punish easy returns.' },
  pro:         { key:'pro', name:'Pro Paula', name2:'Pro Pete', mmr:1250, speed:4.5, react:.19, aimSd:.42, mistake:.055, skill:.22, smash:.75, tScale:1.0, judge:.7, depth:5.2, netRush:false, acc:.8, blurb:'Steady from the baseline and mixes in slices.' },
  veteran:     { key:'veteran', name:'Veteran Victor', name2:'Veteran Vera', mmr:1450, speed:4.75, react:.16, aimSd:.37, mistake:.045, skill:.28, smash:.80, tScale:.97, judge:.76, depth:5.15, netRush:true, acc:.84, blurb:'Reads angles earlier and moves toward the kitchen.' },
  elite:       { key:'elite', name:'Elite Elena', name2:'Elite Eli', mmr:1600, speed:4.95, react:.14, aimSd:.33, mistake:.038, skill:.32, smash:.84, tScale:.95, judge:.81, depth:5.1, netRush:true, acc:.88, blurb:'Sharper placement, faster reactions and aggressive volleys.' },
  legend:      { key:'legend', name:'Legend Leo', name2:'Legend Lia', mmr:1800, speed:5.15, react:.12, aimSd:.29, mistake:.03, skill:.37, smash:.89, tScale:.92, judge:.86, depth:5.0, netRush:true, acc:.92, blurb:'Rushes the kitchen line and attacks weak returns.' },
  champion:    { key:'champion', name:'Champion Kai', name2:'Champion Kim', mmr:2050, speed:5.4, react:.10, aimSd:.25, mistake:.024, skill:.42, smash:.93, tScale:.9, judge:.9, depth:5.0, netRush:true, acc:.96, blurb:'A fast all-rounder with accurate shots and powerful smashes.' },
  grandmaster: { key:'grandmaster', name:'Grandmaster Mira', name2:'Grandmaster Max', mmr:2350, speed:5.7, react:.08, aimSd:.20, mistake:.016, skill:.48, smash:.97, tScale:.86, judge:.96, depth:4.9, netRush:true, acc:.985, blurb:'Near-perfect positioning and very few unforced errors.' },
  nightmare:   { key:'nightmare', name:'Nightmare Nova', name2:'Nightmare Nyx', mmr:2700, speed:6.0, react:.055, aimSd:.15, mistake:.008, skill:.55, smash:1, tScale:.82, judge:1, depth:4.8, netRush:true, acc:1, blurb:'The ultimate challenge: lightning reactions and ruthless attacks.' },
  partner:     { key:'partner', name:'Ace', mmr:0, speed:4.9, react:.14, aimSd:.33, mistake:.035, skill:.25, smash:.8, tScale:.95, judge:.8, depth:5.0, netRush:false, acc:.9 },
  coach:       { key:'coach', name:'Coach', mmr:0, speed:6.2, react:.08, aimSd:.15, mistake:0, skill:0, smash:0, tScale:1.28, judge:0, depth:5.4, netRush:false, acc:0, coach:true },
};
/* Every ladder opponent's skill comes from its DUPR: beginners are slow and make lots of errors,
   advanced players are consistent and tactical, world-best players barely miss. */
const AI_BLURB = {
  rookie:'Just picked up a paddle. Slow, and misses a lot.', amateur:'Knows the rules, still learning to place the ball.', club:'Plays at the park on weekends. Beatable with steady shots.',
  pro:'Keeps rallies going and starts moving up to the kitchen.', veteran:'Patient, reads your angles, rarely gives free points.', elite:'Loves slice and spin. Dinks well.',
  legend:'Advanced: strong kitchen play and real consistency.', champion:'Advanced: smart placement and quick hands at the net.', grandmaster:'Advanced: almost no unforced errors.',
  semi1:'Semi-pro: tournament-level speed-ups and drops.', semi2:'Semi-pro: punishes anything high.', tour1:'Pro: fast feet, sharp volleys, deep drives.',
  tour2:'Pro: controls the kitchen battle from start to finish.', nightmare:'World-best: lightning reactions and ruthless attacks.', atlas:'World No.1: near-perfect in every part of the game.',
  king:'8.0 rating. The final boss of pickleball.' };
// piecewise-linear lookup on the rating scale
const curve = (pts, d) => { if (d <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (d <= pts[i][0]){ const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (d - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
function aiFromDupr(d){
  const t = clamp((d - 2) / 6, 0, 1);
  // up to 7.0 the AI still makes human mistakes and misses its targets; only the World-best tier is near-perfect
  const mistake = curve([[2, .22], [3, .16], [4, .12], [5, .11], [6, .09], [7, .045], [8, .02]], d);
  const aimSd = curve([[2, .85], [4, .64], [6, .52], [7, .28], [8, .16]], d);
  const acc = curve([[2, .4], [4, .62], [6, .74], [7, .95], [8, 1]], d);
  return { speed:3.0 + 3.4 * Math.pow(t, .9), react:.42 - .38 * Math.pow(t, .8), aimSd, mistake,
    skill:.03 + .57 * t, smash:.3 + .7 * t, tScale:1.32 - .54 * t, judge:.2 + .8 * t, acc, depth:6.2 - 1.4 * t, netRush:d >= 3.4, kitchen:clamp(.15 + 1.6 * t, 0, 1) };
}
// the street legend
AIS.lando = Object.assign(aiFromDupr(7.8), { key:'lando', name:'Kuya Lando', name2:'Kuya Lando', mmr:3866, dupr:7.8, blurb:'Learned the game on the lansangan. Humble, quiet, unstoppable.' });
for (const a of CAT.LADDER) AIS[a.key] = Object.assign(aiFromDupr(a.dupr), { dupr:a.dupr }, { key:a.key, name:a.name, name2:a.name2, mmr:a.mmr, dupr:a.dupr, blurb:AI_BLURB[a.key] || '' });
for (const m of itemsOf('partner')) AIS[m.id] = { key:m.id, name:m.name, mmr:0, speed:m.speed, react:m.react, aimSd:m.aimSd, mistake:m.mistake, skill:m.skill, smash:m.smash, tScale:m.tScale, judge:m.judge, depth:5.0, netRush:false, acc:m.acc, kitchen:.85 };
const LADDER = CAT.LADDER.map(a => a.key);
// stronger opponents hit with fancier balls (Rare, Epic, Legendary) and celebrate with dances
// every AI gets a steady nationality, build and height from its name
function aiLook(name){
  let h = 7; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { nation:NATION_CODES[h % NATION_CODES.length], body:CAT.BODY_TYPES[(h >> 5) % 4], height:158 + ((h >> 9) % 40) };
}
function aiGear(key){
  const d = (AIS[key] && AIS[key].dupr) || 2, pick = a => a[(Math.random() * a.length) | 0];
  // only some of the strongest opponents bring special balls
  const ball = d < 5 ? 'ball_classic' : d < 6 ? (Math.random() < .25 ? pick(['ball_fire', 'ball_ice']) : 'ball_classic')
    : d < 7 ? (Math.random() < .3 ? pick(['ball_bolt', 'ball_rainbow']) : 'ball_classic') : (Math.random() < .45 ? pick(['ball_galaxy', 'ball_gold']) : 'ball_classic');
  const dance = d < 3 ? 'dance_pump' : pick(['dance_funk', 'dance_budots', 'dance_weng', 'dance_tinikling', 'dance_robot', 'dance_dab']);
  return { ball, dance };
}
const RANKED = m => m === '1p' || m === 'duo-ai';

