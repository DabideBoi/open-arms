/**
 * Pathfinding benchmark: BFS vs textbook A* vs the game's custom A* (current and candidate rewrites),
 * plus a room-selection benchmark (the findNearestRoom case).
 *
 *   npm run bench:path                    full run
 *   npm run bench:path -- --quick         fewer queries/passes (smoke test)
 *   npm run bench:path -- --only=maze     only scenarios whose name contains "maze"
 *
 * "CareRoute (shipped)" rows time the real findPath/findNearestRoom from src. Their expansion counts come from
 * an instrumented mirror (customAStar / multiGoal) that is checked against the real findPath on every query
 * (parity). "Previous" rows are a preserved copy of the pre-CareRoute linear-scan code (customLinear).
 * Everything is seeded, so path/expansion/cost numbers are reproducible; only timings vary by machine.
 */
import { writeFileSync } from 'node:fs';
import type { Grid, Tile, Room, RoomType, PathNode, Resident } from '../src/types';
import { ROOM_SPECS, roomKind } from '../src/constants';
import { initializeGrid, placeRoom, isWalkable } from '../src/game/systems/GridSystem';
import { findPath, findNearestRoom } from '../src/game/systems/PathfindingSystem';
import { initializeCollisionDetection, isTileOccupiedByOther, isTileOccupiedByResident } from '../src/game/systems/CollisionDetectionSystem';

const QUICK = process.argv.includes('--quick');
const ONLY = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1]; // same order as findPath's DIRS
const SELF = 'bench-self';

// ---------------------------------------------------------------- utilities
function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
const median = (a: number[]) => { const s = sorted(a), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const p95 = (a: number[]) => { const s = sorted(a); return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const stdev = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const f = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '-');
const row = (cells: (string | number)[]) => '| ' + cells.join(' | ') + ' |';
const table = (head: string[], rows: (string | number)[][]) =>
  [row(head), row(head.map((_, i) => (i === 0 ? ':--' : '--:'))), ...rows.map(row)].join('\n');
let SINK = 0; // keeps the JIT from discarding results

// ---------------------------------------------------------------- map builders
function blank(w: number, h: number, open: (x: number, y: number) => boolean): Grid {
  const tiles: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) { const o = open(x, y); tiles[y][x] = { x, y, type: (o ? 'empty' : 'locked') as any, occupiedBy: null, walkable: o }; }
  }
  return { width: w, height: h, tiles, unlockedArea: { minX: 0, minY: 0, maxX: w, maxY: h } };
}
function scatter(w: number, h: number, density: number, rng: () => number): Grid {
  return blank(w, h, () => rng() >= density);
}
function maze(w: number, h: number, rng: () => number): Grid { // w,h odd; DFS-carved, then ~8% of walls removed so routes aren't unique
  const open = new Uint8Array(w * h);
  const stack: number[][] = [[1, 1]]; open[w + 1] = 1;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, dx / 2, dy / 2])
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && !open[ny * w + nx]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, hx, hy] = nb[Math.floor(rng() * nb.length)];
    open[(y + hy) * w + x + hx] = 1; open[ny * w + nx] = 1; stack.push([nx, ny]);
  }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++)
    if (!open[y * w + x] && rng() < 0.08 && ((open[y * w + x - 1] && open[y * w + x + 1]) || (open[(y - 1) * w + x] && open[(y + 1) * w + x]))) open[y * w + x] = 1;
  return blank(w, h, (x, y) => !!open[y * w + x]);
}
const PLACEABLE: RoomType[] = ['dormitory', 'cafeteria', 'clinic', 'bathroom', 'common_room', 'admin_office'];
function shelter(tier: 1 | 2 | 3 | 4, rng: () => number, coverage = 0.4): { grid: Grid; rooms: Room[] } {
  const grid = initializeGrid(tier), rooms: Room[] = [], a = grid.unlockedArea;
  const area = (a.maxX - a.minX) * (a.maxY - a.minY);
  const must = PLACEABLE.slice(0, 5); // one of every need first, then random fill
  let covered = 0;
  for (let i = 0; i < 6000 && (must.length || covered < area * coverage); i++) {
    const type = must.length ? must[0] : PLACEABLE[Math.floor(rng() * PLACEABLE.length)];
    const x = a.minX + Math.floor(rng() * (a.maxX - a.minX)), y = a.minY + Math.floor(rng() * (a.maxY - a.minY));
    const r = placeRoom(grid, rooms, 1e12, type, x, y, 'day');
    if (!r.success) continue;
    if (must.length) must.shift();
    covered += ROOM_SPECS[type].width * ROOM_SPECS[type].height;
  }
  for (const r of rooms) r.currentOccupancy = Math.floor(rng() * (ROOM_SPECS[r.type].capacity + 1));
  return { grid, rooms };
}

// ---------------------------------------------------------------- queries
interface Q { sx: number; sy: number; gx: number; gy: number; dist: number }
function largestComponent(grid: Grid): number[] {
  const W = grid.width, label = new Int32Array(W * grid.height).fill(-1);
  let best: number[] = [];
  for (let s = 0; s < label.length; s++) {
    if (label[s] !== -1 || !grid.tiles[(s / W) | 0][s % W].walkable) continue;
    const comp = [s]; label[s] = s;
    for (let i = 0; i < comp.length; i++) {
      const c = comp[i], cx = c % W, cy = (c / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (!isWalkable(grid, nx, ny) || label[ny * W + nx] !== -1) continue;
        label[ny * W + nx] = s; comp.push(ny * W + nx);
      }
    }
    if (comp.length > best.length) best = comp;
  }
  return best;
}
function makeQueries(tiles: number[], W: number, n: number, rng: () => number): Q[] {
  const out: Q[] = [];
  while (out.length < n) {
    const a = tiles[Math.floor(rng() * tiles.length)], b = tiles[Math.floor(rng() * tiles.length)];
    const sx = a % W, sy = (a / W) | 0, gx = b % W, gy = (b / W) | 0, dist = Math.abs(sx - gx) + Math.abs(sy - gy);
    if (dist >= 2) out.push({ sx, sy, gx, gy, dist });
  }
  return out;
}
/** Register static residents on the given tiles in the real collision module (what findPath's crowd check reads). */
function applyOcc(occ: number[], W: number) {
  initializeCollisionDetection(occ.map((t, i) => ({ id: `res${i}`, gridX: t % W, gridY: (t / W) | 0 }) as unknown as Resident));
}
function pickOcc(tiles: number[], k: number, rng: () => number): number[] {
  const picked = new Set<number>();
  while (picked.size < Math.min(k, tiles.length)) picked.add(tiles[Math.floor(rng() * tiles.length)]);
  return [...picked];
}

// ---------------------------------------------------------------- algorithms
interface R { path: PathNode[] | null; expanded: number; generated: number; peak: number }
const NONE: R = { path: null, expanded: 0, generated: 0, peak: 0 };

// scratch buffers reused across queries (a real rewrite would do the same; stamps avoid O(N) clears)
let cap = 0, G = new Float64Array(0), PAR = new Int32Array(0), SEEN = new Uint32Array(0), CLOSED = new Uint32Array(0), DIR = new Int8Array(0), stamp = 0;
function ensure(S: number) {
  if (S <= cap) return;
  cap = S; G = new Float64Array(S); PAR = new Int32Array(S); SEEN = new Uint32Array(S); CLOSED = new Uint32Array(S); DIR = new Int8Array(S);
}
class Heap {
  k = new Float64Array(1024); v = new Int32Array(1024); n = 0;
  reset(c: number) { if (c > this.k.length) { this.k = new Float64Array(c); this.v = new Int32Array(c); } this.n = 0; }
  push(key: number, val: number) {
    const k = this.k, v = this.v; let i = this.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop(): number {
    const k = this.k, v = this.v, top = v[0], n = --this.n;
    if (n > 0) {
      const key = k[n], val = v[n]; let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= key) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = key; v[i] = val;
    }
    return top;
  }
}
const heap = new Heap();
function rebuild(s: number, D: number, W: number): PathNode[] {
  const out: PathNode[] = [];
  for (; s !== -1; s = PAR[s]) { const t = (s / D) | 0; out.push({ x: t % W, y: (t / W) | 0 }); }
  return out.reverse();
}

/** Breadth-first search: unit cost, no heuristic, stops when the goal is first discovered. */
function bfs(grid: Grid, q: Q): R {
  const { sx, sy, gx, gy } = q, W = grid.width, N = W * grid.height;
  if (!isWalkable(grid, sx, sy) || !isWalkable(grid, gx, gy)) return NONE;
  if (sx === gx && sy === gy) return { path: [{ x: sx, y: sy }], expanded: 0, generated: 1, peak: 0 };
  ensure(N); const st = ++stamp, queue = new Int32Array(N), g = gy * W + gx, s0 = sy * W + sx;
  let head = 0, tail = 0, expanded = 0, generated = 1, peak = 1;
  SEEN[s0] = st; PAR[s0] = -1; queue[tail++] = s0;
  while (head < tail) {
    const c = queue[head++]; expanded++;
    const cx = c % W, cy = (c / W) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (!isWalkable(grid, nx, ny)) continue;
      const n = ny * W + nx;
      if (SEEN[n] === st) continue;
      SEEN[n] = st; PAR[n] = c; generated++;
      if (n === g) return { path: rebuild(n, 1, W), expanded, generated, peak };
      queue[tail++] = n; if (tail - head > peak) peak = tail - head;
    }
  }
  return { path: null, expanded, generated, peak };
}

/** Bidirectional BFS: unit cost, floods from both ends and stops when the two floods touch. */
let PARB = new Int32Array(0), SEENB = new Uint32Array(0);
function bfsBidirectional(grid: Grid, q: Q): R {
  const { sx, sy, gx, gy } = q, W = grid.width, N = W * grid.height;
  if (!isWalkable(grid, sx, sy) || !isWalkable(grid, gx, gy)) return NONE;
  if (sx === gx && sy === gy) return { path: [{ x: sx, y: sy }], expanded: 0, generated: 1, peak: 0 };
  ensure(N); if (PARB.length < N) { PARB = new Int32Array(N); SEENB = new Uint32Array(N); }
  const st = ++stamp, s0 = sy * W + sx, g0 = gy * W + gx;
  let qa = [s0], qb = [g0], ia = 0, ib = 0, expanded = 0, generated = 2, peak = 1;
  SEEN[s0] = st; PAR[s0] = -1; SEENB[g0] = st; PARB[g0] = -1;
  const join = (m: number): R => {
    const fwd: number[] = []; for (let c = m; c !== -1; c = PAR[c]) fwd.push(c);
    fwd.reverse(); for (let c = PARB[m]; c !== -1; c = PARB[c]) fwd.push(c);
    return { path: fwd.map(t => ({ x: t % W, y: (t / W) | 0 })), expanded, generated, peak };
  };
  while (ia < qa.length && ib < qb.length) {
    const forward = qa.length - ia <= qb.length - ib; // always grow the smaller frontier
    const [queue, head, mine, other] = forward ? [qa, ia, SEEN, SEENB] : [qb, ib, SEENB, SEEN];
    const layerEnd = queue.length;
    for (let i = head; i < layerEnd; i++) {
      const c = queue[i]; expanded++; const cx = c % W, cy = (c / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (!isWalkable(grid, nx, ny)) continue;
        const n = ny * W + nx;
        if (mine[n] === st) continue;
        mine[n] = st; (forward ? PAR : PARB)[n] = c; generated++;
        if (other[n] === st) return join(n);
        queue.push(n);
      }
    }
    if (forward) ia = layerEnd; else ib = layerEnd;
    peak = Math.max(peak, qa.length - ia + qb.length - ib);
  }
  return { path: null, expanded, generated, peak };
}

/**
 * A* with a binary heap. plain=true is textbook A* (unit cost, Manhattan). Otherwise it uses the game's
 * cost model (turn +0.3, crossing a foreign room +2, tile held by another resident +4). exact=true keeps
 * the arrival direction in the search state so the turn penalty is optimal instead of approximate.
 * w scales the heuristic: 0 = Dijkstra, 1 = A* (default), >1 = weighted A*. greedy = order by heuristic alone.
 */
type AOpts = { plain: boolean; exact: boolean; w: number; greedy: boolean };
/** Options always have the same four fields in the same order, so the JIT sees one object shape (a mix of shapes made the timings of every variant unreliable). */
function customAStar(grid: Grid, q: Q, rid: string | undefined, opts: Partial<AOpts>): R {
  return aStarCore(grid, q, rid, { plain: false, exact: false, w: 1, greedy: false, ...opts });
}
function aStarCore(grid: Grid, q: Q, rid: string | undefined, o: AOpts): R {
  const { sx, sy, gx, gy } = q, W = grid.width, tiles = grid.tiles;
  if (!isWalkable(grid, sx, sy) || !isWalkable(grid, gx, gy)) return NONE;
  if (sx === gx && sy === gy) return { path: [{ x: sx, y: sy }], expanded: 0, generated: 1, peak: 0 };
  const D = o.exact ? 5 : 1, N = W * grid.height;
  ensure(N * D); heap.reset(4 * N * D + 64); const st = ++stamp;
  const startRoom = tiles[sy][sx].occupiedBy, goalRoom = tiles[gy][gx].occupiedBy, goalT = gy * W + gx;
  const s0 = (sy * W + sx) * D;
  G[s0] = 0; PAR[s0] = -1; DIR[s0] = -1; SEEN[s0] = st;
  heap.push(Math.abs(gx - sx) + Math.abs(gy - sy), s0);
  let expanded = 0, generated = 1, peak = 1;
  while (heap.n > 0) {
    const s = heap.pop();
    if (CLOSED[s] === st) continue; // stale duplicate from a later improvement
    CLOSED[s] = st; expanded++;
    const t = (s / D) | 0;
    if (t === goalT) return { path: rebuild(s, D, W), expanded, generated, peak };
    const cx = t % W, cy = (t / W) | 0, cd = o.exact ? s - t * 5 - 1 : DIR[s], gcur = G[s];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (!isWalkable(grid, nx, ny)) continue;
      const nt = ny * W + nx, ns = o.exact ? nt * 5 + d + 1 : nt;
      if (CLOSED[ns] === st) continue;
      let step = 1;
      if (!o.plain) {
        if (cd !== -1 && cd !== d) step += 0.3;
        const roomId = tiles[ny][nx].occupiedBy;
        if (roomId && roomId !== startRoom && roomId !== goalRoom) step += 2;
        if (rid && nt !== goalT && isTileOccupiedByOther(nx, ny, rid)) step += 4;
      }
      const ng = gcur + step;
      if (SEEN[ns] !== st) { SEEN[ns] = st; generated++; } else if (ng >= G[ns]) continue;
      G[ns] = ng; PAR[ns] = s; DIR[ns] = d;
      const h = Math.abs(gx - nx) + Math.abs(gy - ny);
      heap.push(o.greedy ? h : ng + o.w * h - ng * 1e-6, ns); // tie-break: prefer deeper nodes
      if (heap.n > peak) peak = heap.n;
    }
  }
  return { path: null, expanded, generated, peak };
}

/** Instrumented copy of PathfindingSystem.findPath (linear-scan open set). Parity-checked against the real one. */
function customLinear(grid: Grid, q: Q, rid: string | undefined): R {
  const { sx: startX, sy: startY, gx: goalX, gy: goalY } = q;
  if (!isWalkable(grid, startX, startY) || !isWalkable(grid, goalX, goalY)) return NONE;
  if (startX === goalX && startY === goalY) return { path: [{ x: startX, y: startY }], expanded: 0, generated: 1, peak: 0 };
  interface N { x: number; y: number; g: number; h: number; f: number; parent: N | null; dir: number }
  const h0 = (x: number, y: number) => Math.abs(goalX - x) + Math.abs(goalY - y);
  const startRoom = grid.tiles[startY][startX].occupiedBy, goalRoom = grid.tiles[goalY][goalX].occupiedBy;
  const open: N[] = [{ x: startX, y: startY, g: 0, h: h0(startX, startY), f: 0, parent: null, dir: -1 }];
  open[0].f = open[0].h;
  const seen = new Map<number, N>(), closed = new Set<number>(), keyOf = (x: number, y: number) => y * grid.width + x;
  seen.set(keyOf(startX, startY), open[0]);
  let expanded = 0, generated = 1, peak = 1;
  for (let it = 0; open.length > 0 && it < grid.width * grid.height * 2; it++) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open[best]; open[best] = open[open.length - 1]; open.pop(); expanded++;
    if (current.x === goalX && current.y === goalY) {
      const path: PathNode[] = []; for (let c: N | null = current; c; c = c.parent) path.unshift({ x: c.x, y: c.y });
      return { path, expanded, generated, peak };
    }
    closed.add(keyOf(current.x, current.y));
    for (let d = 0; d < 4; d++) {
      const nx = current.x + DX[d], ny = current.y + DY[d];
      if (!isWalkable(grid, nx, ny) || closed.has(keyOf(nx, ny))) continue;
      let step = 1 + (current.dir !== -1 && current.dir !== d ? 0.3 : 0);
      const isGoal = nx === goalX && ny === goalY, roomId = grid.tiles[ny][nx].occupiedBy;
      if (roomId && roomId !== startRoom && roomId !== goalRoom) step += 2;
      if (rid && !isGoal && isTileOccupiedByOther(nx, ny, rid)) step += 4;
      const g = current.g + step, existing = seen.get(keyOf(nx, ny));
      if (existing) { if (g < existing.g) { existing.g = g; existing.f = g + existing.h; existing.parent = current; existing.dir = d; } }
      else { const h = h0(nx, ny), node: N = { x: nx, y: ny, g, h, f: g + h, parent: current, dir: d }; seen.set(keyOf(nx, ny), node); open.push(node); generated++; if (open.length > peak) peak = open.length; }
    }
  }
  return { path: null, expanded, generated, peak };
}

interface Algo { name: string; run: (g: Grid, q: Q, rid?: string) => PathNode[] | null; count: (g: Grid, q: Q, rid?: string) => R }
const ALGOS: Algo[] = [
  { name: 'BFS (unit cost)', run: (g, q) => bfs(g, q).path, count: bfs },
  { name: 'A* textbook (unit cost, heap)', run: (g, q) => customAStar(g, q, undefined, { plain: true }).path, count: (g, q) => customAStar(g, q, undefined, { plain: true }) },
  { name: 'Previous findPath (linear-scan open list)', run: (g, q, r) => customLinear(g, q, r).path, count: customLinear },
  { name: 'CareRoute findPath (shipped: heap + typed arrays)', run: (g, q, r) => findPath(g, q.sx, q.sy, q.gx, q.gy, r), count: (g, q, r) => customAStar(g, q, r, {}) },
  { name: 'CareRoute + exact turns (not adopted)', run: (g, q, r) => customAStar(g, q, r, { exact: true }).path, count: (g, q, r) => customAStar(g, q, r, { exact: true }) },
  { name: 'Dijkstra (game costs, no heuristic)', run: (g, q, r) => customAStar(g, q, r, { w: 0 }).path, count: (g, q, r) => customAStar(g, q, r, { w: 0 }) },
  { name: 'Weighted A* w=2 (game costs)', run: (g, q, r) => customAStar(g, q, r, { w: 2 }).path, count: (g, q, r) => customAStar(g, q, r, { w: 2 }) },
  { name: 'Greedy best-first (heuristic only)', run: (g, q, r) => customAStar(g, q, r, { greedy: true }).path, count: (g, q, r) => customAStar(g, q, r, { greedy: true }) },
  { name: 'Bidirectional BFS (unit cost)', run: (g, q) => bfsBidirectional(g, q).path, count: bfsBidirectional },
];
const CUR = 2, EXACT = 4;

// ---------------------------------------------------------------- path scoring (the game's cost model)
interface Ev { valid: boolean; steps: number; cost: number; turns: number; roomTiles: number; crowd: number }
function evaluate(grid: Grid, p: PathNode[], q: { sx: number; sy: number; gx: number; gy: number }, rid?: string): Ev {
  const t = grid.tiles, startRoom = t[q.sy][q.sx].occupiedBy, goalRoom = t[q.gy][q.gx].occupiedBy;
  let valid = p[0].x === q.sx && p[0].y === q.sy && p[p.length - 1].x === q.gx && p[p.length - 1].y === q.gy;
  let cost = 0, turns = 0, roomTiles = 0, crowd = 0, pd = -1;
  for (let i = 1; i < p.length && valid; i++) {
    const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y;
    if (Math.abs(dx) + Math.abs(dy) !== 1 || !isWalkable(grid, p[i].x, p[i].y)) { valid = false; break; }
    const d = dx === 1 ? 0 : dx === -1 ? 1 : dy === 1 ? 2 : 3;
    let step = 1;
    if (pd !== -1 && pd !== d) { step += 0.3; turns++; }
    const roomId = t[p[i].y][p[i].x].occupiedBy;
    if (roomId && roomId !== startRoom && roomId !== goalRoom) { step += 2; roomTiles++; }
    if (rid && i !== p.length - 1 && isTileOccupiedByOther(p[i].x, p[i].y, rid)) { step += 4; crowd++; }
    cost += step; pd = d;
  }
  return { valid, steps: p.length - 1, cost, turns, roomTiles, crowd };
}
const samePath = (a: PathNode[] | null, b: PathNode[] | null) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((n, i) => n.x === b[i].x && n.y === b[i].y));

// ---------------------------------------------------------------- scenarios
interface Scenario { name: string; desc: string; grid: Grid; rooms: Room[]; queries: Q[]; rid?: string; expectNull?: boolean; residents: number; occ: number[] }
const out: string[] = [];
const log = (s = '') => { out.push(s); process.stdout.write(s + '\n'); }; // console.log is silenced during map building (the game logs on every room placement)
const big = (g: Grid) => g.width * g.height >= 3000;

function buildScenarios(): Scenario[] {
  const list: Scenario[] = [];
  const nq = (g: Grid) => (QUICK ? 30 : big(g) ? 60 : 200);
  const add = (name: string, desc: string, grid: Grid, o: { rooms?: Room[]; residents?: number; useRid?: boolean; seed: number }) => {
    const rng = rngOf(o.seed), comp = largestComponent(grid);
    const occ = o.useRid ? pickOcc(comp, o.residents ?? 0, rng) : [], taken = new Set(occ);
    const free = comp.filter(t => !taken.has(t)); // queries never start or end on a resident
    list.push({ name, desc, grid, rooms: o.rooms ?? [], queries: makeQueries(free, grid.width, nq(grid), rng), rid: o.useRid ? SELF : undefined, residents: occ.length, occ });
  };
  for (const tier of [1, 2, 3, 4] as const) {
    const rng = rngOf(100 + tier), { grid, rooms } = shelter(tier, rng);
    const a = grid.unlockedArea;
    add(`shelter-T${tier}`, `real game grid, tier ${tier}: ${a.maxX - a.minX}x${a.maxY - a.minY} unlocked in a ${grid.width}x${grid.height} grid, ${rooms.length} rooms (real placeRoom), no residents`, grid, { rooms, seed: 200 + tier });
  }
  for (const n of [30, 80]) {
    const { grid, rooms } = shelter(4, rngOf(104));
    add(`shelter-T4-crowd${n}`, `tier 4 layout with ${n} residents standing on tiles; findPath called with a residentId like the game does`, grid, { rooms, residents: n, useRid: true, seed: 300 + n });
  }
  add('open-40x30', 'empty 40x30 grid, uniform cost: best case for A*, worst case for flooding', blank(40, 30, () => true), { seed: 1 });
  add('open-160x120', 'empty 160x120 grid (16x the tiles of the game grid)', blank(160, 120, () => true), { seed: 2 });
  add('scatter25-40x30', '25% random obstacles, 40x30', scatter(40, 30, 0.25, rngOf(3)), { seed: 4 });
  add('scatter25-160x120', '25% random obstacles, 160x120', scatter(160, 120, 0.25, rngOf(5)), { seed: 6 });
  add('maze-41x31', 'braided maze 41x31: the Manhattan heuristic is misleading, A* degrades toward BFS', maze(41, 31, rngOf(7)), { seed: 8 });
  add('maze-121x91', 'braided maze 121x91', maze(121, 91, rngOf(9)), { seed: 10 });
  // unreachable goal: open 40x30, goal sealed inside a 5x5 wall ring; every algorithm must flood everything reachable
  const sealed = blank(40, 30, (x, y) => !(Math.max(Math.abs(x - 20), Math.abs(y - 15)) === 2));
  const rng = rngOf(11), comp = largestComponent(sealed);
  list.push({ name: 'unreachable-goal', desc: 'goal sealed behind a wall ring (no path exists): cost of reporting failure', grid: sealed, rooms: [], expectNull: true, residents: 0, occ: [],
    queries: makeQueries(comp, 40, nq(sealed), rng).map(q => ({ ...q, gx: 20, gy: 15, dist: Math.abs(q.sx - 20) + Math.abs(q.sy - 15) })).filter(q => !(q.sx === 20 && q.sy === 15)) });
  return list;
}

// ---------------------------------------------------------------- timing
function timeBatch(a: Algo, grid: Grid, qs: Q[], rid?: string): number {
  const t0 = performance.now(); let sink = 0;
  for (let i = 0; i < qs.length; i++) { const p = a.run(grid, qs[i], rid); sink += p ? p.length : -1; }
  SINK += sink; return performance.now() - t0;
}
const BUCKETS: [string, number][] = [['<=8', 8], ['9-20', 20], ['21-50', 50], ['>50', Infinity]];
const gc = () => (globalThis as any).gc?.();

interface Res { time: number[][][]; nq: number[]; m: Record<string, number[]>[]; parityFails: number; optViolations: number; unreachableWrong: number[] }

function runScenario(sc: Scenario, setup: () => void): Res {
  const { grid, rid } = sc;
  setup();
  const buckets = BUCKETS.map(([label, hi], i) => ({ label, qs: sc.queries.filter(q => q.dist <= hi && q.dist > (i ? BUCKETS[i - 1][1] : 0)) })).filter(b => b.qs.length);
  const keys = ['expanded', 'generated', 'peak', 'steps', 'cost', 'overhead', 'turns', 'roomTiles', 'crowd', 'valid', 'optimal'];
  const m = ALGOS.map(() => Object.fromEntries(keys.map(k => [k, [] as number[]])) as Record<string, number[]>);
  const bucketExp = ALGOS.map(() => buckets.map(() => [] as number[]));
  let parityFails = 0, optViolations = 0; const unreachableWrong = ALGOS.map(() => 0);

  // untimed pass: work counters, path quality, parity, optimality
  for (const q of sc.queries) {
    const rs = ALGOS.map(a => a.count(grid, q, rid));
    if (!samePath(findPath(grid, q.sx, q.sy, q.gx, q.gy, rid), rs[CUR + 1].path)) parityFails++; // shipped vs its instrumented mirror
    const evs = rs.map(r => (r.path ? evaluate(grid, r.path, q, rid) : null));
    const costs = evs.filter(e => e && e.valid).map(e => e!.cost);
    const best = costs.length ? Math.min(...costs) : NaN;
    if (evs[EXACT] && costs.some(c => c < evs[EXACT]!.cost - 1e-9)) optViolations++;
    const bi = buckets.findIndex(b => b.qs.includes(q));
    rs.forEach((r, i) => {
      const e = evs[i], mm = m[i];
      mm.expanded.push(r.expanded); mm.generated.push(r.generated); mm.peak.push(r.peak); bucketExp[i][bi].push(r.expanded);
      if (sc.expectNull) { if (r.path) unreachableWrong[i]++; mm.valid.push(r.path ? 0 : 1); return; }
      mm.valid.push(e && e.valid ? 1 : 0);
      if (e && e.valid) {
        mm.steps.push(e.steps); mm.cost.push(e.cost); mm.turns.push(e.turns); mm.roomTiles.push(e.roomTiles); mm.crowd.push(e.crowd);
        mm.overhead.push(best > 0 ? (e.cost / best - 1) * 100 : 0); mm.optimal.push(e.cost <= best + 1e-9 ? 1 : 0);
      }
    });
  }
  (m as any).bucketExp = bucketExp;

  // timed passes, interleaved across algorithms so drift/GC hits all equally
  const warm = QUICK ? 1 : 3, passes = QUICK ? 3 : big(grid) ? 9 : 21;
  const time = ALGOS.map(() => buckets.map(() => [] as number[]));
  for (let p = -warm; p < passes; p++)
    ALGOS.forEach((a, i) => buckets.forEach((b, j) => { gc(); const ms = timeBatch(a, grid, b.qs, rid); if (p >= 0) time[i][j].push((ms * 1000) / b.qs.length); }));
  return { time, nq: buckets.map(b => b.qs.length), m, parityFails, optViolations, unreachableWrong, ...({ buckets: buckets.map(b => b.label) } as any) };
}

function report(sc: Scenario, r: Res) {
  if (r.parityFails || r.optViolations) process.exitCode = 1; // the benchmark doubles as the test: any mismatch fails the run
  const labels: string[] = (r as any).buckets, n = sc.queries.length, total = r.nq.reduce((a, b) => a + b, 0);
  // per-pass overall us/query = query-weighted mean of bucket times
  const passesOf = (i: number) => r.time[i][0].map((_, p) => r.time[i].reduce((s, t, j) => s + t[p] * r.nq[j], 0) / total);
  const overall = ALGOS.map((_, i) => passesOf(i));
  const base = median(overall[CUR]);
  log(`\n### ${sc.name}\n${sc.desc}\n`);
  log(`${n} queries (${labels.map((l, j) => `${l}: ${r.nq[j]}`).join(', ')}) · ${overall[0].length} timed passes · parity shipped findPath vs mirror: ${r.parityFails ? `**${r.parityFails} MISMATCHES**` : 'ok'}${sc.expectNull ? '' : ` · exact-turn A* optimal on every query: ${r.optViolations ? `**NO (${r.optViolations})**` : 'yes'}`}\n`);
  log('**Speed and work** (per query)\n');
  log(table(['Algorithm', 'median µs', 'p95 µs', '±σ %', 'speedup vs previous', 'nodes expanded', 'nodes discovered', 'peak frontier'],
    ALGOS.map((a, i) => [a.name, f(median(overall[i]), 1), f(p95(overall[i]), 1), f((stdev(overall[i]) / mean(overall[i])) * 100, 1), `${f(base / median(overall[i]), 2)}x`,
      f(mean(r.m[i].expanded), 0), f(mean(r.m[i].generated), 0), f(mean(r.m[i].peak), 0)])));
  if (sc.expectNull) {
    log('\n**Correctness**: ' + ALGOS.map((a, i) => `${a.name}: ${r.unreachableWrong[i] ? `returned a path on ${r.unreachableWrong[i]} queries (WRONG)` : 'null on all (correct)'}`).join(' · '));
  } else {
    log('\n**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)\n');
    log(table(['Algorithm', 'valid %', 'steps', 'game cost', 'cost overhead vs best %', 'optimal %', 'turns', 'room tiles crossed', 'crowd collisions'],
      ALGOS.map((a, i) => [a.name, f(mean(r.m[i].valid) * 100, 0), f(mean(r.m[i].steps), 1), f(mean(r.m[i].cost), 2), f(mean(r.m[i].overhead), 2), f(mean(r.m[i].optimal) * 100, 0),
        f(mean(r.m[i].turns), 2), f(mean(r.m[i].roomTiles), 2), f(mean(r.m[i].crowd), 2)])));
  }
  if (labels.length > 1) {
    log('\n**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded\n');
    log(table(['Algorithm', ...labels.map((l, j) => `${l} (n=${r.nq[j]})`)],
      ALGOS.map((a, i) => [a.name, ...labels.map((_, j) => `${f(median(r.time[i][j]), 1)} · ${f(mean(((r.m as any).bucketExp as number[][][])[i][j]), 0)}`)])));
  }
  return { speed: ALGOS.map((_, i) => base / median(overall[i])), expRatio: ALGOS.map((_, i) => mean(r.m[i].expanded) / mean(r.m[CUR].expanded)), over: ALGOS.map((_, i) => mean(r.m[i].overhead)), valid: ALGOS.map((_, i) => mean(r.m[i].valid)) };
}

// ---------------------------------------------------------------- room selection (findNearestRoom)
const NEEDS: [string, RoomType][] = [['sleep', 'dormitory'], ['health', 'clinic'], ['social', 'common_room'], ['bathroom', 'bathroom'], ['food', 'cafeteria']];
interface RQ { sx: number; sy: number; type: RoomType }
interface RS { roomId: string | null; path: PathNode[] | null; expanded: number; generated: number; peak: number }
const candidates = (rooms: Room[], type: RoomType) => rooms.filter(r => roomKind(r.type) === type && r.isOpen);

/** BFS flood from the start until the first tile of any candidate room: nearest by steps, ignores crowds and balancing. */
function bfsNearestRoom(grid: Grid, rooms: Room[], q: RQ): RS {
  const ids = new Set(candidates(rooms, q.type).map(r => r.id)), W = grid.width, N = W * grid.height;
  ensure(N); const st = ++stamp, queue = new Int32Array(N), s0 = q.sy * W + q.sx;
  let head = 0, tail = 0, expanded = 0, generated = 1, peak = 1;
  const hit = (t: number) => { const id = grid.tiles[(t / W) | 0][t % W].occupiedBy; return id && ids.has(id) ? id : null; };
  SEEN[s0] = st; PAR[s0] = -1; queue[tail++] = s0;
  if (hit(s0)) return { roomId: hit(s0), path: [{ x: q.sx, y: q.sy }], expanded: 0, generated, peak };
  while (head < tail) {
    const c = queue[head++]; expanded++; const cx = c % W, cy = (c / W) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (!isWalkable(grid, nx, ny)) continue;
      const n = ny * W + nx; if (SEEN[n] === st) continue;
      SEEN[n] = st; PAR[n] = c; generated++;
      const id = hit(n); if (id) return { roomId: id, path: rebuild(n, 1, W), expanded, generated, peak };
      queue[tail++] = n; if (tail - head > peak) peak = tail - head;
    }
  }
  return { roomId: null, path: null, expanded, generated, peak };
}

/**
 * One A* search toward ALL candidate rooms. h = Manhattan distance to the nearest candidate room rectangle.
 * Each room gets a virtual "finish" entry priced at (cost to its first reached tile) + 2*occupancy, so the
 * first finish popped is the best room under path cost + crowding, found in a single search.
 */
function multiGoal(grid: Grid, rooms: Room[], q: RQ, rid?: string): RS {
  const cs = candidates(rooms, q.type), K = cs.length, W = grid.width, N = W * grid.height, tiles = grid.tiles;
  if (!K || !isWalkable(grid, q.sx, q.sy)) return { roomId: null, path: null, expanded: 0, generated: 0, peak: 0 };
  const idx = new Map(cs.map((r, k) => [r.id, k])), occ = cs.map(r => 2 * r.currentOccupancy);
  const h = (x: number, y: number) => { let b = Infinity; for (const r of cs) { const v = Math.max(r.gridX - x, 0, x - (r.gridX + r.width - 1)) + Math.max(r.gridY - y, 0, y - (r.gridY + r.height - 1)); if (v < b) b = v; } return b; };
  ensure(N); heap.reset(4 * N + K + 64); const st = ++stamp, startRoom = tiles[q.sy][q.sx].occupiedBy;
  const fin = new Int32Array(K).fill(-1), s0 = q.sy * W + q.sx;
  G[s0] = 0; PAR[s0] = -1; DIR[s0] = -1; SEEN[s0] = st; heap.push(h(q.sx, q.sy), s0);
  let expanded = 0, generated = 1, peak = 1;
  while (heap.n > 0) {
    const s = heap.pop();
    if (s >= N) { const k = s - N; return { roomId: cs[k].id, path: rebuild(fin[k], 1, W), expanded, generated, peak }; }
    if (CLOSED[s] === st) continue; CLOSED[s] = st; expanded++;
    const cx = s % W, cy = (s / W) | 0, roomId = tiles[cy][cx].occupiedBy, k = roomId ? idx.get(roomId) : undefined;
    if (k !== undefined && fin[k] === -1) { // first expanded tile of a candidate room = its cheapest entry; undo the "crossing" surcharge it paid
      fin[k] = s;
      const paid = (roomId !== startRoom ? 2 : 0) + (rid && s !== s0 && isTileOccupiedByOther(cx, cy, rid) ? 4 : 0);
      heap.push(G[s] - paid + occ[k] - G[s] * 1e-6, N + k);
    }
    const cd = DIR[s];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (!isWalkable(grid, nx, ny)) continue;
      const ns = ny * W + nx; if (CLOSED[ns] === st) continue;
      let step = 1 + (cd !== -1 && cd !== d ? 0.3 : 0);
      const rid2 = tiles[ny][nx].occupiedBy;
      if (rid2 && rid2 !== startRoom) step += 2;
      if (rid && isTileOccupiedByOther(nx, ny, rid)) step += 4;
      const ng = G[s] + step;
      if (SEEN[ns] !== st) { SEEN[ns] = st; generated++; } else if (ng >= G[ns]) continue;
      G[ns] = ng; PAR[ns] = s; DIR[ns] = d; heap.push(ng + h(nx, ny) - ng * 1e-6, ns);
      if (heap.n > peak) peak = heap.n;
    }
  }
  return { roomId: null, path: null, expanded, generated, peak };
}

function roomSelection(sc: Scenario) {
  const { grid, rooms, rid } = sc, W = grid.width, rng = rngOf(777);
  applyOcc(sc.occ, W);
  const taken = new Set(sc.occ), free = largestComponent(grid).filter(t => !taken.has(t)), byId = new Map(rooms.map(r => [r.id, r]));
  const qs: RQ[] = Array.from({ length: QUICK ? 15 : 80 }, () => { const t = free[Math.floor(rng() * free.length)]; return { sx: t % W, sy: (t / W) | 0, type: NEEDS[Math.floor(rng() * NEEDS.length)][1] }; });
  const noExp = { expanded: 0, generated: 0, peak: 0 };
  /** Pre-CareRoute findNearestRoom, preserved: one linear-scan A* per open room to a random free tile, scored by steps + 2*occupancy + jitter 0-4. */
  const previous = (q: RQ): RS => {
    let pick: { id: string; path: PathNode[]; score: number } | null = null, expanded = 0;
    for (const r of candidates(rooms, q.type)) {
      const free: { x: number; y: number }[] = [];
      for (let y = r.gridY; y < r.gridY + r.height; y++) for (let x = r.gridX; x < r.gridX + r.width; x++) if (isWalkable(grid, x, y) && !isTileOccupiedByResident(x, y)) free.push({ x, y });
      const t = free.length ? free[Math.floor(Math.random() * free.length)] : { x: r.gridX + (r.width >> 1), y: r.gridY + (r.height >> 1) };
      const res = customLinear(grid, { sx: q.sx, sy: q.sy, gx: t.x, gy: t.y, dist: 0 }, rid); expanded += res.expanded;
      if (!res.path) continue;
      const score = res.path.length + r.currentOccupancy * 2 + Math.random() * 4;
      if (!pick || score < pick.score) pick = { id: r.id, path: res.path, score };
    }
    return { roomId: pick ? pick.id : null, path: pick ? pick.path : null, expanded, generated: 0, peak: 0 };
  };
  /** The shipped findNearestRoom. Expansions = the multi-goal room search (mirror, exact for jitter 0) + the path to the returned tile. */
  const shipped = (jitter?: number) => (q: RQ): RS => {
    const r = findNearestRoom(grid, rooms, q.sx, q.sy, q.type, 'day', rid, jitter);
    if (!r) return { roomId: null, path: null, ...noExp };
    const last = r.path[r.path.length - 1], search = multiGoal(grid, rooms, q, rid), leg = customAStar(grid, { sx: q.sx, sy: q.sy, gx: last.x, gy: last.y, dist: 0 }, rid, {});
    return { roomId: r.room.id, path: r.path, expanded: search.expanded + leg.expanded, generated: search.generated + leg.generated, peak: search.peak };
  };
  const algos: { name: string; run: (q: RQ) => RS }[] = [
    { name: 'Previous findNearestRoom (one linear A* per room)', run: previous },
    { name: 'BFS flood to nearest room (steps only)', run: q => bfsNearestRoom(grid, rooms, q) },
    { name: 'CareRoute Match (shipped, jitter 0-4 as in game)', run: shipped() },
    { name: 'CareRoute Match (shipped, no jitter)', run: shipped(0) },
  ];
  // untimed: exhaustive reference. For each candidate room: its best price = min over every tile of (exact game path cost + 2*occupancy).
  // An algorithm is scored on the ROOM it chose (price of that room), so which random tile it walks to inside the room doesn't matter.
  const badEnd = algos.map(() => 0); // results whose path does not end inside the room they name
  const acc = algos.map(() => ({ regret: [] as number[], optimal: [] as number[], found: [] as number[], exp: [] as number[], peak: [] as number[], steps: [] as number[] }));
  for (const q of qs) {
    let ref = Infinity;
    const roomBest = new Map<string, number>();
    for (const r of candidates(rooms, q.type)) {
      let best = Infinity;
      for (let y = r.gridY; y < r.gridY + r.height; y++) for (let x = r.gridX; x < r.gridX + r.width; x++) {
        const e = customAStar(grid, { sx: q.sx, sy: q.sy, gx: x, gy: y, dist: 0 }, rid, { exact: true });
        if (e.path) best = Math.min(best, evaluate(grid, e.path, { sx: q.sx, sy: q.sy, gx: x, gy: y }, rid).cost + 2 * r.currentOccupancy);
      }
      roomBest.set(r.id, best); ref = Math.min(ref, best);
    }
    Math.random = rngOf(4242); // findNearestRoom jitters with Math.random; seed it so counts are repeatable
    algos.forEach((a, i) => {
      const r = a.run(q), j = r.roomId ? roomBest.get(r.roomId)! : NaN;
      acc[i].found.push(r.roomId ? 1 : 0);
      if (r.roomId && r.path) { const e = r.path[r.path.length - 1]; if (grid.tiles[e.y][e.x].occupiedBy !== r.roomId) badEnd[i]++; }
      if (r.roomId) { acc[i].regret.push(j - ref); acc[i].optimal.push(j <= ref + 1e-9 ? 1 : 0); acc[i].steps.push(r.path!.length - 1); }
      acc[i].exp.push(r.expanded); acc[i].peak.push(r.peak);
    });
    Math.random = origRandom;
  }
  const warm = QUICK ? 1 : 3, passes = QUICK ? 3 : 15, time = algos.map(() => [] as number[]);
  for (let p = -warm; p < passes; p++) algos.forEach((a, i) => {
    gc(); Math.random = rngOf(4242 + p); const t0 = performance.now();
    for (const q of qs) SINK += a.run(q).roomId ? 1 : 0;
    Math.random = origRandom; if (p >= 0) time[i].push(((performance.now() - t0) * 1000) / qs.length);
  });
  const base = median(time[0]);
  log(`\n### Room selection · ${sc.name}\n`);
  log(`${qs.length} queries (random start tile × random need) · ${rooms.length} rooms · ${sc.residents} residents · ${time[0].length} timed passes\n`);
  log(table(['Algorithm', 'median µs', 'p95 µs', 'speedup vs previous', 'nodes expanded', 'peak frontier', 'finds a room %', 'picks the best room %', 'mean regret (cost units)', 'mean path steps'],
    algos.map((a, i) => [a.name, f(median(time[i]), 1), f(p95(time[i]), 1), `${f(base / median(time[i]), 2)}x`,
      f(mean(acc[i].exp), 0), i === 0 ? '-' : f(mean(acc[i].peak), 0),
      f(mean(acc[i].found) * 100, 0), f(mean(acc[i].optimal) * 100, 0), f(mean(acc[i].regret), 2), f(mean(acc[i].steps), 1)])));
  if (badEnd.some(b => b > 0)) process.exitCode = 1;
  log(`\nPath ends inside the chosen room: ${badEnd.every(b => b === 0) ? 'yes, for every result of every method' : '**NO**: ' + algos.map((a, i) => `${a.name}: ${badEnd[i]} bad`).join(', ')}`);
  return { speed: algos.map((_, i) => base / median(time[i])), opt: acc.map(a => mean(a.optimal)), regret: acc.map(a => mean(a.regret)), names: algos.map(a => a.name) };
}
const origRandom = Math.random;

// ---------------------------------------------------------------- main
function main() {
  log(`# Pathfinding benchmark\n\nnode ${process.version} · ${process.platform}/${process.arch} · ${QUICK ? 'QUICK mode (not for conclusions)' : 'full run'} · gc exposed: ${!!gc && !!(globalThis as any).gc}\n`);
  log('Rows: **BFS** (unit cost) · **A\\* textbook** (unit cost, Manhattan, binary heap) · **Previous findPath** (pre-CareRoute: turn/room/crowd costs, linear-scan open list) · ' +
    '**CareRoute findPath** (shipped: same costs, binary heap, typed arrays) · **exact turns** (direction kept in the search state so the turn penalty is truly optimal; not adopted) · ' +
    '**Dijkstra** (game costs, no heuristic) · **Weighted A\\* w=2** (game costs, heuristic doubled: faster, may be suboptimal) · **Greedy best-first** (heuristic only: fast, no optimality) · **Bidirectional BFS** (unit cost, floods from both ends).\n');
  const realLog = console.log; console.log = () => {};
  const scs = buildScenarios().filter(s => !ONLY || s.name.includes(ONLY));
  console.log = () => {}; // game systems also log while queries run
  void realLog;
  const sums: { name: string; s: ReturnType<typeof report> }[] = [];
  for (const sc of scs) {
    sums.push({ name: sc.name, s: report(sc, runScenario(sc, () => applyOcc(sc.occ, sc.grid.width))) });
  }
  log('\n## Summary: speedup vs previous findPath (median, >1 is faster)\n');
  log(table(['Scenario', ...ALGOS.map(a => a.name)], sums.map(({ name, s }) => [name, ...s.speed.map(v => `${f(v, 2)}x`)])));
  const gm = (i: number) => Math.exp(mean(sums.map(x => Math.log(x.s.speed[i]))));
  log(row(['**geometric mean**', ...ALGOS.map((_, i) => `**${f(gm(i), 2)}x**`)]));
  log('\n## Summary: nodes expanded relative to previous (lower = less work)\n');
  log(table(['Scenario', ...ALGOS.map(a => a.name)], sums.map(({ name, s }) => [name, ...s.expRatio.map(v => f(v, 2))])));
  log('\n## Summary: mean game-cost overhead vs best path, % (0 = optimal; BFS/textbook ignore the cost model)\n');
  log(table(['Scenario', ...ALGOS.map(a => a.name)], sums.filter(x => x.name !== 'unreachable-goal').map(({ name, s }) => [name, ...s.over.map(v => f(v, 2))])));
  const rooms = ['shelter-T2', 'shelter-T4', 'shelter-T4-crowd30'].map(n => scs.find(s => s.name === n)).filter(Boolean) as Scenario[];
  for (const sc of rooms) roomSelection(sc);
  log('\n## Method and caveats\n');
  log([
    '- **Timing**: each pass times a whole batch of queries with `performance.now()`, then divides by query count. Algorithms are interleaved per pass, `gc()` runs before each batch (when `--expose-gc`), and warm-up passes are discarded. The reported figure is the median across passes; p95 and ±σ show the noise.',
    '- **Work counters are implementation-independent.** "Nodes expanded" is the honest measure of algorithmic work. Microsecond figures also include data-structure effects: the repo version uses object nodes, `Map`/`Set` and a linear-scan open list, while the rewrites use typed arrays and a heap. So "+ heap" shows what a rewrite buys in total, not the heap alone.',
    '- **Peak frontier** is the largest open set/queue. For heap rows it includes stale duplicates (lazy deletion), so it slightly overstates the live frontier.',
    '- **Fairness of BFS/textbook A\\***: they ignore the cost model, so they are fastest but pay in game cost (extra turns, rooms crossed, crowd collisions). Every path from every algorithm is re-scored with the game cost model, which is what the "cost overhead" columns report.',
    '- **Residents** are static in these runs. Real residents move, so crowd costs change between calls; here they isolate the algorithm cost, not the dynamics.',
    '- **Room selection**: each candidate room has a best price = min over its tiles of (exact game path cost + 2×occupancy); "regret" = chosen room\'s price minus the best room\'s price, so the random tile a method walks to inside a room does not count. Rows with jitter (0-4 random per room, the game\'s setting) pick off-optimum on purpose to spread residents. "Expanded" for shipped rows = the multi-goal room search (instrumented mirror; exact for the no-jitter row) plus the search to the returned tile.',
    '- Parity: the instrumented copy of `findPath` is compared to the real one on every query; any mismatch is printed in bold above.',
  ].join('\n'));
  if (SINK === 42) console.log('');
  const file = process.argv.find(a => a.startsWith('--out='))?.slice(6);
  if (file) writeFileSync(file, out.join('\n') + '\n');
}
main();
