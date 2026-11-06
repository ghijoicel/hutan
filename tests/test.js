// Jalankan: node tests/test.js
const E = require('../assets/js/engine.js'); const assert = require('assert');
let seed = 7; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const g0 = E.createGame(rng), { R, C } = g0;
const bfs = (from, blockG) => { const d = new Map([[from.y * C + from.x, 0]]), q = [from];
  while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const x = c.x + a, y = c.y + b, k = y * C + x;
    if (x < 0 || y < 0 || x >= C || y >= R || d.has(k)) return; const t = g0.grid[y][x]; if (E.solid(t) || (blockG && t === 'G')) return; d.set(k, d.get(c.y * C + c.x) + 1); q.push({ x, y }); }); } return d; };
const reach = bfs(g0.p, true);
g0.grid.forEach((row, y) => row.forEach((t, x) => { if ('CKH'.includes(t)) assert(reach.has(y * C + x), `${t} di (${x},${y}) tak terjangkau sebelum gerbang`); }));
assert(bfs(g0.p, false).size > reach.size, 'area di balik gerbang tidak ada');
for (let r = 0; r < 40; r++) { seed = r * 31 + 1; const g = E.createGame(rng);
  for (let k = 0; k < 4000 && !g.over; k++) { g.move(...[[1, 0], [-1, 0], [0, 1], [0, -1], [2, 2], [0, 0]][Math.floor(rng() * 6)]); g.tick(k % 9 ? 0.2 : -1);
    assert(g.hp >= 0 && g.hp <= 3 && g.crystals <= g.total && !E.solid(g.grid[g.p.y][g.p.x]), 'invarian rusak'); g.events.length = 0; } }
// jalur menang: BFS bertahap menuju target
const g = E.createGame(() => 1); g.enemies.length = 0;
const go = ch => { for (;;) { const goals = []; g.grid.forEach((row, y) => row.forEach((t, x) => { if (t === ch) goals.push({ x, y }); })); if (!goals.length) return;
  const from = g.p, prev = new Map([[from.y * C + from.x, null]]), q = [from]; let hit = null;
  while (q.length && !hit) { const c = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + a, y = c.y + b, k = y * C + x;
    if (x < 0 || y < 0 || x >= C || y >= R || prev.has(k) || E.solid(g.grid[y][x])) continue; prev.set(k, c); const n = { x, y }; if (goals.some(o => o.x === x && o.y === y)) { hit = n; break; } if (g.grid[y][x] !== 'G' && g.grid[y][x] !== 'T') q.push(n); } }
  assert(hit, 'tujuan ' + ch + ' tak terjangkau'); const path = []; for (let c = hit; c && !(c.x === from.x && c.y === from.y); c = prev.get(c.y * C + c.x)) path.unshift(c);
  path.forEach(c => { g.move(c.x - g.p.x, c.y - g.p.y); }); if (ch === 'G') { g.move(1, 0); } return; } };
['K', 'C', 'C', 'C', 'C'].forEach(go); // kumpulkan kunci & kristal
for (let i = 0; i < 4; i++) go('C');
go('G'); go('T');
assert(g.won, 'game tidak bisa dimenangkan'); console.log('OK — peta valid, fuzz lulus, game bisa dimenangkan dalam', g.steps, 'langkah');
