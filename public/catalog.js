/* Pickle Rush shared catalog.
 * Loaded by the browser (<script src="catalog.js">) AND by server.js (require), so prices,
 * unlocks and rewards are identical on both sides. Edit items here.
 */
(function (root) {
  'use strict';

  /* ---------- AI ladder (beat one to unlock the next) ---------- */
  const LADDER = [
    { key:'rookie',      name:'Rookie Rex',       name2:'Rookie Ria',      mmr:0 },
    { key:'amateur',     name:'Amateur Amy',      name2:'Amateur Abe',     mmr:120 },
    { key:'club',        name:'Club Casey',       name2:'Club Cody',       mmr:250 },
    { key:'pro',         name:'Pro Paula',        name2:'Pro Pete',        mmr:400 },
    { key:'veteran',     name:'Veteran Victor',   name2:'Veteran Vera',    mmr:600 },
    { key:'elite',       name:'Elite Elena',      name2:'Elite Eli',       mmr:800 },
    { key:'legend',      name:'Legend Leo',       name2:'Legend Lia',      mmr:1000 },
    { key:'champion',    name:'Champion Kai',     name2:'Champion Kim',    mmr:1250 },
    { key:'grandmaster', name:'Grandmaster Mira', name2:'Grandmaster Max', mmr:1500 },
    { key:'nightmare',   name:'Nightmare Nova',   name2:'Nightmare Nyx',   mmr:1800 },
  ];

  /* ---------- skills: every shot is available from level 1 ---------- */
  const SKILL_LEVELS = {};

  /* ---------- items ----------
   * slot: head | top | bottom | shoes | paddle | ball | court | partner
   * price 0 = starter (owned by everyone). lvl = level needed to buy.
   */
  const ITEMS = [
    // headwear
    { id:'head_none',      slot:'head', name:'No hat',          price:0,    lvl:1, style:'none' },
    { id:'band_red',       slot:'head', name:'Red headband',    price:0,    lvl:1, style:'band',   c1:'#e23b3b' },
    { id:'cap_navy',       slot:'head', name:'Navy cap',        price:150,  lvl:1, style:'cap',    c1:'#1f3b8c', c2:'#ffffff' },
    { id:'cap_red',        slot:'head', name:'Red cap',         price:150,  lvl:1, style:'cap',    c1:'#d93636', c2:'#ffffff' },
    { id:'cap_back',       slot:'head', name:'Backwards cap',   price:250,  lvl:2, style:'capback',c1:'#1c1f26', c2:'#e8ff3d' },
    { id:'visor_white',    slot:'head', name:'Pro visor',       price:200,  lvl:2, style:'visor',  c1:'#f5f7fb', c2:'#22b8e6' },
    { id:'bucket_khaki',   slot:'head', name:'Bucket hat',      price:300,  lvl:3, style:'bucket', c1:'#c9b48a', c2:'#8d7a52' },
    { id:'beanie_purple',  slot:'head', name:'Purple beanie',   price:300,  lvl:3, style:'beanie', c1:'#7c4dff', c2:'#ffd23f' },
    { id:'crown_gold',     slot:'head', name:'Champion crown',  price:2000, lvl:10, style:'crown', c1:'#f5c542', c2:'#e23b3b' },
    // tops
    { id:'tee_white',      slot:'top', name:'White tee',        price:0,    lvl:1, style:'tee',    c1:'#f5f7fb', c2:'#1f3b8c' },
    { id:'tee_blue',       slot:'top', name:'Blue tee',         price:0,    lvl:1, style:'tee',    c1:'#2d7ff9', c2:'#ffffff' },
    { id:'polo_green',     slot:'top', name:'Green polo',       price:200,  lvl:1, style:'polo',   c1:'#2f9e5b', c2:'#ffffff' },
    { id:'polo_orange',    slot:'top', name:'Orange polo',      price:200,  lvl:1, style:'polo',   c1:'#ff8a3d', c2:'#5b2a86' },
    { id:'tank_black',     slot:'top', name:'Black tank',       price:250,  lvl:2, style:'tank',   c1:'#23262e', c2:'#e8ff3d' },
    { id:'jersey_red',     slot:'top', name:'Red jersey',       price:400,  lvl:3, style:'jersey', c1:'#d93636', c2:'#ffffff' },
    { id:'jersey_lime',    slot:'top', name:'Lime jersey',      price:400,  lvl:3, style:'jersey', c1:'#c6f432', c2:'#14213d' },
    { id:'hoodie_gray',    slot:'top', name:'Gray hoodie',      price:600,  lvl:5, style:'hoodie', c1:'#8a93a3', c2:'#e8ff3d' },
    { id:'kit_gold',       slot:'top', name:'Gold pro kit',     price:1500, lvl:8, style:'kit',    c1:'#1c1f26', c2:'#f5c542' },
    // bottoms
    { id:'shorts_navy',    slot:'bottom', name:'Navy shorts',   price:0,    lvl:1, style:'shorts', c1:'#1f3b8c', c2:'#ffffff' },
    { id:'shorts_black',   slot:'bottom', name:'Black shorts',  price:0,    lvl:1, style:'shorts', c1:'#23262e', c2:'#e8ff3d' },
    { id:'shorts_red',     slot:'bottom', name:'Red shorts',    price:150,  lvl:1, style:'shorts', c1:'#d93636', c2:'#ffffff' },
    { id:'skirt_white',    slot:'bottom', name:'White skirt',   price:150,  lvl:1, style:'skirt',  c1:'#f5f7fb', c2:'#ff5c9a' },
    { id:'skirt_pink',     slot:'bottom', name:'Pink skirt',    price:150,  lvl:1, style:'skirt',  c1:'#ff7eb6', c2:'#ffffff' },
    { id:'long_khaki',     slot:'bottom', name:'Long shorts',   price:200,  lvl:2, style:'long',   c1:'#b89c6c', c2:'#6b5735' },
    { id:'track_white',    slot:'bottom', name:'Track shorts',  price:300,  lvl:3, style:'track',  c1:'#f5f7fb', c2:'#2d7ff9' },
    { id:'skort_purple',   slot:'bottom', name:'Purple skort',  price:300,  lvl:3, style:'skirt',  c1:'#7c4dff', c2:'#ffd23f' },
    // shoes
    { id:'sneak_white',    slot:'shoes', name:'White sneakers', price:0,    lvl:1, style:'sneaker', c1:'#f5f7fb', c2:'#9aa4b4' },
    { id:'sneak_black',    slot:'shoes', name:'Black sneakers', price:0,    lvl:1, style:'sneaker', c1:'#23262e', c2:'#f5f7fb' },
    { id:'court_blue',     slot:'shoes', name:'Court shoes',    price:300,  lvl:2, style:'sneaker', c1:'#2d7ff9', c2:'#ffffff' },
    { id:'run_neon',       slot:'shoes', name:'Neon runners',   price:250,  lvl:2, style:'runner',  c1:'#c6f432', c2:'#14213d' },
    { id:'high_red',       slot:'shoes', name:'Red high-tops',  price:400,  lvl:3, style:'hightop', c1:'#d93636', c2:'#ffffff' },
    { id:'kicks_gold',     slot:'shoes', name:'Gold kicks',     price:1500, lvl:8, style:'hightop', c1:'#f5c542', c2:'#1c1f26' },
    // paddles: power = faster shots, control = more accurate, spin = stronger slice/curve
    { id:'pad_wood',       slot:'paddle', name:'Starter wood',  price:0,    lvl:1, c1:'#c8a165', c2:'#7a5530', power:0, control:0, spin:0 },
    { id:'pad_blade',      slot:'paddle', name:'Blue Blade',    price:250,  lvl:2, c1:'#2d7ff9', c2:'#0b2a66', power:1, control:0, spin:0 },
    { id:'pad_control',    slot:'paddle', name:'Control Pro',   price:400,  lvl:3, c1:'#2f9e5b', c2:'#0f3d24', power:0, control:2, spin:0 },
    { id:'pad_spin',       slot:'paddle', name:'Spin Doctor',   price:600,  lvl:4, c1:'#7c4dff', c2:'#2a1366', power:0, control:0, spin:2 },
    { id:'pad_carbon',     slot:'paddle', name:'Carbon Elite',  price:1000, lvl:6, c1:'#2a2d36', c2:'#e8ff3d', power:1, control:1, spin:1 },
    { id:'pad_phoenix',    slot:'paddle', name:'Phoenix Legend',price:2000, lvl:9, c1:'#ff6a1a', c2:'#ffd23f', power:2, control:1, spin:2 },
    // balls (visual effects)
    { id:'ball_classic',   slot:'ball', name:'Classic',         price:0,    lvl:1, fx:'none',      c1:'#e8ff3d' },
    { id:'ball_fire',      slot:'ball', name:'Fireball',        price:300,  lvl:2, fx:'fire',      c1:'#ffb020' },
    { id:'ball_ice',       slot:'ball', name:'Ice comet',       price:300,  lvl:2, fx:'ice',       c1:'#bfefff' },
    { id:'ball_bolt',      slot:'ball', name:'Lightning',       price:500,  lvl:4, fx:'lightning', c1:'#fff27a' },
    { id:'ball_rainbow',   slot:'ball', name:'Rainbow',         price:700,  lvl:5, fx:'rainbow',   c1:'#ff7eb6' },
    { id:'ball_galaxy',    slot:'ball', name:'Galaxy',          price:1200, lvl:7, fx:'galaxy',    c1:'#8b5cf6' },
    { id:'ball_gold',      slot:'ball', name:'Golden',          price:1800, lvl:9, fx:'gold',      c1:'#f5c542' },
    // courts
    { id:'court_stadium',  slot:'court', name:'Night Stadium',  price:0,    lvl:1 },
    { id:'court_beach',    slot:'court', name:'Sunset Beach',   price:400,  lvl:2 },
    { id:'court_clay',     slot:'court', name:'Clay Classic',   price:500,  lvl:3 },
    { id:'court_neon',     slot:'court', name:'Neon City',      price:700,  lvl:4 },
    { id:'court_park',     slot:'court', name:'Park Grass',     price:600,  lvl:5 },
    { id:'court_royal',    slot:'court', name:'Royal Arena',    price:1500, lvl:8 },
    // AI teammates for 2v2
    { id:'mate_ace',       slot:'partner', name:'Ace',          price:0,    lvl:1, speed:4.5, react:.18, aimSd:.42, mistake:.055, skill:.2,  smash:.75, tScale:1.0, judge:.7, acc:.8 },
    { id:'mate_blaze',     slot:'partner', name:'Blaze',        price:300,  lvl:3, speed:4.9, react:.14, aimSd:.34, mistake:.04,  skill:.28, smash:.82, tScale:.95, judge:.8, acc:.88 },
    { id:'mate_nova',      slot:'partner', name:'Nova',         price:800,  lvl:5, speed:5.2, react:.11, aimSd:.28, mistake:.03,  skill:.36, smash:.88, tScale:.92, judge:.86, acc:.93 },
    { id:'mate_titan',     slot:'partner', name:'Titan',        price:1500, lvl:8, speed:5.5, react:.09, aimSd:.23, mistake:.022, skill:.42, smash:.93, tScale:.89, judge:.92, acc:.97 },
    { id:'mate_zen',       slot:'partner', name:'Zen Master',   price:2500, lvl:10,speed:5.8, react:.07, aimSd:.18, mistake:.015, skill:.5,  smash:.97, tScale:.86, judge:.97, acc:1 },
  ];
  const BY_ID = {}; ITEMS.forEach(i => { BY_ID[i.id] = i; });
  const SLOTS = ['head', 'top', 'bottom', 'shoes', 'paddle', 'ball', 'court', 'partner'];
  const STARTER = ITEMS.filter(i => i.price === 0).map(i => i.id);
  const DEFAULT_EQUIP = { head:'band_red', top:'tee_white', bottom:'shorts_navy', shoes:'sneak_white', paddle:'pad_wood', ball:'ball_classic', court:'court_stadium', partner:'mate_ace' };
  const HAIR_STYLES = { boy:['short', 'spiky', 'buzz', 'curly'], girl:['ponytail', 'bob', 'long', 'buns'] };

  /* ---------- levels ---------- */
  // XP needed to go from level n to n+1 = 100 + 60 * (n - 1)
  function levelInfo(xp) {
    xp = Math.max(0, xp | 0);
    let lvl = 1, need = 100;
    while (xp >= need && lvl < 50) { xp -= need; lvl++; need = 100 + 60 * (lvl - 1); }
    return { level: lvl, into: xp, need };
  }

  /* ---------- rewards ---------- */
  function aiIndex(key) { return LADDER.findIndex(a => a.key === key); }
  function matchRewards(key, won) {
    const i = Math.max(0, aiIndex(key));
    return won ? { coins: 40 + 10 * i, xp: 60 + 8 * i } : { coins: 12 + 3 * i, xp: 25 + 3 * i };
  }
  function rallyRewards(returns) { return { coins: Math.min(25, Math.floor(returns / 3)), xp: Math.min(30, returns * 2) }; }
  function onlineRewards(won) { return won ? { coins: 50, xp: 70 } : { coins: 20, xp: 30 }; }

  function elo(mmr, opp, won) {
    const exp = 1 / (1 + Math.pow(10, (opp - mmr) / 400));
    let d = Math.round(40 * ((won ? 1 : 0) - exp));
    if (won && d < 3) d = 3;
    if (!won && d > -3) d = -3;
    return d;
  }
  function aiUnlocked(beaten, key) {
    const i = aiIndex(key);
    if (i <= 0) return i === 0;
    return (beaten || []).includes(LADDER[i - 1].key);
  }

  /* ---------- profiles ---------- */
  function newProgress() {
    return { mmr: 0, peak: 0, wins: 0, losses: 0, history: [], bestRally: 0, coins: 150, xp: 0,
      owned: STARTER.slice(), equip: Object.assign({}, DEFAULT_EQUIP), beaten: [] };
  }
  // fill in anything missing (old saves); old profiles from before progression restart at 0 MMR
  function normalize(p) {
    if (!p || typeof p !== 'object') return newProgress();
    if (typeof p.coins !== 'number') {
      const fresh = newProgress();
      fresh.bestRally = p.bestRally || 0;
      return Object.assign(p, fresh);
    }
    const d = newProgress();
    for (const k of Object.keys(d)) if (p[k] === undefined) p[k] = d[k];
    p.owned = Array.from(new Set((p.owned || []).filter(id => BY_ID[id]).concat(STARTER)));
    p.equip = Object.assign({}, DEFAULT_EQUIP, p.equip || {});
    for (const s of SLOTS) { const it = BY_ID[p.equip[s]]; if (!it || it.slot !== s || !p.owned.includes(it.id)) p.equip[s] = DEFAULT_EQUIP[s]; }
    p.beaten = (p.beaten || []).filter(k => aiIndex(k) >= 0);
    return p;
  }
  function addRewards(p, r) {
    const before = levelInfo(p.xp).level;
    p.coins = Math.max(0, (p.coins | 0) + (r.coins | 0));
    p.xp = Math.max(0, (p.xp | 0) + (r.xp | 0));
    const after = levelInfo(p.xp).level;
    const skills = Object.keys(SKILL_LEVELS).filter(s => SKILL_LEVELS[s] > before && SKILL_LEVELS[s] <= after);
    const items = ITEMS.filter(i => i.price > 0 && i.lvl > before && i.lvl <= after).length;
    return { coins: r.coins | 0, xp: r.xp | 0, levelBefore: before, level: after, skills, newItems: items };
  }
  // ranked match against the AI ladder. Returns an error string or the result summary.
  function applyMatch(p, key, won, score, doubles) {
    const ai = LADDER[aiIndex(key)];
    if (!ai) return 'Unknown opponent';
    if (!aiUnlocked(p.beaten, key)) return 'That opponent is still locked';
    const delta = elo(p.mmr, ai.mmr, won);
    p.mmr = Math.max(0, p.mmr + delta);
    p.peak = Math.max(p.peak || 0, p.mmr);
    if (won) p.wins++; else p.losses++;
    let unlockedAi = null;
    if (won && !p.beaten.includes(key)) {
      p.beaten.push(key);
      const next = LADDER[aiIndex(key) + 1];
      if (next) unlockedAi = next.key;
    }
    p.history = [{ opp: doubles ? ai.name + ' pair' : ai.name, mode: doubles ? 'Doubles' : 'Singles', score: String(score || '').slice(0, 9), delta, mmr: p.mmr, win: !!won, t: Date.now() }]
      .concat(p.history || []).slice(0, 20);
    const rew = addRewards(p, matchRewards(key, won));
    return Object.assign({ delta, unlockedAi }, rew);
  }
  function buy(p, id) {
    const it = BY_ID[id];
    if (!it) return 'That item doesn’t exist';
    if (p.owned.includes(id)) return 'You already own this';
    if (levelInfo(p.xp).level < it.lvl) return `Reach level ${it.lvl} first`;
    if ((p.coins | 0) < it.price) return 'Not enough coins';
    p.coins -= it.price; p.owned.push(id);
    return null;
  }
  function equip(p, slot, id) {
    const it = BY_ID[id];
    if (!it || it.slot !== slot) return 'Wrong item';
    if (!p.owned.includes(id)) return 'Buy it first';
    p.equip[slot] = id;
    return null;
  }
  // appearance sent to other players / stored with the account
  function cleanLook(l) {
    l = l && typeof l === 'object' ? l : {};
    const gender = l.gender === 'girl' ? 'girl' : 'boy';
    const styles = HAIR_STYLES[gender];
    const out = { gender, skin: Math.max(0, Math.min(3, l.skin | 0)), hair: Math.max(0, Math.min(4, l.hair | 0)),
      hairStyle: styles.includes(l.hairStyle) ? l.hairStyle : styles[0] };
    for (const s of ['head', 'top', 'bottom', 'shoes', 'paddle', 'ball']) { const it = BY_ID[l[s]]; out[s] = it && it.slot === s ? it.id : DEFAULT_EQUIP[s]; }
    return out;
  }

  const API = { LADDER, SKILL_LEVELS, ITEMS, BY_ID, SLOTS, STARTER, DEFAULT_EQUIP, HAIR_STYLES,
    levelInfo, aiIndex, matchRewards, rallyRewards, onlineRewards, elo, aiUnlocked,
    newProgress, normalize, addRewards, applyMatch, buy, equip, cleanLook };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PR_CATALOG = API;
})(typeof window !== 'undefined' ? window : globalThis);
