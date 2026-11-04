
if (window.__prStop) return;
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const TAU = Math.PI * 2, L = 13.41, HW = 3.05, NET = L / 2, KIT = 2.13, GRAV = 9.8, COST = 35, REACH = 0.95;
const PG0 = .80, PG1 = .93, PMAX = 1.15, AUTO_Q = .62;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function gauss(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const r3 = v => Math.round(v * 1000) / 1000;

/* ---------- looks ---------- */
const SKINS = ['#f7d7b8', '#e3b089', '#b97a4c', '#7b4a2b'];
const HAIRS = ['#1c130d', '#5b3a21', '#c8892f', '#e6dccb', '#d94a5a', '#8a3b1d', '#f1ead2', '#2f6fd6', '#ff7eb6', '#7c4dff', '#22b573', '#bfc7d5'];
const CAT = window.PR_CATALOG;
const IT = id => CAT.BY_ID[id] || {};
const itemsOf = slot => CAT.ITEMS.filter(i => i.slot === slot);
/* flags drawn as tiny SVGs (flag emoji don't show on Windows). viewBox 30×20 */
const FLAG = {
  PH:['h:#0038a8,#ce1126', 'tri:#ffffff:17', 'circ:5.6,10,2.3,#fcd116'], US:['h:#b22234,#fff,#b22234,#fff,#b22234,#fff,#b22234,#fff,#b22234,#fff,#b22234,#fff,#b22234', 'rect:0,0,12,10.8,#3c3b6e'],
  JP:['h:#fff', 'circ:15,10,6,#bc002d'], KR:['h:#fff', 'circ:15,10,5,#cd2e3a', 'half:15,10,5,#0047a0'], CN:['h:#de2910', 'star:6,6,3.6,#ffde00'],
  TH:['h:#a51931,#f4f5f8,#2d2a4a,#2d2a4a,#f4f5f8,#a51931'], ID:['h:#ce1126,#fff'], VN:['h:#da251d', 'star:15,10,5.4,#ffff00'],
  MY:['h:#cc0001,#fff,#cc0001,#fff,#cc0001,#fff,#cc0001,#fff,#cc0001,#fff,#cc0001,#fff,#cc0001,#fff', 'rect:0,0,15,11.4,#010066', 'circ:6,5.7,3.4,#ffcc00', 'circ:7.3,5.7,2.8,#010066', 'star:11.2,5.7,2,#ffcc00'],
  SG:['h:#ef3340,#fff', 'circ:6,5,3,#fff', 'circ:7.2,5,2.7,#ef3340'], IN:['h:#ff9933,#fff,#138808', 'ring:15,10,2.5,#000080'],
  AE:['h:#00732f,#fff,#000', 'rect:0,0,7.5,20,#ff0000'], SA:['h:#006c35', 'rect:7,11.6,16,1.4,#fff'], TR:['h:#e30a17', 'circ:11,10,5,#fff', 'circ:12.3,10,4,#e30a17', 'star:17.2,10,2.4,#fff'],
  GB:['h:#012169', 'diag:#fff:4', 'diag:#c8102e:1.5', 'cross:15,10,6,#fff', 'cross:15,10,3.6,#c8102e'], IE:['v:#169b62,#fff,#ff883e'], FR:['v:#0055a4,#fff,#ef4135'],
  DE:['h:#000,#dd0000,#ffce00'], IT:['v:#009246,#fff,#ce2b37'], ES:['h:#aa151b,#f1bf00,#f1bf00,#aa151b'], NL:['h:#ae1c28,#fff,#21468b'],
  SE:['h:#006aa7', 'nordic:#fecc00:3'], NO:['h:#ba0c2f', 'nordic:#fff:4.4', 'nordic:#00205b:2.2'], PL:['h:#fff,#dc143c'], UA:['h:#0057b7,#ffd700'],
  CA:['v:#d52b1e,#fff,#fff,#d52b1e', 'diamond:15,10,4,#d52b1e'], MX:['v:#006847,#fff,#ce1126', 'circ:15,10,2.6,#8c5a2b'],
  BR:['h:#009c3b', 'rhomb:15,10,12,7.4,#ffdf00', 'circ:15,10,4,#002776'], AR:['h:#74acdf,#fff,#74acdf', 'circ:15,10,2.2,#f6b40e'],
  CO:['h:#fcd116,#fcd116,#003893,#ce1126'], PE:['v:#d91023,#fff,#d91023'], NG:['v:#008751,#fff,#008751'],
};
const NATION_CODES = Object.keys(CAT.NATIONS);
const FLAG_SVG = {};
function flagSVG(code){
  if (FLAG_SVG[code] !== undefined) return FLAG_SVG[code];
  const spec = FLAG[code]; if (!spec) return (FLAG_SVG[code] = '');
  let out = '';
  for (const part of spec){
    const [k, a, b] = part.split(':'), n = (a || '').split(',').map(Number);
    if (k === 'h' || k === 'v'){ const cols = a.split(','), w = (k === 'h' ? 20 : 30) / cols.length; cols.forEach((col, i) => { out += k === 'h' ? `<rect x="0" y="${i * w}" width="30" height="${w + .05}" fill="${col}"/>` : `<rect x="${i * w}" y="0" width="${w + .05}" height="20" fill="${col}"/>`; }); }
    else if (k === 'tri') out += `<path d="M0 0L${b} 10L0 20z" fill="${a}"/>`;
    else if (k === 'circ') out += `<circle cx="${n[0]}" cy="${n[1]}" r="${n[2]}" fill="${a.split(',')[3]}"/>`;
    else if (k === 'ring') out += `<circle cx="${n[0]}" cy="${n[1]}" r="${n[2]}" fill="none" stroke="${a.split(',')[3]}" stroke-width=".9"/>`;
    else if (k === 'half') out += `<path d="M${n[0] - n[2]} ${n[1]}a${n[2]} ${n[2]} 0 0 0 ${n[2] * 2} 0z" fill="${a.split(',')[3]}"/>`;
    else if (k === 'rect') out += `<rect x="${n[0]}" y="${n[1]}" width="${n[2]}" height="${n[3]}" fill="${a.split(',')[4]}"/>`;
    else if (k === 'star'){ const [cx, cy, r] = n; let d = ''; for (let i = 0; i < 10; i++){ const ang = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .4 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(ang) * rr2).toFixed(2) + ' ' + (cy + Math.sin(ang) * rr2).toFixed(2); } out += `<path d="${d}z" fill="${a.split(',')[3]}"/>`; }
    else if (k === 'diag') out += `<path d="M0 0L30 20M30 0L0 20" stroke="${a}" stroke-width="${b}"/>`;
    else if (k === 'cross') out += `<rect x="${n[0] - n[2] / 2}" y="0" width="${n[2]}" height="20" fill="${a.split(',')[3]}"/><rect x="0" y="${n[1] - n[2] / 2}" width="30" height="${n[2]}" fill="${a.split(',')[3]}"/>`;
    else if (k === 'nordic') out += `<rect x="${10 - b / 2}" y="0" width="${b}" height="20" fill="${a}"/><rect x="0" y="${10 - b / 2}" width="30" height="${b}" fill="${a}"/>`;
    else if (k === 'diamond') out += `<path d="M${n[0]} ${n[1] - n[2]}L${n[0] + n[2]} ${n[1]}L${n[0]} ${n[1] + n[2]}L${n[0] - n[2]} ${n[1]}z" fill="${a.split(',')[3]}"/>`;
    else if (k === 'rhomb') out += `<path d="M${n[0]} ${n[1] - n[3]}L${n[0] + n[2]} ${n[1]}L${n[0]} ${n[1] + n[3]}L${n[0] - n[2]} ${n[1]}z" fill="${a.split(',')[4]}"/>`;
  }
  return (FLAG_SVG[code] = `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><clipPath id="fc"><rect width="30" height="20" rx="2.5"/></clipPath><g clip-path="url(#fc)">${out}</g><rect width="30" height="20" rx="2.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"/></svg>`);
}
function flagHTML(code, h = 13){ const svg = code && flagSVG(code); return svg ? `<span class="flag" title="${esc(CAT.NATIONS[code])}" style="width:${h * 1.5}px; height:${h}px">${svg}</span>` : ''; }
const FLAG_IMG = {};
function flagImg(code){
  if (!code || !FLAG[code]) return null;
  if (!FLAG_IMG[code]){ const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(flagSVG(code)); FLAG_IMG[code] = im; }
  return FLAG_IMG[code].complete ? FLAG_IMG[code] : null;
}
const BALL_IDS = itemsOf('ball').map(i => i.id), COURT_IDS = itemsOf('court').map(i => i.id);
const SLOT_NAME = { hairx:'Special hair', head:'Hats', top:'Shirts', bottom:'Shorts & skirts', shoes:'Shoes', wrist:'Wristband', paddle:'Paddle', ball:'Ball', court:'Court', partner:'2v2 teammate', dance:'Victory dance' };
const HAIR_NAME = { short:'Short', spiky:'Spiky', buzz:'Buzz', curly:'Curly', ponytail:'Ponytail', bob:'Bob', long:'Long', buns:'Buns',
  mohawk:'Mohawk', afro:'Afro', undercut:'Undercut', manbun:'Man bun', pigtails:'Pigtails', braid:'Braid', pixie:'Pixie', twintails:'Twin tails' };
const BODY_NAME = { slim:'Slim', regular:'Regular', athletic:'Athletic', stocky:'Stocky' };
const BODY_MOD = { slim:{ sh:-.02, waist:-.02, hip:-.012, thigh:-.02, calf:-.015, arm:-.015, fore:-.012 }, regular:{},
  athletic:{ sh:.03, waist:.004, arm:.014, fore:.009, thigh:.014, calf:.009, neck:.01 }, stocky:{ sh:.03, waist:.055, hip:.04, thigh:.026, calf:.016, arm:.02, fore:.014, neck:.016 } };
const BODY_CACHE = {};
function bodyOf(girl, type){
  const k = (girl ? 'g' : 'b') + (type || 'regular');
  if (!BODY_CACHE[k]){ const b = Object.assign({}, girl ? BODY.girl : BODY.boy), m = BODY_MOD[type] || {}; for (const f in m) b[f] += m[f]; BODY_CACHE[k] = b; }
  return BODY_CACHE[k];
}
// fixed looks for the AI teammates you can unlock
const MATE_LOOK = {
  mate_ace:   { gender:'boy',  skin:1, hair:0, hairStyle:'short',    head:'cap_navy',     top:'polo_green',  bottom:'shorts_navy',  shoes:'sneak_white', paddle:'pad_blade' },
  mate_blaze: { gender:'girl', skin:2, hair:4, hairStyle:'ponytail', head:'band_red',     top:'tank_black',  bottom:'shorts_red',   shoes:'run_neon',    paddle:'pad_spin' },
  mate_nova:  { gender:'girl', skin:0, hair:3, hairStyle:'bob',      head:'visor_white',  top:'jersey_lime', bottom:'skirt_white',  shoes:'court_blue',  paddle:'pad_control' },
  mate_titan: { gender:'boy',  skin:3, hair:0, hairStyle:'buzz',     head:'head_none',    top:'hoodie_gray', bottom:'long_khaki',   shoes:'high_red',    paddle:'pad_carbon' },
  mate_zen:   { gender:'boy',  skin:1, hair:3, hairStyle:'curly',    head:'crown_gold',   top:'kit_gold',    bottom:'track_white',  shoes:'kicks_gold',  paddle:'pad_phoenix' },
  mate_ph: { gender:'boy',  skin:1, hair:0, hairStyle:'short',    nation:'PH', head:'band_c_yellow', top:'jer_ph', bottom:'shorts_navy',    shoes:'sneak_white',   paddle:'pad_blade',   body:'athletic', height:171 },
  mate_us: { gender:'boy',  skin:0, hair:2, hairStyle:'undercut', nation:'US', head:'cap_navy',      top:'jer_us', bottom:'shorts_c_white', shoes:'shoes_c_red',   paddle:'pad_carbon',  body:'athletic', height:186 },
  mate_au: { gender:'girl', skin:0, hair:3, hairStyle:'ponytail', nation:'AU', head:'visor_white',   top:'jer_au', bottom:'skirt_c_lime',   shoes:'shoes_c_yellow',paddle:'pad_tropic',  body:'regular',  height:170 },
  mate_jp: { gender:'boy',  skin:0, hair:0, hairStyle:'spiky',    nation:'JP', head:'head_none',     top:'jer_jp', bottom:'shorts_c_navy',  shoes:'shoes_c_white', paddle:'pad_katana',  body:'slim',     height:174 },
  mate_cn: { gender:'girl', skin:0, hair:0, hairStyle:'buns',     nation:'CN', head:'head_none',     top:'jer_cn', bottom:'skirt_c_red',    shoes:'shoes_c_red',   paddle:'pad_dragon',  body:'slim',     height:164 },
  mate_kr: { gender:'girl', skin:0, hair:0, hairStyle:'bob',      nation:'KR', head:'band_c_red',    top:'jer_kr', bottom:'shorts_c_white', shoes:'shoes_c_white', paddle:'pad_neon',    body:'regular',  height:166 },
  mate_br: { gender:'boy',  skin:2, hair:0, hairStyle:'curly',    nation:'BR', head:'head_none',     top:'jer_br', bottom:'shorts_c_navy',  shoes:'shoes_c_yellow',paddle:'pad_lava',    body:'athletic', height:180 },
  mate_es: { gender:'girl', skin:1, hair:1, hairStyle:'long',     nation:'ES', head:'cap_c_red',     top:'jer_es', bottom:'skirt_c_yellow', shoes:'shoes_c_red',   paddle:'pad_petals',  body:'regular',  height:168 },
  mate_in: { gender:'boy',  skin:2, hair:0, hairStyle:'short',    nation:'IN', head:'head_none',     top:'jer_in', bottom:'shorts_c_navy',  shoes:'shoes_c_orange',paddle:'pad_glacier', body:'regular',  height:177 },
  mate_lando: { gender:'boy', skin:2, hair:0, hairStyle:'curly', nation:'PH', head:'head_none', top:'tee_worn', bottom:'bot_worn', shoes:'shoes_tsinelas', paddle:'pad_tape', wrist:'wrist_none', body:'athletic', height:174, dance:'dance_budots' },
  mate_gb: { gender:'boy',  skin:0, hair:5, hairStyle:'undercut', nation:'GB', head:'head_none',     top:'jer_gb', bottom:'shorts_c_navy',  shoes:'shoes_c_white', paddle:'pad_mecha',   body:'athletic', height:183 },
};

