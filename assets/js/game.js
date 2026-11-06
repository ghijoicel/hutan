'use strict';
/* Tampilan: canvas, input, suara, layar penuh. Tanpa innerHTML/eval/jaringan. */
(() => {
  const E = window.RelikEngine; if (!E) return;
  const T = 48, W = 960, H = 624, TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
  const dk = document.createElement('canvas'); dk.width = W * dpr; dk.height = H * dpr;
  const dctx = dk.getContext('2d'); dctx.scale(dpr, dpr);

  const KEY = 'relik.best';
  const loadBest = () => { try { const n = parseFloat(localStorage.getItem(KEY)); return Number.isFinite(n) && n > 0 && n < 1e6 ? n : 0; } catch { return 0; } };
  const saveBest = n => { try { localStorage.setItem(KEY, String(n)); } catch { /* abaikan */ } };

  let g = E.createGame(), state = 'ready', best = loadBest(), muted = false, ac = null, last = 0, mvT = 0, toastTO = 0;
  const vis = { x: g.p.x, y: g.p.y }, held = [], fx = [];
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KMAP = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };

  const beep = (f, d = 0.1, type = 'triangle', v = 0.04) => {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + d);
    } catch { /* audio tidak tersedia */ }
  };
  const toast = msg => { const t = $('toast'); t.textContent = ''; const b = document.createElement('b'); b.textContent = msg; t.append(b); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); clearTimeout(toastTO); toastTO = setTimeout(() => t.classList.remove('show'), 2500); };
  const burst = (x, y, c, n = 14) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 130, l = 0.5 + Math.random() * 0.4; fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l, m: l, c, r: 2 + Math.random() * 3 }); } };
  const cen = (x, y) => [x * T + T / 2, y * T + T / 2];
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ---------- layar penuh ---------- */
  const reqFS = stage.requestFullscreen || stage.webkitRequestFullscreen;
  const isFS = () => (document.fullscreenElement || document.webkitFullscreenElement) === stage;
  const toggleFS = async () => {
    try { if (isFS()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document); else await reqFS.call(stage); }
    catch { toast('Layar penuh tidak diizinkan browser'); }
  };
  const syncFS = () => { $('bFs').textContent = isFS() ? '🗗' : '⛶'; $('bFs').setAttribute('aria-label', isFS() ? 'Keluar layar penuh' : 'Layar penuh'); };
  if (!reqFS) { $('bFs').disabled = true; $('bFs').title = 'Browser ini tidak mendukung layar penuh'; }
  $('bFs').addEventListener('click', toggleFS);
  cv.addEventListener('dblclick', () => reqFS && toggleFS());
  document.addEventListener('fullscreenchange', syncFS); document.addEventListener('webkitfullscreenchange', syncFS);
  $('bMute').addEventListener('click', () => { muted = !muted; $('bMute').textContent = muted ? '🔇' : '🔊'; });

  /* ---------- alur permainan ---------- */
  const overlay = (t, p, b) => { $('ovT').textContent = t; $('ovP').textContent = p; $('btn').textContent = b; $('ov').hidden = false; $('btn').focus({ preventScroll: true }); };
  const start = () => { g = E.createGame(); vis.x = g.p.x; vis.y = g.p.y; fx.length = 0; held.length = 0; state = 'play'; $('ov').hidden = true; toast('Temukan 3 kristal 💎, kunci 🗝️, lalu kuil 🏛️'); beep(520, 0.15); };
  const pause = () => { if (state === 'play') { state = 'pause'; overlay('Jeda', 'Petualangan ditahan sebentar.', 'Lanjutkan'); } };
  const resume = () => { state = 'play'; $('ov').hidden = true; last = performance.now(); };
  const finish = won => {
    state = 'over';
    if (won) {
      let m = 'Waktu ' + fmt(g.time) + ' · ' + g.steps + ' langkah.';
      if (!best || g.time < best) { best = g.time; saveBest(best); m += ' Rekor baru! 🏆'; }
      overlay('Relik ditemukan! 🏛️✨', m, 'Main Lagi');
    } else overlay('Kamu tumbang… 💀', 'Slime hutan terlalu banyak. Coba lagi!', 'Coba Lagi');
  };
  overlay('Relik Hutan Cahaya', 'Hutan ini gelap dan dihuni slime. Obormu hanya menerangi sekitarmu.' + (best ? ' Rekor: ' + fmt(best) : ''), 'Mulai Petualangan');
  $('btn').addEventListener('click', () => (state === 'pause' ? resume() : start()));

  const MSG = { locked: 'Gerbang terkunci — cari kunci 🗝️', open: 'Gerbang terbuka! 🚪', key: 'Kunci didapat 🗝️', heal: '+1 nyawa ❤️', hurt: 'Awas! Kena slime 💥' };
  const handle = () => {
    for (const e of g.events) {
      if (e.type === 'crystal') { const [x, y] = cen(g.p.x, g.p.y); burst(x, y, '#67e8f9', 20); toast('Kristal ' + g.crystals + '/' + g.total + ' 💎'); beep(760 + g.crystals * 120, 0.18); }
      else if (e.type === 'need') toast('Kuil butuh ' + e.n + ' kristal lagi');
      else if (e.type === 'hurt') { stage.classList.remove('hurt'); void stage.offsetWidth; stage.classList.add('hurt'); toast(MSG.hurt); beep(120, 0.2, 'sawtooth'); }
      else if (e.type === 'win') { const [x, y] = cen(g.p.x, g.p.y); burst(x, y, '#fde68a', 40); beep(880, 0.4, 'sine', 0.06); }
      else if (e.type === 'lose') beep(80, 0.5, 'sawtooth');
      else if (MSG[e.type]) { toast(MSG[e.type]); beep(e.type === 'locked' ? 150 : 640, 0.12); }
    }
    g.events.length = 0;
  };

  /* ---------- input ---------- */
  const press = d => { if (!held.includes(d)) held.push(d); mvT = 0; };
  const release = d => { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); };
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (KMAP[k]) { e.preventDefault(); if (!e.repeat) press(KMAP[k]); return; }
    if (e.repeat) return;
    if (k === 'f') toggleFS(); else if (k === 'm') $('bMute').click();
    else if (k === 'p' || k === 'escape') { if (state === 'play') pause(); else if (state === 'pause') resume(); }
    else if (k === 'enter' && state === 'over') start();
  });
  addEventListener('keyup', e => { const d = KMAP[e.key.toLowerCase()]; if (d) release(d); });
  addEventListener('blur', () => { held.length = 0; pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  $('dpad').querySelectorAll('button').forEach(b => {
    const d = b.dataset.d;
    b.addEventListener('pointerdown', e => { e.preventDefault(); press(d); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => release(d)));
  });

  /* ---------- gambar ---------- */
  const hash = (x, y) => { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); };
  const EMO = { '#': '🌲', '~': '🌊', C: '💎', K: '🗝️', H: '❤️', G: '🚪', T: '🏛️' };
  function draw(t) {
    ctx.fillStyle = '#030208'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '34px system-ui,sans-serif';
    for (let y = 0; y < g.R; y++) for (let x = 0; x < g.C; x++) {
      if (!g.seen.has(y * g.C + x)) continue;
      const c = g.grid[y][x], h = hash(x, y), px = x * T, py = y * T;
      ctx.fillStyle = c === '~' ? `hsl(205 60% ${24 + Math.sin(t * 2 + x + y) * 4}%)` : `hsl(${115 + h * 20} 38% ${17 + h * 7}%)`;
      ctx.fillRect(px, py, T, T);
      if (EMO[c]) { const bob = c === 'C' || c === 'K' || c === 'H' ? Math.sin(t * 3 + x) * 3 : 0; ctx.fillText(EMO[c], px + T / 2, py + T / 2 + 2 + bob); }
      else if (h > 0.86) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(px + h * 30, py + 20, 3, 8); }
    }
    vis.x += (g.p.x - vis.x) * Math.min(1, 0.3); vis.y += (g.p.y - vis.y) * 0.3;
    const [pcx, pcy] = cen(vis.x, vis.y), R = E.TORCH * T + Math.sin(t * 9) * 3 + Math.sin(t * 5.3) * 2;
    for (const e of g.enemies) if (Math.hypot(e.x - g.p.x, e.y - g.p.y) <= E.TORCH + 0.3) { const [ex, ey] = cen(e.x, e.y); ctx.fillText('🟢', ex, ey + Math.sin(t * 6 + e.x) * 3); }
    // kegelapan + cahaya obor
    dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H); dctx.fillStyle = 'rgba(2,1,8,.8)'; dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = 'destination-out';
    const gr = dctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(pcx, pcy, R, 0, TAU); dctx.fill();
    ctx.drawImage(dk, 0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const wg = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, R); wg.addColorStop(0, 'rgba(255,190,90,.22)'); wg.addColorStop(1, 'transparent'); ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(pcx, pcy, R, 0, TAU); ctx.fill(); ctx.restore();
    // pemain
    ctx.globalAlpha = g.inv > 0 && Math.floor(t * 16) % 2 ? 0.35 : 1; ctx.font = '36px system-ui,sans-serif'; ctx.fillText('🧭', pcx, pcy + 2); ctx.globalAlpha = 1;
    for (const f of fx) { ctx.globalAlpha = Math.max(0, f.l / f.m); ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  const cache = {}; const setTxt = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
  const hud = () => { setTxt('hHp', '❤️'.repeat(g.hp) + '🖤'.repeat(3 - g.hp)); setTxt('hCr', '💎 ' + g.crystals + '/' + g.total); setTxt('hKey', g.key ? '🗝️' : '—'); setTxt('hTime', fmt(g.time)); };

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (state === 'play') {
      mvT -= dt;
      if (mvT <= 0 && held.length) { const [dx, dy] = DIRS[held[held.length - 1]]; g.move(dx, dy); mvT = 0.13; }
      g.tick(dt); handle(); if (g.over) finish(g.won);
    }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.l -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.l <= 0) fx.splice(i, 1); }
    draw(ts / 1000); hud();
  }
  requestAnimationFrame(frame);
})();
