/* ---------- audio (with network echo for online guests) ---------- */
let actx = null;
function ensureAudio(){
  try {
    if (!actx){
      actx = new (window.AudioContext || window.webkitAudioContext)();
      // iOS unlock: play one silent frame inside the user gesture
      const b = actx.createBuffer(1, 1, 22050), s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(0);
    }
    if (actx.state === 'suspended') actx.resume();
  } catch (e) {}
}
function tone(f, dur, type = 'triangle', vol = .2, slide = 1, delay = 0){
  if (!data.sound || !actx || G.mode === 'demo') return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .03);
}
function playSfx(k){
  if (k === 'hit'){ tone(560, .07, 'square', .07, .55); tone(1500, .03, 'triangle', .06); }
  else if (k === 'perfect'){ tone(1046, .12, 'triangle', .1); tone(1568, .14, 'sine', .07, 1, .05); }
  else if (k === 'smash'){ tone(320, .2, 'sawtooth', .1, .35); tone(1800, .05, 'triangle', .08); }
  else if (k === 'skill'){ tone(760, .12, 'triangle', .1, 1.6); }
  else if (k === 'bounce'){ tone(240, .06, 'sine', .12, .7); }
  else if (k === 'net'){ tone(150, .22, 'sine', .16, .6); }
  else if (k === 'point'){ tone(660, .12, 'triangle', .12); tone(880, .16, 'triangle', .12, 1, .11); }
  else if (k === 'lose'){ tone(420, .14, 'triangle', .1); tone(300, .2, 'triangle', .1, 1, .12); }
  else if (k === 'win'){ [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .12, 1, i * .1)); }
  else if (k === 'tick'){ tone(900, .03, 'square', .04); }
}
/* ---------- music: menu loop + victory dance beats ---------- */
const MUSIC = { cur:null, timer:null, noise:null, onEnd:null };
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
function noiseBuf(){ if (!MUSIC.noise){ const b = actx.createBuffer(1, actx.sampleRate, actx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; MUSIC.noise = b; } return MUSIC.noise; }
function mKick(t, v, d){ const o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .14); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .24); o.connect(g).connect(d); o.start(t); o.stop(t + .26); }
function mNoise(t, v, d, f, q, dur, type){ const src = actx.createBufferSource(); src.buffer = noiseBuf(); const fl = actx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const g = actx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); src.connect(fl).connect(g).connect(d); src.start(t, Math.random() * .5); src.stop(t + dur + .02); }
const mSnare = (t, v, d) => mNoise(t, v, d, 1800, .8, .16), mHat = (t, v, d) => mNoise(t, v, d, 8000, .7, .04, 'highpass'), mClap = (t, v, d) => mNoise(t, v, d, 1200, 1.4, .12);
function mTone(t, f, dur, type, v, d, glide, cutoff){
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  if (cutoff){ const fl = actx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; o.connect(fl).connect(g); } else o.connect(g);
  g.connect(d); o.start(t); o.stop(t + dur + .03);
}
function mWobble(t, f, dur, v, d){   // the "weng weng" synth: a saw whose filter opens and closes twice
  const o = actx.createOscillator(), fl = actx.createBiquadFilter(), g = actx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .94, t + dur);
  fl.type = 'lowpass'; fl.Q.value = 9; fl.frequency.setValueAtTime(180, t); fl.frequency.linearRampToValueAtTime(2200, t + dur * .25); fl.frequency.linearRampToValueAtTime(260, t + dur * .5); fl.frequency.linearRampToValueAtTime(1800, t + dur * .75); fl.frequency.linearRampToValueAtTime(200, t + dur);
  g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + dur * .9); g.gain.linearRampToValueAtTime(.0001, t + dur);
  o.connect(fl).connect(g).connect(d); o.start(t); o.stop(t + dur + .02);
}
const mWood = (t, f, v, d) => mTone(t, f, .07, 'sine', v, d);
const PAT = (str, i) => str[i % str.length] === 'x';
const TRACKS = {
  menu: { bpm:104, play(i, t, sd, d){
    const s = i % 16, bar = Math.floor(i / 16) % 4, CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]][bar];
    if (s % 4 === 0) mKick(t, .5, d); if (s === 4 || s === 12) mClap(t, .14, d); if (s % 2 === 1) mHat(t, .05, d);
    if (s === 0) for (const n of CH) mTone(t, NOTE(n), sd * 15, 'triangle', .035, d, 0, 1400);
    if (s % 4 === 0 || s === 14) mTone(t, NOTE(CH[0] - 24), sd * 2.5, 'square', .06, d, 0, 500);
    if (s % 2 === 0) mTone(t, NOTE(CH[(s / 2) % 3] + 12 + (bar === 3 && s > 8 ? 2 : 0)), sd * 1.6, 'triangle', .025, d, 0, 2400);
  } },
  funk: { bpm:130, play(i, t, sd, d){   // Brazilian funk groove
    if (PAT('x..x..x...x..x..', i)) mKick(t, .8, d); if (i % 16 === 4 || i % 16 === 12) mClap(t, .35, d);
    if (PAT('..x.x..x..x.x..x', i)) mTone(t, NOTE(i % 3 ? 52 : 55), .09, 'sine', .3, d);
    if (PAT('x..x..x...x.....', i)) mTone(t, NOTE([62, 65, 62, 60][(i >> 4) % 4]), .12, 'square', .07, d, 0, 1800);
    mHat(t, i % 2 ? .04 : .07, d);
  } },
  budots: { bpm:128, play(i, t, sd, d){  // Pinoy budots-style beat with "pew" zaps
    if (i % 4 === 0) mKick(t, .75, d); if (i % 4 === 2) mTone(t, 1300, .09, 'square', .07, d, 280);
    if (i % 2 === 1) mHat(t, .05, d); if (i % 16 === 14) mTone(t, 900, .25, 'sawtooth', .05, d, 1600, 2500);
    if (i % 8 === 6) mTone(t, NOTE(41), .14, 'square', .1, d, 0, 400);
  } },
  weng: { bpm:118, play(i, t, sd, d){   // "weng weng weng" wobble shuffle
    if (i % 8 === 0) mKick(t, .8, d); if (i % 16 === 8) mSnare(t, .3, d); if (i % 2 === 0) mHat(t, .05, d);
    if (PAT('x..x..x.x..x..x.', i)) mWobble(t, NOTE([45, 45, 48, 43][(i >> 4) % 4]), sd * 2.6, .09, d);
  } },
  tinikling: { bpm:150, bar:12, play(i, t, sd, d){   // bamboo-clap rhythm in three
    const s = i % 12; if (s === 0 || s === 4) mWood(t, 900, .35, d); if (s === 8) { mWood(t, 600, .3, d); mWood(t + .02, 620, .25, d); }
    if (s % 2 === 0) mTone(t, NOTE([69, 72, 74, 76, 79, 76][(i >> 1) % 6]), sd * 1.8, 'triangle', .06, d);
    if (s === 0) mTone(t, NOTE(45), sd * 6, 'triangle', .1, d);
  } },
  robot: { bpm:110, play(i, t, sd, d){
    if (i % 8 === 0) mKick(t, .7, d); if (i % 8 === 4) mSnare(t, .3, d);
    mTone(t, NOTE([60, 67, 72, 67][i % 4] + ((i >> 4) % 2) * 3), sd * .8, 'square', .045, d, 0, 2000);
  } },
  dab: { bpm:140, play(i, t, sd, d){     // trap: rolling hats and a sliding 808
    const s = i % 16; if (s === 0 || s === 7 || s === 10) mKick(t, .8, d); if (s === 8) mClap(t, .4, d);
    mHat(t, .04, d); if (s >= 12) mHat(t + sd / 2, .03, d);
    if (s === 0) mTone(t, NOTE(36), sd * 6, 'sine', .25, d, NOTE(31));
  } },
  trophy: { bpm:120, play(i, t, sd, d){ TRACKS.pump.play(i, t, sd, d); if (i % 8 === 4) mTone(t, NOTE(84), sd * 2, 'triangle', .05, d); } },
  pump: { bpm:120, play(i, t, sd, d){    // short fanfare + crowd roar
    if (i === 0) mNoise(t, .25, d, 900, .5, 2.6, 'lowpass');
    const F = { 0:60, 2:64, 4:67, 8:72 }; if (F[i % 16] !== undefined && i < 16) mTone(t, NOTE(F[i % 16]), sd * (i === 8 ? 6 : 1.8), 'sawtooth', .08, d, 0, 2200);
    if (i % 4 === 0) mKick(t, .5, d);
  } },
};
function stopTrack(){
  if (MUSIC.timer) clearInterval(MUSIC.timer); MUSIC.timer = null;
  const m = MUSIC.cur; MUSIC.cur = null;
  if (m && actx){ try { m.bus.gain.setTargetAtTime(0, actx.currentTime, .08); setTimeout(() => { try { m.bus.disconnect(); } catch (e) {} }, 600); } catch (e) {} }
}
function startTrack(name, o = {}){
  if (!actx || !TRACKS[name]) return;
  stopTrack();
  const tr = TRACKS[name], sd = 60 / tr.bpm / 4, bus = actx.createGain(); bus.gain.value = o.vol ?? .3; bus.connect(actx.destination);
  const m = MUSIC.cur = { name, tr, sd, step:0, next:actx.currentTime + .06, loop:!!o.loop, total:o.seconds ? Math.ceil(o.seconds / sd) : Infinity, bus, onEnd:o.onEnd };
  const tick = () => {
    if (MUSIC.cur !== m) return;
    while (m.next < actx.currentTime + .25){
      if (m.step >= m.total){ const cb = m.onEnd; stopTrack(); if (cb) setTimeout(cb, 300); return; }
      try { m.tr.play(m.step, m.next, m.sd, m.bus); } catch (e) {}
      m.step++; m.next += m.sd;
    }
  };
  MUSIC.timer = setInterval(tick, 50); tick();
}
const musicOn = () => data.opts.music !== false;
function updateMusic(){
  if (!actx) return;
  const menuish = ['menu', 'diff', 'char', 'rank', 'how', 'signup', 'online', 'room', 'duo', 'gate', 'shop', 'player'].includes(screenNow) || (screenNow === 'ctrl' && ctrlFrom === 'menu');
  const want = musicOn() && menuish;
  if (want && (!MUSIC.cur || MUSIC.cur.name !== 'menu') && !(MUSIC.cur && MUSIC.cur.preview)) startTrack('menu', { loop:true, vol:.2 });
  if (!want && MUSIC.cur && MUSIC.cur.name === 'menu') stopTrack();
}
function playDance(id, vol = .45){
  if (!musicOn() || !actx) return;
  startTrack(IT(id).style || 'pump', { seconds:3.8, vol, onEnd:updateMusic });
}
function previewDance(id){
  if (!actx) return;
  startTrack(IT(id).style || 'pump', { seconds:3.6, vol:.4, onEnd:updateMusic });
  if (MUSIC.cur) MUSIC.cur.preview = true;
  STAGE.dance = { id, start:performance.now() / 1000 };
}
function emit(ev){ if (G.netRole === 'host') G.netEv.push(ev); }
function sfx(k){ emit({ k:'sfx', n:k }); playSfx(k); }
function addText(t){ G.texts.push(t); emit({ k:'txt', t }); }
function addRing(r){ G.rings.push(r); emit({ k:'ring', r }); }
function shake(v){ if (data.opts.shake) G.shake = Math.max(G.shake, v); emit({ k:'shake', v }); }
function vibrate(ms){ try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

