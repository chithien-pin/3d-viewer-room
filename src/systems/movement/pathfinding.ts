import type { NavGrid } from "../../types/model";
import { isCellWalkable, navToWorld, worldToNav } from "../layout/navGrid";

interface Point {
  x: number;
  z: number;
}

function lineOfSight(nav: NavGrid, a: Point, b: Point): boolean {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(dist / (nav.cell * 0.45)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const cell = worldToNav(nav, x, z);
    if (!cell || !isCellWalkable(nav, cell.i, cell.j)) return false;
  }
  return true;
}

function simplify(nav: NavGrid, points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const out: Point[] = [];
  const first = points[0];
  if (!first) return points;
  out.push(first);
  let anchor = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[anchor];
    const to = points[i];
    if (!from || !to) continue;
    if (!lineOfSight(nav, from, to)) {
      const prev = points[i - 1];
      if (prev) out.push(prev);
      anchor = i - 1;
    }
  }
  const last = points[points.length - 1];
  if (last) out.push(last);
  return out;
}

/**
 * A* 8 hướng trên lưới đã co theo bán kính nhân vật.
 * Chéo chỉ đi được khi hai ô kề cũng trống, để không cắt góc tường.
 */
export function findPath(nav: NavGrid, startX: number, startZ: number, goalX: number, goalZ: number): Point[] | null {
  const start = worldToNav(nav, startX, startZ);
  const goal = worldToNav(nav, goalX, goalZ);
  if (!start || !goal) return null;
  if (!isCellWalkable(nav, goal.i, goal.j)) return null;
  if (start.i === goal.i && start.j === goal.j) return [{ x: goalX, z: goalZ }];

  const cols = nav.cols;
  const total = cols * nav.rows;
  const gScore = new Float64Array(total);
  gScore.fill(Infinity);
  const parent = new Int32Array(total);
  parent.fill(-1);
  const closed = new Uint8Array(total);
  const startId = start.j * cols + start.i;
  const goalId = goal.j * cols + goal.i;
  gScore[startId] = 0;

  const heap: { f: number; id: number }[] = [{ f: 0, id: startId }];
  const bubble = (index: number) => {
    let i = index;
    while (i > 0) {
      const p = (i - 1) >> 1;
      const node = heap[i];
      const parentNode = heap[p];
      if (!node || !parentNode || parentNode.f <= node.f) break;
      heap[i] = parentNode;
      heap[p] = node;
      i = p;
    }
  };
  const sink = (index: number) => {
    let i = index;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      const left = heap[l];
      const right = heap[r];
      const current = heap[m];
      if (left && current && left.f < current.f) m = l;
      const best = heap[m];
      if (right && best && right.f < best.f) m = r;
      if (m === i) break;
      const a = heap[i];
      const b = heap[m];
      if (!a || !b) break;
      heap[i] = b;
      heap[m] = a;
      i = m;
    }
  };
  const push = (f: number, id: number) => {
    heap.push({ f, id });
    bubble(heap.length - 1);
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last) {
      heap[0] = last;
      sink(0);
    }
    return top;
  };

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ] as const;

  while (heap.length > 0) {
    const current = pop();
    if (!current) break;
    if (closed[current.id]) continue;
    if (current.id === goalId) break;
    closed[current.id] = 1;
    const ci = current.id % cols;
    const cj = Math.floor(current.id / cols);
    for (const [di, dj, cost] of dirs) {
      const ni = ci + di;
      const nj = cj + dj;
      if (!isCellWalkable(nav, ni, nj)) continue;
      if (di !== 0 && dj !== 0 && (!isCellWalkable(nav, ci + di, cj) || !isCellWalkable(nav, ci, cj + dj))) continue;
      const nid = nj * cols + ni;
      if (closed[nid]) continue;
      const nextG = (gScore[current.id] ?? Infinity) + cost;
      if (nextG >= (gScore[nid] ?? Infinity)) continue;
      gScore[nid] = nextG;
      parent[nid] = current.id;
      const hx = Math.abs(ni - goal.i);
      const hz = Math.abs(nj - goal.j);
      push(nextG + Math.max(hx, hz) + (Math.SQRT2 - 1) * Math.min(hx, hz), nid);
    }
  }

  if (parent[goalId] === -1 && goalId !== startId) return null;
  const cells: { i: number; j: number }[] = [];
  let cursor = goalId;
  const guard = total + 2;
  let steps = 0;
  while (cursor !== startId && steps < guard) {
    cells.push({ i: cursor % cols, j: Math.floor(cursor / cols) });
    const prev = parent[cursor];
    if (prev === undefined || prev < 0) return null;
    cursor = prev;
    steps += 1;
  }
  cells.reverse();
  const points = cells.map((cell) => navToWorld(nav, cell.i, cell.j));
  const goalPoint = { x: goalX, z: goalZ };
  const tail = points[points.length - 1];
  if (tail && lineOfSight(nav, tail, goalPoint)) points.push(goalPoint);
  else points.push(navToWorld(nav, goal.i, goal.j));
  return simplify(nav, points);
}
