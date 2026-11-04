/* Pickle Rush shared catalog.
 * Loaded by the browser (<script src="catalog.js">) AND by server.js (require), so prices,
 * unlocks and rewards are identical on both sides. Edit items here.
 */
(function (root) {
  'use strict';

  /* ---------- AI ladder (beat one to unlock the next), placed on the DUPR scale ----------
   * Beginner 2.0–2.99 · Intermediate 3.0–3.49 · Advanced intermediate 3.5–3.99 · Advanced 4.0–4.99
   * Semi-professional 5.0–5.99 · Professional 6.0–6.99 · World-best 7.0–8.0 */
  const LADDER = [
    { key:'rookie',      name:'Rookie Rex',        name2:'Rookie Ria',       dupr:2.00 },
    { key:'amateur',     name:'Amateur Amy',       name2:'Amateur Abe',      dupr:2.30 },
    { key:'club',        name:'Club Casey',        name2:'Club Cody',        dupr:2.65 },
    { key:'pro',         name:'Rally Paula',       name2:'Rally Pete',       dupr:3.10 },
    { key:'veteran',     name:'Veteran Victor',    name2:'Veteran Vera',     dupr:3.40 },
    { key:'elite',       name:'Spin Elena',        name2:'Spin Eli',         dupr:3.75 },
    { key:'legend',      name:'Kitchen Leo',       name2:'Kitchen Lia',      dupr:4.15 },
    { key:'champion',    name:'Captain Kai',       name2:'Captain Kim',      dupr:4.50 },
    { key:'grandmaster', name:'Master Mira',       name2:'Master Max',       dupr:4.85 },
    { key:'semi1',       name:'Semi-Pro Santi',    name2:'Semi-Pro Sol',     dupr:5.20 },
    { key:'semi2',       name:'Semi-Pro Bea',      name2:'Semi-Pro Ben',     dupr:5.65 },
    { key:'tour1',       name:'Tour Pro Tomas',    name2:'Tour Pro Tess',    dupr:6.15 },
    { key:'tour2',       name:'Tour Pro Mia',      name2:'Tour Pro Marco',   dupr:6.65 },
    { key:'nightmare',   name:'Nightmare Nova',    name2:'Nightmare Nyx',    dupr:7.15 },
    { key:'atlas',       name:'World No.1 Atlas',  name2:'World No.2 Aria',  dupr:7.60 },
    { key:'king',        name:'The Pickle King',   name2:'The Pickle Queen', dupr:8.00 },
  ];
  // DUPR-style rating: a straight line from 0 MMR = 2.000 up to 4000 MMR = 8.000
  const MMR_PER_POINT = 4000 / 6;
  LADDER.forEach(a => { a.mmr = Math.round((a.dupr - 2) * MMR_PER_POINT); });

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
    { id:'pad_tropic',     slot:'paddle', name:'Tropic Wave',   price:300,  lvl:2, c1:'#14b8a6', c2:'#ffd23f', power:0, control:0, spin:1, deco:'wave' },
    { id:'pad_neon',       slot:'paddle', name:'Neon Rush',     price:350,  lvl:2, c1:'#ff4fd8', c2:'#5ff4ff', power:1, control:0, spin:0, deco:'stripe' },
    { id:'pad_sakura',     slot:'paddle', name:'Sakura Swing',  price:450,  lvl:3, c1:'#ffb3cf', c2:'#ff5c9a', power:0, control:1, spin:1, deco:'dots' },
    { id:'pad_glacier',    slot:'paddle', name:'Glacier',       price:550,  lvl:4, c1:'#bfefff', c2:'#2d7ff9', power:0, control:2, spin:1, deco:'split' },
    { id:'pad_stealth',    slot:'paddle', name:'Stealth',       price:700,  lvl:5, c1:'#1c1f26', c2:'#ff3b3b', power:2, control:0, spin:0, deco:'stripe' },
    { id:'pad_lava',       slot:'paddle', name:'Lava Core',     price:900,  lvl:6, c1:'#ff4d1a', c2:'#ffd23f', power:2, control:0, spin:1, deco:'wave' },
    { id:'pad_galaxy',     slot:'paddle', name:'Galaxy Pro',    price:1400, lvl:7, c1:'#3b0764', c2:'#c4b5fd', power:1, control:2, spin:1, deco:'dots' },
    // chest-only balls in plain colors (common pulls)
    { id:'ball_orange',    slot:'ball', name:'Orange pop',      price:100,  lvl:1, chest:true, rarity:'common', fx:'none', c1:'#ff9f45' },
    { id:'ball_pink',      slot:'ball', name:'Bubblegum',       price:100,  lvl:1, chest:true, rarity:'common', fx:'none', c1:'#ff8fc6' },
    { id:'ball_white',     slot:'ball', name:'Tournament white',price:100,  lvl:1, chest:true, rarity:'common', fx:'none', c1:'#f5f7fb' },
    { id:'ball_mint',      slot:'ball', name:'Mint',            price:100,  lvl:1, chest:true, rarity:'common', fx:'none', c1:'#7df2c6' },
    // anime-style paddles (original designs)
    { id:'pad_kawaii',     slot:'paddle', name:'Kawaii Pop',     price:350,  lvl:2, c1:'#fde68a', c2:'#f472b6', power:0, control:1, spin:0, deco:'kawaii' },
    { id:'pad_neko',       slot:'paddle', name:'Neko Paw',       price:400,  lvl:2, c1:'#fbcfe8', c2:'#1f2937', power:0, control:1, spin:1, deco:'neko' },
    { id:'pad_shuriken',   slot:'paddle', name:'Shadow Shuriken',price:500,  lvl:3, c1:'#1e1b4b', c2:'#a5b4fc', power:0, control:0, spin:2, deco:'shuriken' },
    { id:'pad_kitsune',    slot:'paddle', name:'Kitsune Spirit', price:650,  lvl:4, c1:'#ff8a3d', c2:'#ffffff', power:1, control:1, spin:1, deco:'kitsune' },
    { id:'pad_petals',     slot:'paddle', name:'Sakura Petals',  price:700,  lvl:4, c1:'#ffe4ef', c2:'#ff5c9a', power:0, control:1, spin:2, deco:'petals' },
    { id:'pad_oni',        slot:'paddle', name:'Oni Fury',       price:750,  lvl:5, c1:'#b91c1c', c2:'#fde047', power:2, control:0, spin:0, deco:'oni' },
    { id:'pad_katana',     slot:'paddle', name:'Katana Edge',    price:800,  lvl:5, c1:'#111827', c2:'#e5e7eb', power:1, control:2, spin:0, deco:'katana' },
    { id:'pad_mecha',      slot:'paddle', name:'Mecha Core X',   price:1600, lvl:8, c1:'#334155', c2:'#38bdf8', power:2, control:1, spin:1, deco:'mecha' },
    { id:'pad_dragon',     slot:'paddle', name:'Sky Dragon',     price:1800, lvl:9, c1:'#065f46', c2:'#fbbf24', power:2, control:1, spin:2, deco:'dragon' },
    // chest-only outfits
    { id:'top_inferno',    slot:'top',    name:'Inferno jersey', price:200, lvl:1, chest:true, rarity:'common',    style:'jersey', c1:'#ff4d1a', c2:'#ffd23f' },
    { id:'top_cyber',      slot:'top',    name:'Cyber tank',     price:200, lvl:1, chest:true, rarity:'common',    style:'tank',   c1:'#0f172a', c2:'#5ff4ff' },
    { id:'top_sakura',     slot:'top',    name:'Sakura kit',     price:400, lvl:1, chest:true, rarity:'rare',      style:'kit',    c1:'#ffb3cf', c2:'#ff5c9a' },
    { id:'top_galaxy',     slot:'top',    name:'Galaxy hoodie',  price:700, lvl:1, chest:true, rarity:'epic',      style:'hoodie', c1:'#3b0764', c2:'#c4b5fd' },
    { id:'top_royal',      slot:'top',    name:'Royal polo',     price:1500,lvl:1, chest:true, rarity:'legendary', style:'polo',   c1:'#4c1d95', c2:'#f5c542' },
    { id:'bot_inferno',    slot:'bottom', name:'Inferno shorts', price:200, lvl:1, chest:true, rarity:'common',    style:'shorts', c1:'#ff4d1a', c2:'#ffd23f' },
    { id:'bot_camo',       slot:'bottom', name:'Camo long shorts',price:200,lvl:1, chest:true, rarity:'common',    style:'long',   c1:'#4d5b3a', c2:'#a3b18a' },
    { id:'bot_cyber',      slot:'bottom', name:'Cyber track',    price:400, lvl:1, chest:true, rarity:'rare',      style:'track',  c1:'#0f172a', c2:'#5ff4ff' },
    { id:'bot_galaxy',     slot:'bottom', name:'Galaxy track',   price:700, lvl:1, chest:true, rarity:'epic',      style:'track',  c1:'#3b0764', c2:'#c4b5fd' },
    { id:'bot_royal',      slot:'bottom', name:'Royal skirt',    price:1500,lvl:1, chest:true, rarity:'legendary', style:'skirt',  c1:'#4c1d95', c2:'#f5c542' },
    // chest-only hair (overrides your own hairstyle when worn)
    { id:'hair_own',       slot:'hairx', name:'My own hair',      price:0,   lvl:1 },
    { id:'hair_neonhawk',  slot:'hairx', name:'Neon mohawk',      price:200, lvl:1, chest:true, rarity:'common',    style:'mohawk',     c1:'#ff4fd8', glow:true },
    { id:'hair_twinpink',  slot:'hairx', name:'Pink twin tails',  price:200, lvl:1, chest:true, rarity:'common',    style:'twintails',  c1:'#ff8fc6' },
    { id:'hair_frost',     slot:'hairx', name:'Frost spikes',     price:400, lvl:1, chest:true, rarity:'rare',      style:'superspike', c1:'#9be7ff', tip:'#ffffff' },
    { id:'hair_flame',     slot:'hairx', name:'Flame hair',       price:700, lvl:1, chest:true, rarity:'epic',      style:'flame',      c1:'#ff4d1a', tip:'#ffd23f', glow:true },
    { id:'hair_galaxy',    slot:'hairx', name:'Galaxy waves',     price:700, lvl:1, chest:true, rarity:'epic',      style:'long',       c1:'#6d28d9', tip:'#f0abfc', glow:true },
    { id:'hair_super',     slot:'hairx', name:'Super spikes',     price:1500,lvl:1, chest:true, rarity:'legendary', style:'superspike', c1:'#ffd23f', tip:'#fff6c2', glow:true },
    // jerseys and sandos (sando = tank top)
    { id:'sando_23',      slot:'top', name:'Basketball sando #23', price:250, lvl:1, style:'tank',   c1:'#c8102e', c2:'#ffffff', deco:'number', num:'23' },
    { id:'sando_11',      slot:'top', name:'Basketball sando #11', price:250, lvl:1, style:'tank',   c1:'#552583', c2:'#fdb927', deco:'number', num:'11' },
    { id:'sando_stripe',  slot:'top', name:'Barangay stripe sando', price:200, lvl:1, style:'tank',  c1:'#ffffff', c2:'#1d4ed8', deco:'stripes' },
    { id:'sando_retro',   slot:'top', name:'Retro hoop sando',     price:220, lvl:1, style:'tank',   c1:'#f97316', c2:'#0f766e', deco:'hoops' },
    { id:'jersey_stripe', slot:'top', name:'Striped jersey',       price:300, lvl:2, style:'jersey', c1:'#111827', c2:'#f9fafb', deco:'stripes' },
    { id:'jersey_sash',   slot:'top', name:'Sash jersey',          price:300, lvl:2, style:'jersey', c1:'#ffffff', c2:'#dc2626', c3:'#111827', deco:'sash' },
    { id:'jersey_hoops',  slot:'top', name:'Hooped jersey',        price:300, lvl:2, style:'jersey', c1:'#15803d', c2:'#ffffff', deco:'hoops' },
    { id:'tee_seven',     slot:'top', name:'Lucky 7 tee',          price:180, lvl:1, style:'tee',    c1:'#0ea5e9', c2:'#ffffff', deco:'number', num:'7' },
    // national team jerseys
    { id:'jer_ph', slot:'top', name:'Philippines jersey', price:450, lvl:2, style:'jersey', c1:'#0038a8', c2:'#ce1126', c3:'#fcd116', deco:'halves', nation:'PH' },
    { id:'jer_us', slot:'top', name:'USA jersey',         price:450, lvl:2, style:'jersey', c1:'#1e3a8a', c2:'#dc2626', c3:'#ffffff', deco:'sash',   nation:'US' },
    { id:'jer_au', slot:'top', name:'Australia jersey',   price:450, lvl:2, style:'jersey', c1:'#047857', c2:'#fbbf24', deco:'hoops',  nation:'AU' },
    { id:'jer_jp', slot:'top', name:'Japan jersey',       price:450, lvl:2, style:'jersey', c1:'#1d3d8f', c2:'#ffffff', c3:'#bc002d', deco:'sides',  nation:'JP' },
    { id:'jer_cn', slot:'top', name:'China jersey',       price:450, lvl:2, style:'jersey', c1:'#de2910', c2:'#ffde00', c3:'#ffde00', deco:'sash',   nation:'CN' },
    { id:'jer_kr', slot:'top', name:'Korea jersey',       price:450, lvl:2, style:'jersey', c1:'#ffffff', c2:'#cd2e3a', c3:'#0047a0', deco:'sides',  nation:'KR' },
    { id:'jer_br', slot:'top', name:'Brazil jersey',      price:450, lvl:2, style:'jersey', c1:'#ffdf00', c2:'#009c3b', c3:'#002776', deco:'sides',  nation:'BR' },
    { id:'jer_es', slot:'top', name:'Spain jersey',       price:450, lvl:2, style:'jersey', c1:'#aa151b', c2:'#f1bf00', deco:'hoops',  nation:'ES' },
    { id:'jer_in', slot:'top', name:'India jersey',       price:450, lvl:2, style:'jersey', c1:'#1e40af', c2:'#ff9933', c3:'#138808', deco:'sash',   nation:'IN' },
    { id:'jer_gb', slot:'top', name:'UK jersey',          price:450, lvl:2, style:'jersey', c1:'#ffffff', c2:'#012169', c3:'#c8102e', deco:'sash',   nation:'GB' },
    // tournament-only prizes (can't be bought or found in chests)
    { id:'top_cup_club', slot:'top',    name:'Club Cup champion jersey', price:600,  lvl:1, tour:'cup_club',  rarity:'epic',      style:'jersey', c1:'#0f766e', c2:'#cd7f32', c3:'#fde68a', deco:'sash' },
    { id:'dance_trophy', slot:'dance',  name:'Trophy Lift',              price:600,  lvl:1, tour:'cup_club',  rarity:'epic',      style:'trophy', bpm:120 },
    { id:'top_cup_open', slot:'top',    name:'Pro Open champion kit',    price:1200, lvl:1, tour:'cup_open',  rarity:'legendary', style:'kit',    c1:'#e5e7eb', c2:'#64748b', c3:'#f5c542', deco:'sides' },
    { id:'head_laurel',  slot:'head',   name:'Golden laurel',            price:1200, lvl:1, tour:'cup_open',  rarity:'legendary', style:'laurel', c1:'#f5c542', c2:'#b7791f' },
    { id:'pad_cup',      slot:'paddle', name:'Champion’s Cup paddle',    price:2500, lvl:1, tour:'cup_world', rarity:'legendary', c1:'#f5c542', c2:'#ffffff', power:2, control:2, spin:2, deco:'cup' },
    { id:'head_wc',      slot:'head',   name:'World Champion crown',     price:2500, lvl:1, tour:'cup_world', rarity:'legendary', style:'crown',  c1:'#fff3bf', c2:'#38bdf8', aura:true },
    // wristbands
    { id:'wrist_none',     slot:'wrist', name:'No wristband',   price:0,    lvl:1, c1:'' },
    { id:'wrist_rainbow',  slot:'wrist', name:'Rainbow band',   price:900,  lvl:5, c1:'#ff5c5c', c2:'#4dd2ff', fx:'rainbow' },
    { id:'wrist_gold',     slot:'wrist', name:'Gold band',      price:1200, lvl:6, c1:'#f5c542', c2:'#fff3bf' },
    // victory dances (each has its own original beat)
    { id:'dance_pump',     slot:'dance', name:'Fist Pump',      price:0,    lvl:1, style:'pump',  bpm:120 },
    { id:'dance_dab',      slot:'dance', name:'The Dab',        price:300,  lvl:1, style:'dab',   bpm:140 },
    { id:'dance_robot',    slot:'dance', name:'Robot',          price:400,  lvl:1, style:'robot', bpm:110 },
    { id:'dance_tinikling',slot:'dance', name:'Tinikling Hop',  price:500,  lvl:2, style:'tinikling', bpm:150 },
    { id:'dance_funk',     slot:'dance', name:'Brazilian Funk', price:600,  lvl:2, style:'funk',  bpm:130 },
    { id:'dance_budots',   slot:'dance', name:'Budots',         price:700,  lvl:3, style:'budots', bpm:128 },
    { id:'dance_weng',     slot:'dance', name:'Weng Weng Shuffle', price:800, lvl:3, style:'weng', bpm:118 },
    // balls (visual effects)
    { id:'ball_classic',   slot:'ball', name:'Classic',         price:0,    lvl:1, fx:'none',      c1:'#e8ff3d' },
    { id:'ball_fire',      slot:'ball', name:'Fireball',        price:300,  lvl:1, chest:true, rarity:'rare', fx:'fire',      c1:'#ffb020' },
    { id:'ball_ice',       slot:'ball', name:'Ice comet',       price:300,  lvl:1, chest:true, rarity:'rare', fx:'ice',       c1:'#bfefff' },
    { id:'ball_bolt',      slot:'ball', name:'Lightning',       price:500,  lvl:1, chest:true, rarity:'epic', fx:'lightning', c1:'#fff27a' },
    { id:'ball_rainbow',   slot:'ball', name:'Rainbow',         price:700,  lvl:1, chest:true, rarity:'epic', fx:'rainbow',   c1:'#ff7eb6' },
    { id:'ball_galaxy',    slot:'ball', name:'Galaxy',          price:1200, lvl:1, chest:true, rarity:'legendary', fx:'galaxy',    c1:'#8b5cf6' },
    { id:'ball_gold',      slot:'ball', name:'Golden',          price:1800, lvl:1, chest:true, rarity:'legendary', fx:'gold',      c1:'#f5c542' },
    // courts
    { id:'court_stadium',  slot:'court', name:'Night Stadium',  price:0,    lvl:1 },
    { id:'court_beach',    slot:'court', name:'Sunset Beach',   price:400,  lvl:1, chest:true, rarity:'rare' },
    { id:'court_clay',     slot:'court', name:'Clay Classic',   price:500,  lvl:1, chest:true, rarity:'rare' },
    { id:'court_neon',     slot:'court', name:'Neon City',      price:700,  lvl:1, chest:true, rarity:'epic' },
    { id:'court_park',     slot:'court', name:'Park Grass',     price:600,  lvl:1, chest:true, rarity:'epic' },
    { id:'court_royal',    slot:'court', name:'Royal Arena',    price:1500, lvl:1, chest:true, rarity:'legendary' },
    // AI teammates for 2v2
    { id:'mate_ace',       slot:'partner', name:'Ace',          price:0,    lvl:1, speed:4.5, react:.18, aimSd:.42, mistake:.055, skill:.2,  smash:.75, tScale:1.0, judge:.7, acc:.8 },
    { id:'mate_blaze',     slot:'partner', name:'Blaze',        price:300,  lvl:3, speed:4.9, react:.14, aimSd:.34, mistake:.04,  skill:.28, smash:.82, tScale:.95, judge:.8, acc:.88 },
    { id:'mate_nova',      slot:'partner', name:'Nova',         price:800,  lvl:5, speed:5.2, react:.11, aimSd:.28, mistake:.03,  skill:.36, smash:.88, tScale:.92, judge:.86, acc:.93 },
    { id:'mate_titan',     slot:'partner', name:'Titan',        price:1500, lvl:8, speed:5.5, react:.09, aimSd:.23, mistake:.022, skill:.42, smash:.93, tScale:.89, judge:.92, acc:.97 },
    { id:'mate_zen',       slot:'partner', name:'Zen Master',   price:2500, lvl:10,speed:5.8, react:.07, aimSd:.18, mistake:.015, skill:.5,  smash:.97, tScale:.86, judge:.97, acc:1 },
    // national teammates
    { id:'mate_ph', slot:'partner', name:'Paolo · Philippines', nation:'PH', price:500,  lvl:2, speed:4.7, react:.16, aimSd:.38, mistake:.048, skill:.24, smash:.78, tScale:.98, judge:.75, acc:.84 },
    { id:'mate_us', slot:'partner', name:'Mason · USA',         nation:'US', price:700,  lvl:3, speed:4.9, react:.14, aimSd:.34, mistake:.042, skill:.28, smash:.84, tScale:.95, judge:.8,  acc:.87 },
    { id:'mate_au', slot:'partner', name:'Chloe · Australia',   nation:'AU', price:700,  lvl:3, speed:5.0, react:.14, aimSd:.33, mistake:.042, skill:.27, smash:.8,  tScale:.95, judge:.8,  acc:.88 },
    { id:'mate_jp', slot:'partner', name:'Haruto · Japan',      nation:'JP', price:900,  lvl:4, speed:5.1, react:.12, aimSd:.3,  mistake:.036, skill:.33, smash:.84, tScale:.93, judge:.84, acc:.91 },
    { id:'mate_cn', slot:'partner', name:'Mei · China',         nation:'CN', price:900,  lvl:4, speed:5.0, react:.12, aimSd:.29, mistake:.035, skill:.35, smash:.82, tScale:.93, judge:.85, acc:.92 },
    { id:'mate_kr', slot:'partner', name:'Ji-woo · Korea',      nation:'KR', price:1100, lvl:5, speed:5.2, react:.11, aimSd:.27, mistake:.031, skill:.37, smash:.88, tScale:.91, judge:.87, acc:.93 },
    { id:'mate_br', slot:'partner', name:'Lucas · Brazil',      nation:'BR', price:1100, lvl:5, speed:5.3, react:.11, aimSd:.28, mistake:.032, skill:.35, smash:.92, tScale:.9,  judge:.86, acc:.92 },
    { id:'mate_es', slot:'partner', name:'Sofia · Spain',       nation:'ES', price:1300, lvl:6, speed:5.3, react:.1,  aimSd:.25, mistake:.027, skill:.4,  smash:.9,  tScale:.9,  judge:.89, acc:.95 },
    { id:'mate_in', slot:'partner', name:'Arjun · India',       nation:'IN', price:1300, lvl:6, speed:5.4, react:.1,  aimSd:.25, mistake:.027, skill:.38, smash:.9,  tScale:.89, judge:.9,  acc:.95 },
    { id:'mate_gb', slot:'partner', name:'Oliver · UK',         nation:'GB', price:1600, lvl:7, speed:5.5, react:.09, aimSd:.22, mistake:.022, skill:.42, smash:.93, tScale:.88, judge:.92, acc:.97 },
  ];
  // every outfit piece in 11 colors
  const PALETTE = [['red','Red','#e23b3b'],['orange','Orange','#ff8a3d'],['yellow','Yellow','#ffd23f'],['lime','Lime','#a6f23d'],['teal','Teal','#14b8a6'],
    ['sky','Sky','#38bdf8'],['navy','Navy','#1f3b8c'],['purple','Purple','#7c4dff'],['pink','Pink','#ff7eb6'],['black','Black','#23262e'],['white','White','#f5f7fb']];
  const ink = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) > 150 ? '#14213d' : '#ffffff'; };
  for (const [k, nm, col] of PALETTE) {
    ITEMS.push({ id:'tee_c_' + k,    slot:'top',    name:nm + ' tee',        price:120, lvl:1, style:'tee',     c1:col, c2:ink(col) });
    ITEMS.push({ id:'polo_c_' + k,   slot:'top',    name:nm + ' polo',       price:200, lvl:1, style:'polo',    c1:col, c2:ink(col) });
    ITEMS.push({ id:'shorts_c_' + k, slot:'bottom', name:nm + ' shorts',     price:120, lvl:1, style:'shorts',  c1:col, c2:ink(col) });
    ITEMS.push({ id:'skirt_c_' + k,  slot:'bottom', name:nm + ' skirt',      price:150, lvl:1, style:'skirt',   c1:col, c2:ink(col) });
    ITEMS.push({ id:'shoes_c_' + k,  slot:'shoes',  name:nm + ' sneakers',   price:180, lvl:1, style:'sneaker', c1:col, c2:ink(col) });
    ITEMS.push({ id:'cap_c_' + k,    slot:'head',   name:nm + ' cap',        price:150, lvl:1, style:'cap',     c1:col, c2:ink(col) });
    ITEMS.push({ id:'band_c_' + k,   slot:'head',   name:nm + ' headband',   price:60,  lvl:1, style:'band',    c1:col });
    ITEMS.push({ id:'wrist_' + k,    slot:'wrist',  name:nm + ' wristband',  price:80,  lvl:1, c1:col, c2:ink(col) });
  }
  const BY_ID = {}; ITEMS.forEach(i => { BY_ID[i.id] = i; });
  function rarityOf(it) { return it.rarity || (!it.price ? 'common' : it.price <= 300 ? 'rare' : it.price <= 800 ? 'epic' : 'legendary'); }
  /* ---------- chests ---------- */
  const CHESTS = [
    { id:'chest_rally', name:'Rally Chest',  price:500,  keys:1, odds:{ common:.58, rare:.29, epic:.1,  legendary:.03 } },
    { id:'chest_gold',  name:'Golden Chest', price:1500, keys:0, odds:{ common:.2,  rare:.42, epic:.28, legendary:.1 } },
  ];
  const DUP_REFUND = { common:80, rare:200, epic:450, legendary:1000 };
  const CHEST_POOL = ITEMS.filter(i => i.chest);
  function openChest(p, chestId, useKey, rnd) {
    rnd = rnd || Math.random;
    const ch = CHESTS.find(c => c.id === chestId);
    if (!ch) return 'Unknown chest';
    if (useKey) { if (!ch.keys) return 'Keys only open Rally Chests'; if ((p.keys | 0) < 1) return 'No chest keys left'; p.keys -= 1; }
    else { if ((p.coins | 0) < ch.price) return 'Not enough coins'; p.coins -= ch.price; }
    let r = rnd(), rarity = 'common';
    for (const k of ['legendary', 'epic', 'rare', 'common']) { if (r < ch.odds[k]) { rarity = k; break; } r -= ch.odds[k]; }
    const pool = CHEST_POOL.filter(i => rarityOf(i) === rarity);
    const item = pool[Math.floor(rnd() * pool.length)];
    const dup = p.owned.includes(item.id);
    p.stats = p.stats || {}; p.stats.chests = (p.stats.chests || 0) + 1;
    let refund = 0;
    if (dup) { refund = DUP_REFUND[rarity]; p.coins += refund; } else p.owned.push(item.id);
    return { id: item.id, rarity, dup, refund };
  }
  const SLOTS = ['head', 'hairx', 'top', 'bottom', 'shoes', 'wrist', 'paddle', 'ball', 'court', 'partner', 'dance'];
  const STARTER = ITEMS.filter(i => i.price === 0).map(i => i.id);
  const DEFAULT_EQUIP = { hairx:'hair_own', head:'band_red', top:'tee_white', bottom:'shorts_navy', shoes:'sneak_white', wrist:'wrist_none', paddle:'pad_wood', ball:'ball_classic', court:'court_stadium', partner:'mate_ace', dance:'dance_pump' };
  // every style is open to everyone; the order just puts each body's classic looks first
  const ALL_HAIR = ['short', 'spiky', 'buzz', 'curly', 'mohawk', 'afro', 'undercut', 'manbun', 'ponytail', 'bob', 'long', 'buns', 'pigtails', 'braid', 'pixie', 'twintails'];
  const HAIR_STYLES = { boy:ALL_HAIR.slice(), girl:['ponytail', 'bob', 'long', 'buns', 'pigtails', 'braid', 'pixie', 'twintails', 'short', 'spiky', 'buzz', 'curly', 'mohawk', 'afro', 'undercut', 'manbun'] };
  const HAIR_COLORS = 12;
  const BODY_TYPES = ['slim', 'regular', 'athletic', 'stocky'];
  const NATIONS = { PH:'Philippines', US:'United States', JP:'Japan', KR:'South Korea', CN:'China', AU:'Australia', TH:'Thailand', ID:'Indonesia', VN:'Vietnam', MY:'Malaysia', SG:'Singapore',
    IN:'India', AE:'United Arab Emirates', SA:'Saudi Arabia', TR:'Türkiye', GB:'United Kingdom', IE:'Ireland', FR:'France', DE:'Germany', IT:'Italy', ES:'Spain', NL:'Netherlands',
    SE:'Sweden', NO:'Norway', PL:'Poland', UA:'Ukraine', CA:'Canada', MX:'Mexico', BR:'Brazil', AR:'Argentina', CO:'Colombia', PE:'Peru', NG:'Nigeria' };

  /* ---------- levels ---------- */
  // XP needed to go from level n to n+1 = 100 + 60 * (n - 1)
  function levelInfo(xp) {
    xp = Math.max(0, xp | 0);
    let lvl = 1, need = 100;
    while (xp >= need && lvl < 50) { xp -= need; lvl++; need = 100 + 60 * (lvl - 1); }
    return { level: lvl, into: xp, need };
  }

  /* ---------- DUPR-style rating ----------
   * DUPR is pickleball's real rating scale (2.000 beginner to 8.000 world-best). The game can't read
   * official DUPR, so this estimates a rating on the same scale from in-game MMR. */
  function dupr(mmr) { return Math.max(2, Math.min(8, 2 + Math.max(0, mmr || 0) / MMR_PER_POINT)); }
  function duprTier(d) {
    return d < 3 ? 'Beginner' : d < 3.5 ? 'Intermediate' : d < 4 ? 'Advanced intermediate' : d < 5 ? 'Advanced' : d < 6 ? 'Semi-professional' : d < 7 ? 'Professional' : 'World-best';
  }
  // total XP needed to reach a level (used to set up the owner account)
  function xpForLevel(level) { let xp = 0; for (let n = 1; n < level; n++) xp += 100 + 60 * (n - 1); return xp; }

  /* ---------- rewards ---------- */
  function aiIndex(key) { return LADDER.findIndex(a => a.key === key); }
  function matchRewards(key, won) {
    const i = Math.max(0, aiIndex(key));
    return won ? { coins: 90 + 20 * i, xp: 60 + 8 * i } : { coins: 30 + 6 * i, xp: 25 + 3 * i };
  }
  function rallyRewards(returns) { return { coins: Math.min(60, returns * 2), xp: Math.min(30, returns * 2) }; }
  function onlineRewards(won) { return won ? { coins: 160, xp: 80 } : { coins: 60, xp: 35 }; }
  const DAILY_COINS = 300;
  function claimDaily(p) {
    const today = new Date().toISOString().slice(0, 10);
    if (p.lastDaily === today) return null;
    p.lastDaily = today; p.coins = (p.coins | 0) + DAILY_COINS;
    return { coins: DAILY_COINS };
  }

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
    return { mmr: 0, peak: 0, wins: 0, losses: 0, history: [], bestRally: 0, coins: 300, xp: 0, keys: 1,
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
    if (!p.stats) p.stats = {}; if (!p.ach) p.ach = [];
    return p;
  }
  function addRewards(p, r) {
    const before = levelInfo(p.xp).level;
    p.coins = Math.max(0, (p.coins | 0) + (r.coins | 0));
    p.xp = Math.max(0, (p.xp | 0) + (r.xp | 0));
    const after = levelInfo(p.xp).level;
    if (after > before) p.keys = (p.keys | 0) + (after - before);       // a free chest key for every level up
    const skills = Object.keys(SKILL_LEVELS).filter(s => SKILL_LEVELS[s] > before && SKILL_LEVELS[s] <= after);
    const items = ITEMS.filter(i => i.price > 0 && !i.chest && !i.tour && i.lvl > before && i.lvl <= after).length;
    return { coins: r.coins | 0, xp: r.xp | 0, levelBefore: before, level: after, skills, newItems: items, keys: Math.max(0, after - before) };
  }
  // ranked match against the AI ladder. Returns an error string or the result summary.
  /* ---------- score sanity (pickleball: to 11, win by 2) ---------- */
  function parseScore(score) {
    const m = String(score || '').match(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/);
    if (!m) return null;
    const a = +m[1], b = +m[2], w = Math.max(a, b), l = Math.min(a, b);
    if (w < 11 || w - l < 2 || (w > 11 && w - l !== 2) || w > 40) return null;
    return { a, b, w, l };
  }
  /* ---------- seasons: one per calendar month (UTC) ---------- */
  function seasonId(d) { d = d || new Date(); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
  function seasonEnds(d) { d = d || new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }
  const SEASON_REWARD = { Beginner:{ coins:200, keys:0 }, Intermediate:{ coins:350, keys:1 }, 'Advanced intermediate':{ coins:500, keys:1 }, Advanced:{ coins:800, keys:2 },
    'Semi-professional':{ coins:1200, keys:2 }, Professional:{ coins:2000, keys:3 }, 'World-best':{ coins:3000, keys:4 } };
  function seasonRoll(p) {
    const cur = seasonId();
    if (!p.season) { p.season = cur; p.seasonPeak = p.mmr; return null; }
    if (p.season === cur) return null;
    const tier = duprTier(dupr(p.seasonPeak == null ? p.mmr : p.seasonPeak)), r = SEASON_REWARD[tier];
    p.coins = (p.coins | 0) + r.coins; p.keys = (p.keys | 0) + r.keys;
    p.seasons = (p.seasons || []).concat([{ id:p.season, peak:p.seasonPeak == null ? p.mmr : p.seasonPeak, final:p.mmr, tier }]).slice(-12);
    const from = p.season;
    p.season = cur; p.mmr = Math.round(p.mmr * .75); p.seasonPeak = p.mmr;      // soft reset: keep 75% of your rating
    return { from, tier, coins:r.coins, keys:r.keys };
  }
  /* ---------- daily + weekly challenges ---------- */
  const CH_DAILY = [
    { id:'d_play3', text:'Play 3 matches', stat:'matches', n:3, coins:150 },
    { id:'d_win2', text:'Win 2 ranked matches', stat:'rankedWins', n:2, coins:250 },
    { id:'d_dink15', text:'Hit 15 dinks', stat:'dinks', n:15, coins:150 },
    { id:'d_smash5', text:'Hit 5 smashes or spikes', stat:'smashes', n:5, coins:200 },
    { id:'d_perfect10', text:'Hit 10 Perfect shots', stat:'perfects', n:10, coins:200 },
    { id:'d_points20', text:'Score 20 points', stat:'points', n:20, coins:150 },
    { id:'d_online1', text:'Play an online match', stat:'online', n:1, coins:250 },
    { id:'d_rally10', text:'Reach a 10-shot rally', stat:'longRally', n:10, max:true, coins:200 },
  ];
  const CH_WEEKLY = [
    { id:'w_win10', text:'Win 10 ranked matches', stat:'rankedWins', n:10, coins:800, keys:1 },
    { id:'w_play20', text:'Play 20 matches', stat:'matches', n:20, coins:600, keys:1 },
    { id:'w_smash40', text:'Hit 40 smashes or spikes', stat:'smashes', n:40, coins:700, keys:1 },
    { id:'w_dink120', text:'Hit 120 dinks', stat:'dinks', n:120, coins:700, keys:1 },
    { id:'w_online5', text:'Play 5 online matches', stat:'online', n:5, coins:900, keys:1 },
    { id:'w_perfect60', text:'Hit 60 Perfect shots', stat:'perfects', n:60, coins:800, keys:1 },
  ];
  const CH_BY_ID = {}; CH_DAILY.concat(CH_WEEKLY).forEach(c => { CH_BY_ID[c.id] = c; });
  const dayId = d => (d || new Date()).toISOString().slice(0, 10);
  function weekId(d) { d = d || new Date(); const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7); return 'W' + t.toISOString().slice(0, 10); }
  function pickN(pool, n, key) {
    let h = 9; for (const ch of key) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
    const a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  function ensureChallenges(p) {
    const d = dayId(), w = weekId(); p.ch = p.ch || {};
    if (p.ch.day !== d) { p.ch.day = d; p.ch.d = pickN(CH_DAILY, 3, d).map(c => ({ id:c.id, prog:0, done:false })); }
    if (p.ch.week !== w) { p.ch.week = w; p.ch.w = pickN(CH_WEEKLY, 3, w).map(c => ({ id:c.id, prog:0, done:false })); }
    return p.ch;
  }
  // per-match limits, so a tampered report can't finish everything at once
  const STAT_CAP = { matches:1, rankedWins:1, online:1, dinks:80, smashes:40, perfects:80, points:30, longRally:200 };
  function cleanStats(s) { const o = {}; for (const k in STAT_CAP) o[k] = Math.max(0, Math.min(STAT_CAP[k], Math.floor(+((s || {})[k]) || 0))); return o; }
  /* ---------- achievements ---------- */
  const st = (p, k) => (p.stats && p.stats[k]) || 0;
  const ACHIEVEMENTS = [
    { id:'a_first',   icon:'🏆', name:'First Win',          desc:'Win a ranked match',               test:p => p.wins >= 1, coins:100 },
    { id:'a_w10',     icon:'🔥', name:'On a Roll',          desc:'Win 10 ranked matches',            test:p => p.wins >= 10, coins:300 },
    { id:'a_w50',     icon:'⭐', name:'Veteran',            desc:'Win 50 ranked matches',            test:p => p.wins >= 50, coins:800, keys:1 },
    { id:'a_w100',    icon:'💯', name:'Centurion',          desc:'Win 100 ranked matches',           test:p => p.wins >= 100, coins:1500, keys:2 },
    { id:'a_ladder',  icon:'🪜', name:'Ladder Climber',     desc:'Beat 8 different opponents',       test:p => (p.beaten || []).length >= 8, coins:600, keys:1 },
    { id:'a_king',    icon:'👑', name:'Long Live the King', desc:'Beat The Pickle King',             test:p => (p.beaten || []).includes('king'), coins:3000, keys:3 },
    { id:'a_adv',     icon:'📈', name:'Advanced',           desc:'Reach a 4.0 rating',               test:p => dupr(p.peak || p.mmr) >= 4, coins:500, keys:1 },
    { id:'a_semi',    icon:'🥉', name:'Semi-Pro',           desc:'Reach a 5.0 rating',               test:p => dupr(p.peak || p.mmr) >= 5, coins:800, keys:1 },
    { id:'a_pro',     icon:'🥈', name:'Pro',                desc:'Reach a 6.0 rating',               test:p => dupr(p.peak || p.mmr) >= 6, coins:1200, keys:2 },
    { id:'a_world',   icon:'🥇', name:'World-Best',         desc:'Reach a 7.0 rating',               test:p => dupr(p.peak || p.mmr) >= 7, coins:2000, keys:3 },
    { id:'a_smash',   icon:'💥', name:'Smash Bros',         desc:'Hit 100 smashes or spikes',        test:p => st(p, 'smashes') >= 100, coins:500 },
    { id:'a_dink',    icon:'🥒', name:'Kitchen Master',     desc:'Hit 300 dinks',                    test:p => st(p, 'dinks') >= 300, coins:500 },
    { id:'a_perfect', icon:'🎯', name:'Perfectionist',      desc:'Hit 200 Perfect shots',            test:p => st(p, 'perfects') >= 200, coins:600 },
    { id:'a_rally',   icon:'♾️', name:'Marathon Rally',     desc:'Reach a 30-shot rally',            test:p => st(p, 'longRally') >= 30 || (p.bestRally || 0) >= 30, coins:400 },
    { id:'a_online',  icon:'🌐', name:'Online Debut',       desc:'Play an online match',             test:p => st(p, 'online') >= 1, coins:200 },
    { id:'a_online25',icon:'✈️', name:'Globetrotter',       desc:'Play 25 online matches',           test:p => st(p, 'online') >= 25, coins:800, keys:1 },
    { id:'a_chest',   icon:'🎁', name:'Treasure Hunter',    desc:'Open your first chest',            test:p => st(p, 'chests') >= 1, coins:100 },
    { id:'a_collect', icon:'💎', name:'Collector',          desc:'Own 15 chest items',               test:p => CHEST_POOL.filter(i => p.owned.includes(i.id)).length >= 15, coins:1000, keys:1 },
    { id:'a_friend',  icon:'🤝', name:'Better Together',    desc:'Make a friend',                    test:p => (p.friends || []).length >= 1, coins:150 },
    { id:'a_grind',   icon:'📅', name:'Daily Grinder',      desc:'Complete 20 challenges',           test:p => st(p, 'challenges') >= 20, coins:600, keys:1 },
    { id:'a_season',  icon:'🗓️', name:'Season Veteran',     desc:'Finish a season',                  test:p => (p.seasons || []).length >= 1, coins:300 },
    { id:'a_cup',     icon:'🏆', name:'Trophy Cabinet',     desc:'Win any tournament',               test:p => Object.values(p.trophies || {}).some(n => n > 0), coins:500, keys:1 },
    { id:'a_wc',      icon:'🌍', name:'World Champion',     desc:'Win the World Championship',       test:p => ((p.trophies || {}).cup_world || 0) > 0, coins:3000, keys:3 },
  ];
  function checkAchievements(p) {
    p.ach = p.ach || []; const got = [];
    for (const a of ACHIEVEMENTS) if (!p.ach.includes(a.id) && a.test(p)) { p.ach.push(a.id); p.coins = (p.coins | 0) + (a.coins || 0); p.keys = (p.keys | 0) + (a.keys || 0); got.push(a.id); }
    return got;
  }
  // add one match's stats: challenges, lifetime stats and achievements
  function trackStats(p, raw) {
    const s = cleanStats(raw), ch = ensureChallenges(p), out = { challenges:[], achievements:[], coins:0, keys:0 };
    p.stats = p.stats || {};
    for (const k in s) { if (k === 'longRally') p.stats.longRally = Math.max(p.stats.longRally || 0, s[k]); else p.stats[k] = (p.stats[k] || 0) + s[k]; }
    for (const c of ch.d.concat(ch.w)) {
      const def = CH_BY_ID[c.id]; if (!def || c.done) continue;
      c.prog = def.max ? Math.max(c.prog, s[def.stat] || 0) : c.prog + (s[def.stat] || 0);
      if (c.prog >= def.n) { c.done = true; c.prog = def.n; p.coins = (p.coins | 0) + def.coins; p.keys = (p.keys | 0) + (def.keys || 0); p.stats.challenges = (p.stats.challenges || 0) + 1; out.challenges.push(c.id); out.coins += def.coins; out.keys += def.keys || 0; }
    }
    out.achievements = checkAchievements(p);
    return out;
  }
  /* ---------- names: block offensive words (also common leetspeak) ---------- */
  const BAD_SUB = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'nigg', 'fagg', 'retard', 'whore', 'slut', 'rapist', 'nazi', 'hitler', 'porn', 'penis', 'vagina', 'pussy',
    'putang', 'tangina', 'tarantado', 'pakyu', 'pokpok', 'kantot', 'hindot', 'burat', 'kupal', 'ulol', 'gago', 'putragis', 'pucha', 'bilat', 'jakol'];
  const BAD_WORD = ['sex', 'dick', 'cock', 'cum', 'tits', 'puta', 'tanga', 'bobo', 'titi', 'tite', 'puke', 'leche', 'shet', 'kkk', 'fck', 'fuk', 'btch', 'pota', 'tae', 'bayag'];
  function badName(name) {
    const raw = String(name || '').toLowerCase();
    const leet = raw.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/@/g, 'a').replace(/\$/g, 's');
    const flat = leet.replace(/[^a-z]/g, '');
    if (BAD_SUB.some(w => flat.includes(w))) return true;
    const tokens = raw.replace(/[0-9]/g, '_').split(/[_\s]+/).concat(leet.split(/[_\s]+/), [flat]);
    return tokens.some(t => BAD_WORD.includes(t));
  }

  /* Fair ranking vs AI:
   * - an opponent more than 1.0 PR below you is Practice: no rating change, no W–L, 1/4 coins and XP
   * - an "easy win" (normal rating math gives less than +3) pays +1/+2/+3 by score margin, and half coins and XP */
  const PRACTICE_GAP = 1.0;
  function isPractice(mmr, key) { const ai = LADDER[aiIndex(key)]; return !!ai && dupr(mmr) - ai.dupr > PRACTICE_GAP + 1e-9; }
  function rawElo(mmr, opp, won) { const exp = 1 / (1 + Math.pow(10, (opp - mmr) / 400)); return Math.round(40 * ((won ? 1 : 0) - exp)); }
  function marginBonus(score) { const sc = parseScore(score); if (!sc) return 1; const m = sc.w - sc.l; return m >= 7 ? 3 : m >= 4 ? 2 : 1; }
  function scaleRew(r, k) { return { coins: Math.round(r.coins * k), xp: Math.round(r.xp * k) }; }
  // what a match against this opponent would be worth, for the opponent list
  function matchPreview(mmr, key) {
    const ai = LADDER[aiIndex(key)]; if (!ai) return null;
    const base = matchRewards(key, true);
    if (isPractice(mmr, key)) return { practice: true, win: 0, loss: 0, coins: scaleRew(base, .25).coins };
    const rw = rawElo(mmr, ai.mmr, true), easy = rw < 3;
    return { practice: false, easy, win: easy ? '1–3' : rw, loss: Math.max(3, -rawElo(mmr, ai.mmr, false)), coins: easy ? scaleRew(base, .5).coins : base.coins };
  }

  /* ---------- tournaments: 8-team knockout (Quarterfinal, Semifinal, Final) ---------- */
  const CUPS = [
    { id:'cup_club',  name:'Club Cup',           lo:2.3, hi:3.8, need:0,   prev:null,       coins:[100, 150, 350],  xp:[60, 80, 150],   keys:1, prizes:['top_cup_club', 'dance_trophy'] },
    { id:'cup_open',  name:'Pro Open',           lo:3.8, hi:5.4, need:3.5, prev:'cup_club', coins:[180, 260, 700],  xp:[90, 120, 250],  keys:2, prizes:['top_cup_open', 'head_laurel'] },
    { id:'cup_world', name:'World Championship', lo:5.6, hi:8.0, need:5.0, prev:'cup_open', coins:[320, 480, 1400], xp:[140, 200, 400], keys:3, prizes:['pad_cup', 'head_wc'] },
  ];
  const CUP_BY = {}; CUPS.forEach(c => { CUP_BY[c.id] = c; });
  const ROUND_NAME = ['Quarterfinal', 'Semifinal', 'Final'];
  function cupUnlocked(p, cupId) { const c = CUP_BY[cupId]; if (!c) return false; return !c.need || dupr(p.peak || p.mmr || 0) >= c.need || ((p.trophies || {})[c.prev] || 0) > 0; }
  function tourNew(cupId, rnd, myNation) {
    rnd = rnd || Math.random;
    const c = CUP_BY[cupId], pool = LADDER.filter(a => a.dupr >= c.lo && a.dupr <= c.hi);
    const opp = [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]].map(a => a.key);
    const nat = Object.keys(NATIONS).filter(k => k !== myNation);
    for (let i = nat.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [nat[i], nat[j]] = [nat[j], nat[i]]; }
    const any = () => pool[Math.floor(rnd() * pool.length)].key;
    // seats: 0 = you; your path is seat 1 (QF), then the winner of 2v3 (SF), then the winner of 4–7 (F)
    const teams = [{ you:true }];
    for (let i = 1; i < 8; i++) teams.push({ nation:nat[i - 1], name:'Team ' + NATIONS[nat[i - 1]], ai:any() });
    teams[1].ai = opp[0];
    const sfSeat = 2 + Math.floor(rnd() * 2); teams[sfSeat].ai = opp[1];
    const fSeat = 4 + Math.floor(rnd() * 4); teams[fSeat].ai = opp[2];
    const other = (a, b, keep) => keep === a ? a : keep === b ? b : (rnd() < .5 ? a : b);
    const qf = [0, other(2, 3, sfSeat), other(4, 5, fSeat), other(6, 7, fSeat)];
    const sf = [0, fSeat < 6 ? qf[2] : qf[3]];
    return { id:Math.floor(rnd() * 1e9).toString(36), cup:cupId, round:0, alive:true, champion:false, teams, path:[1, sfSeat, fSeat], qf, sf, t:Date.now() };
  }
  function tourOpp(t) { return t && t.alive ? t.teams[t.path[t.round]] : null; }
  // give the rewards for a finished tournament match (also used for each player of an online team)
  function tourReward(p, cupId, round, won) {
    const c = CUP_BY[cupId], out = { won, round, champion:false, prizes:[], dupCoins:0, keys:0 };
    if (!c) return out;
    if (!won) { Object.assign(out, addRewards(p, { coins:30 * (round + 1), xp:20 * (round + 1) })); return out; }
    Object.assign(out, addRewards(p, { coins:c.coins[round], xp:c.xp[round] }));
    if (round >= 2) {
      out.champion = true; p.trophies = p.trophies || {}; p.trophies[c.id] = (p.trophies[c.id] || 0) + 1;
      for (const id of c.prizes) { if (!p.owned.includes(id)) { p.owned.push(id); out.prizes.push(id); } else { p.coins += 500; out.dupCoins += 500; } }
      p.keys = (p.keys | 0) + c.keys; out.keys = c.keys;
    }
    out.achievements = checkAchievements(p);
    return out;
  }
  function tourResult(p, t, won, score) {
    if (!t || !t.alive) return 'This tournament is over';
    const sc = parseScore(score); if (!sc || won !== (sc.a > sc.b)) return 'That score isn’t a finished game';
    const r = t.round, res = tourReward(p, t.cup, r, won);
    if (won) { t.round++; if (t.round >= 3) { t.alive = false; t.champion = true; } } else t.alive = false;
    t.t = Date.now();
    return res;
  }

  function applyMatch(p, key, won, score, doubles) {
    const ai = LADDER[aiIndex(key)];
    if (!ai) return 'Unknown opponent';
    if (!aiUnlocked(p.beaten, key)) return 'That opponent is still locked';
    const practice = isPractice(p.mmr, key);
    let delta = 0, easy = false;
    if (!practice) {
      delta = elo(p.mmr, ai.mmr, won);
      if (won && rawElo(p.mmr, ai.mmr, true) < 3) { easy = true; delta = marginBonus(score); }   // easy win: +1/+2/+3 by margin
      p.mmr = Math.max(0, p.mmr + delta);
      p.peak = Math.max(p.peak || 0, p.mmr); p.seasonPeak = Math.max(p.seasonPeak || 0, p.mmr);
      if (won) p.wins++; else p.losses++;
    }
    let unlockedAi = null;
    if (won && !p.beaten.includes(key)) {
      p.beaten.push(key);
      const next = LADDER[aiIndex(key) + 1];
      if (next) unlockedAi = next.key;
    }
    p.history = [{ opp: doubles ? ai.name + ' pair' : ai.name, mode: (practice ? 'Practice · ' : '') + (doubles ? 'Doubles' : 'Singles'), score: String(score || '').slice(0, 9), delta, mmr: p.mmr, win: !!won, practice, t: Date.now() }]
      .concat(p.history || []).slice(0, 20);
    const rew = addRewards(p, scaleRew(matchRewards(key, won), practice ? .25 : easy ? .5 : 1));
    return Object.assign({ delta, unlockedAi, practice, easy }, rew);
  }
  function buy(p, id) {
    const it = BY_ID[id];
    if (!it) return 'That item doesn’t exist';
    if (p.owned.includes(id)) return 'You already own this';
    if (it.chest) return 'This one only comes from chests';
    if (it.tour) return 'This one is only won in tournaments';
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
    const out = { gender, skin: Math.max(0, Math.min(3, l.skin | 0)), hair: Math.max(0, Math.min(HAIR_COLORS - 1, l.hair | 0)),
      hairStyle: styles.includes(l.hairStyle) ? l.hairStyle : styles[0],
      body: BODY_TYPES.includes(l.body) ? l.body : 'regular',
      height: Math.max(150, Math.min(200, Math.round(+l.height || (gender === 'girl' ? 165 : 175)))),
      nation: NATIONS[l.nation] ? l.nation : '' };
    for (const s of ['hairx', 'head', 'top', 'bottom', 'shoes', 'wrist', 'paddle', 'ball', 'dance']) { const it = BY_ID[l[s]]; out[s] = it && it.slot === s ? it.id : DEFAULT_EQUIP[s]; }
    return out;
  }

  const API = { VERSION: 16, CUPS, CUP_BY, ROUND_NAME, cupUnlocked, tourNew, tourOpp, tourReward, tourResult, PRACTICE_GAP, isPractice, matchPreview, parseScore, seasonId, seasonEnds, seasonRoll, SEASON_REWARD, CH_DAILY, CH_WEEKLY, CH_BY_ID, ensureChallenges, cleanStats, trackStats,
    ACHIEVEMENTS, checkAchievements, badName, LADDER, SKILL_LEVELS, ITEMS, BY_ID, SLOTS, STARTER, DEFAULT_EQUIP, HAIR_STYLES, ALL_HAIR, HAIR_COLORS, BODY_TYPES, NATIONS,
    rarityOf, CHESTS, CHEST_POOL, DUP_REFUND, openChest,
    levelInfo, aiIndex, dupr, duprTier, xpForLevel, claimDaily, DAILY_COINS, PALETTE, matchRewards, rallyRewards, onlineRewards, elo, aiUnlocked,
    newProgress, normalize, addRewards, applyMatch, buy, equip, cleanLook };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PR_CATALOG = API;
})(typeof window !== 'undefined' ? window : globalThis);
