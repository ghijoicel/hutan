'use strict';
/* Mesin logika murni (tanpa DOM), bisa diuji di Node. */
(function (root) {
  const MAP = [
    '####################',
    '#P.....#......~~...#',
    '#.####.#.####.~~.#C#',
    '#.#..#...#..#....#.#',
    '#.#.##.#.#.##.####.#',
    '#...#C.#...#.S....##',
    '###.#..#####.####..#',
    '#...#.........#K#..#',
    '#.###.#######.#.#.##',
    '#.....#H..S..#.....#',
    '#.#####.#####.#.##.#',
    '#...C.........#...GT',
    '####################'
  ];
  const HURT_CD = 1.2, TORCH = 4.2;
  const solid = t => t === '#' || t === '~';

  function createGame(rngFn, map) {
    const rng = typeof rngFn === 'function' ? rngFn : Math.random;
    map = map || MAP;
    const R = map.length, C = map[0].length, grid = map.map(r => r.split(''));
    const g = { grid, R, C, p: { x: 1, y: 1 }, hp: 3, key: false, crystals: 0, total: 0, enemies: [], seen: new Set(),
      events: [], over: false, won: false, time: 0, steps: 0, inv: 0, et: 0 };
    const ev = (type, o) => { if (g.events.length < 100) g.events.push(Object.assign({ type }, o)); };
    grid.forEach((row, y) => row.forEach((t, x) => {
      if (t === 'P') { g.p = { x, y }; row[x] = '.'; }
      else if (t === 'C') g.total++;
      else if (t === 'S') { g.enemies.push({ x, y }); row[x] = '.'; }
    }));
    const reveal = () => {
      const r = Math.ceil(TORCH);
      for (let y = Math.max(0, g.p.y - r); y <= Math.min(R - 1, g.p.y + r); y++)
        for (let x = Math.max(0, g.p.x - r); x <= Math.min(C - 1, g.p.x + r); x++)
          if (Math.hypot(x - g.p.x, y - g.p.y) <= TORCH) g.seen.add(y * C + x);
    };
    const hurt = () => {
      if (g.over || g.inv > 0) return;
      if (g.enemies.some(e => e.x === g.p.x && e.y === g.p.y)) {
        g.hp--; g.inv = HURT_CD; ev('hurt');
        if (g.hp <= 0) { g.over = true; ev('lose'); }
      }
    };
    g.move = (dx, dy) => {
      if (g.over || Math.abs(dx) + Math.abs(dy) !== 1) return false;
      const x = g.p.x + dx, y = g.p.y + dy;
      if (x < 0 || y < 0 || x >= C || y >= R) return false;
      const t = grid[y][x];
      if (solid(t)) return false;
      if (t === 'G') { if (!g.key) { ev('locked'); return false; } g.key = false; grid[y][x] = '.'; ev('open'); return false; }
      if (t === 'T') {
        if (g.crystals < g.total) { ev('need', { n: g.total - g.crystals }); return false; }
        g.p = { x, y }; g.over = g.won = true; ev('win'); return true;
      }
      g.p = { x, y }; g.steps++;
      if (t === 'C') { grid[y][x] = '.'; g.crystals++; ev('crystal'); }
      else if (t === 'K') { grid[y][x] = '.'; g.key = true; ev('key'); }
      else if (t === 'H' && g.hp < 3) { grid[y][x] = '.'; g.hp++; ev('heal'); }
      hurt(); reveal(); return true;
    };
    g.tick = dt => {
      if (g.over || !(dt > 0)) return;
      dt = Math.min(dt, 0.1); g.time += dt; g.inv = Math.max(0, g.inv - dt); g.et += dt;
      if (g.et >= 0.5) {
        g.et = 0;
        g.enemies.forEach(e => {
          const dx = g.p.x - e.x, dy = g.p.y - e.y, near = Math.hypot(dx, dy) <= TORCH + 1;
          let opts = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          if (near) opts.sort((a, b) => Math.hypot(dx - a[0], dy - a[1]) - Math.hypot(dx - b[0], dy - b[1]));
          else if (rng() < 0.5) return; else opts.sort(() => rng() - 0.5);
          for (const [ox, oy] of opts) {
            const nx = e.x + ox, ny = e.y + oy;
            if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
            const t = grid[ny][nx]; if (solid(t) || t === 'G' || t === 'T') continue;
            e.x = nx; e.y = ny; break;
          }
        });
        hurt();
      }
    };
    reveal();
    return g;
  }
  const api = { createGame, MAP, TORCH, solid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RelikEngine = api;
})(typeof self !== 'undefined' ? self : this);
