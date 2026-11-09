import type { ApartmentFile, DoorDef, WallSide, WindowDef } from "../../types/apartment";
import type { FloorRect, Opening, WallBox, ZoneRect } from "../../types/model";

export interface Grid {
  xs: number[];
  zs: number[];
  zone: Int16Array;
  cols: number;
  rows: number;
}

export interface WallRun {
  axis: "x" | "z";
  fixed: number;
  from: number;
  to: number;
  y0: number;
  y1: number;
  thickness: number;
  kind: "exterior" | "interior" | "railing";
  nx: number;
  nz: number;
}

const KIND_RANK: Record<ZoneRect["kind"], number> = { closed: 3, outdoor: 2, open: 1 };

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function uniqueLines(values: number[]): number[] {
  const sorted = Array.from(new Set(values.map(round4))).sort((a, b) => a - b);
  const lines: number[] = [];
  for (const value of sorted) {
    const prev = lines[lines.length - 1];
    if (prev === undefined || value - prev > 0.02) lines.push(value);
  }
  return lines;
}

function zoneAtPoint(zones: ZoneRect[], x: number, z: number): number {
  let best = -1;
  let bestRank = -1;
  let bestArea = Infinity;
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (!zone) continue;
    if (x < zone.x - 1e-4 || x > zone.x + zone.w + 1e-4) continue;
    if (z < zone.z - 1e-4 || z > zone.z + zone.d + 1e-4) continue;
    const rank = KIND_RANK[zone.kind];
    const area = zone.w * zone.d;
    if (rank > bestRank || (rank === bestRank && area < bestArea)) {
      best = i;
      bestRank = rank;
      bestArea = area;
    }
  }
  return best;
}

function buildGrid(zones: ZoneRect[]): Grid {
  const xs = uniqueLines(zones.flatMap((zone) => [zone.x, zone.x + zone.w]));
  const zs = uniqueLines(zones.flatMap((zone) => [zone.z, zone.z + zone.d]));
  const cols = xs.length - 1;
  const rows = zs.length - 1;
  const zone = new Int16Array(cols * rows);
  zone.fill(-1);
  for (let j = 0; j < rows; j++) {
    const z0 = zs[j];
    const z1 = zs[j + 1];
    if (z0 === undefined || z1 === undefined) continue;
    for (let i = 0; i < cols; i++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      if (x0 === undefined || x1 === undefined) continue;
      zone[j * cols + i] = zoneAtPoint(zones, (x0 + x1) / 2, (z0 + z1) / 2);
    }
  }
  return { xs, zs, zone, cols, rows };
}

function idx(grid: Grid, i: number, j: number): number {
  return j * grid.cols + i;
}

/** Ô rỗng không thông ra ngoài biên được gán phòng gần nhất, để khe đo (±15 cm) không thành giếng. */
function fillInteriorVoids(grid: Grid): void {
  const { cols, rows, zone } = grid;
  const exterior = new Uint8Array(zone.length);
  const queue: number[] = [];
  const push = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= cols || j >= rows) return;
    const id = idx(grid, i, j);
    if (zone[id] !== -1 || exterior[id]) return;
    exterior[id] = 1;
    queue.push(id);
  };
  for (let i = 0; i < cols; i++) {
    push(i, 0);
    push(i, rows - 1);
  }
  for (let j = 0; j < rows; j++) {
    push(0, j);
    push(cols - 1, j);
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    if (id === undefined) continue;
    const i = id % cols;
    const j = Math.floor(id / cols);
    push(i + 1, j);
    push(i - 1, j);
    push(i, j + 1);
    push(i, j - 1);
  }

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const id = idx(grid, i, j);
      if (zone[id] !== -1 || exterior[id]) continue;
      let found = -1;
      for (let radius = 1; radius <= 8 && found < 0; radius++) {
        for (let dj = -radius; dj <= radius && found < 0; dj++) {
          for (let di = -radius; di <= radius; di++) {
            if (Math.max(Math.abs(di), Math.abs(dj)) !== radius) continue;
            const ni = i + di;
            const nj = j + dj;
            if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
            const neighbor = zone[idx(grid, ni, nj)];
            if (neighbor !== undefined && neighbor >= 0) {
              found = neighbor;
              break;
            }
          }
        }
      }
      if (found >= 0) zone[id] = found;
    }
  }
}

function sideName(nx: number, nz: number): WallSide | null {
  if (nx > 0.5) return "east";
  if (nx < -0.5) return "west";
  if (nz > 0.5) return "south";
  if (nz < -0.5) return "north";
  return null;
}

function opposite(side: WallSide): WallSide {
  if (side === "north") return "south";
  if (side === "south") return "north";
  if (side === "east") return "west";
  return "east";
}

function isOpenPassage(a: ZoneRect | undefined, b: ZoneRect | undefined, fromAToB: WallSide): boolean {
  if (!a || !b) return false;
  if (a.openSides.includes(fromAToB) && b.kind === "open") return true;
  if (b.openSides.includes(opposite(fromAToB)) && a.kind === "open") return true;
  return false;
}

function collectRuns(grid: Grid, zones: ZoneRect[], exteriorT: number, interiorT: number, ceiling: number): WallRun[] {
  const runs: WallRun[] = [];
  const { cols, rows, xs, zs, zone } = grid;

  const consider = (i0: number, j0: number, i1: number, j1: number, axis: "x" | "z", fixed: number, from: number, to: number, nx: number, nz: number) => {
    const a = i0 < 0 || j0 < 0 || i0 >= cols || j0 >= rows ? -1 : (zone[idx(grid, i0, j0)] ?? -1);
    const b = i1 < 0 || j1 < 0 || i1 >= cols || j1 >= rows ? -1 : (zone[idx(grid, i1, j1)] ?? -1);
    if (a < 0 && b < 0) return;
    if (a >= 0 && a === b) return;
    const zoneA = a >= 0 ? zones[a] : undefined;
    const zoneB = b >= 0 ? zones[b] : undefined;
    const dir = sideName(nx, nz);
    if (dir && isOpenPassage(zoneA, zoneB, dir)) return;
    if (zoneA?.kind === "open" && zoneB?.kind === "open") return;
    if (zoneA?.kind === "outdoor" && zoneB?.kind === "outdoor") return;
    if (to - from < 0.03) return;

    const occupied = zoneA ?? zoneB;
    if (!occupied) return;
    const voidSide = !zoneA || !zoneB;
    let kind: WallRun["kind"] = "interior";
    let thickness = interiorT;
    let height = ceiling;
    let normalX = 0;
    let normalZ = 0;

    if (voidSide && occupied.kind === "outdoor") {
      kind = "railing";
      thickness = 0.02;
      height = 1.1;
      normalX = zoneA ? nx : -nx;
      normalZ = zoneA ? nz : -nz;
    } else if (voidSide) {
      kind = "exterior";
      thickness = exteriorT;
      height = ceiling;
      normalX = zoneA ? nx : -nx;
      normalZ = zoneA ? nz : -nz;
    }

    runs.push({
      axis,
      fixed,
      from,
      to,
      y0: 0,
      y1: height,
      thickness,
      kind,
      nx: normalX,
      nz: normalZ,
    });
  };

  for (let j = 0; j < rows; j++) {
    const z0 = zs[j];
    const z1 = zs[j + 1];
    if (z0 === undefined || z1 === undefined) continue;
    for (let i = 0; i < cols; i++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      if (x0 === undefined || x1 === undefined) continue;
      if (i === 0) consider(-1, j, 0, j, "z", x0, z0, z1, 1, 0);
      if (i + 1 <= cols) {
        const edge = xs[i + 1];
        if (edge !== undefined) consider(i, j, i + 1, j, "z", edge, z0, z1, 1, 0);
      }
      if (j === 0) consider(i, -1, i, 0, "x", z0, x0, x1, 0, 1);
      if (j + 1 <= rows) {
        const edge = zs[j + 1];
        if (edge !== undefined) consider(i, j, i, j + 1, "x", edge, x0, x1, 0, 1);
      }
    }
  }
  return mergeRuns(runs);
}

function mergeRuns(runs: WallRun[]): WallRun[] {
  const groups = new Map<string, WallRun[]>();
  for (const run of runs) {
    const key = [run.axis, run.fixed.toFixed(3), run.kind, run.y0.toFixed(2), run.y1.toFixed(2), run.nx, run.nz].join("|");
    const list = groups.get(key);
    if (list) list.push(run);
    else groups.set(key, [run]);
  }
  const merged: WallRun[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.from - b.from);
    const first = list[0];
    if (!first) continue;
    let current: WallRun = { ...first };
    for (let i = 1; i < list.length; i++) {
      const next = list[i];
      if (!next) continue;
      if (next.from <= current.to + 0.03) current.to = Math.max(current.to, next.to);
      else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
  }
  return merged;
}

function cutOpening(runs: WallRun[], opening: { axis: "x" | "z"; fixed: number; from: number; to: number; y0: number; y1: number }): WallRun[] {
  const next: WallRun[] = [];
  for (const run of runs) {
    if (run.kind === "railing" || run.axis !== opening.axis || Math.abs(run.fixed - opening.fixed) > 0.04) {
      next.push(run);
      continue;
    }
    if (opening.to <= run.from + 0.001 || opening.from >= run.to - 0.001) {
      next.push(run);
      continue;
    }
    const left = Math.max(run.from, opening.from);
    const right = Math.min(run.to, opening.to);
    if (opening.from > run.from + 0.001) next.push({ ...run, to: opening.from });
    if (opening.y0 > run.y0 + 0.001) {
      next.push({ ...run, from: left, to: right, y1: Math.min(run.y1, opening.y0) });
    }
    if (opening.y1 < run.y1 - 0.001) {
      next.push({ ...run, from: left, to: right, y0: Math.max(run.y0, opening.y1) });
    }
    if (opening.to < run.to - 0.001) next.push({ ...run, from: opening.to });
  }
  return next.filter((run) => run.to - run.from > 0.03 && run.y1 - run.y0 > 0.03);
}

interface RawOpening {
  id: string;
  kind: Opening["kind"];
  axis: "x" | "z";
  fixed: number;
  from: number;
  to: number;
  y0: number;
  y1: number;
  hingeX: number;
  hingeZ: number;
  inX: number;
  inZ: number;
  style?: string;
  frame?: string;
  curtain?: string;
  lock?: string;
}

function inward(wall: WallSide): { x: number; z: number } {
  if (wall === "north") return { x: 0, z: 1 };
  if (wall === "south") return { x: 0, z: -1 };
  if (wall === "west") return { x: 1, z: 0 };
  return { x: -1, z: 0 };
}

function placeOnWall(zone: ZoneRect, wall: WallSide, offset: number, width: number, y0: number, y1: number, id: string, kind: Opening["kind"], extra: Partial<RawOpening>): RawOpening | null {
  const span = wall === "north" || wall === "south" ? zone.w : zone.d;
  if (span < 0.3) return null;
  const off = Math.min(Math.max(offset, 0), Math.max(0, span - 0.25));
  const w = Math.min(width, span - off);
  if (w < 0.25) {
    console.warn(`[Glory Heights] Lỗ ${id} quá hẹp sau khi kẹp vào tường ${wall} của ${zone.id}.`);
    return null;
  }
  const into = inward(wall);
  if (wall === "north" || wall === "south") {
    const z = wall === "north" ? zone.z : zone.z + zone.d;
    const x0 = round4(zone.x + off);
    return { id, kind, axis: "x", fixed: z, from: x0, to: round4(x0 + w), y0, y1, hingeX: x0, hingeZ: z, inX: into.x, inZ: into.z, ...extra };
  }
  const x = wall === "west" ? zone.x : zone.x + zone.w;
  const z0 = round4(zone.z + off);
  return { id, kind, axis: "z", fixed: x, from: z0, to: round4(z0 + w), y0, y1, hingeX: x, hingeZ: z0, inX: into.x, inZ: into.z, ...extra };
}

function openingFromDoor(zones: ZoneRect[], door: DoorDef): RawOpening | null {
  const zone = zones.find((item) => item.id === door.room);
  if (!zone) {
    console.warn(`[Glory Heights] Cửa ${door.id} trỏ tới phòng không tồn tại: ${door.room}.`);
    return null;
  }
  const kind: Opening["kind"] = door.type === "sliding_glass" ? "sliding" : "door";
  return placeOnWall(zone, door.wall, door.offset, door.width, 0, door.height, door.id, kind, {
    style: door.style,
    frame: door.frame,
    lock: door.lock,
  });
}

function openingFromWindow(zones: ZoneRect[], windowDef: WindowDef, index: number): RawOpening | null {
  const zone = zones.find((item) => item.id === windowDef.room);
  if (!zone) {
    console.warn(`[Glory Heights] Cửa sổ #${index} trỏ tới phòng không tồn tại: ${windowDef.room}.`);
    return null;
  }
  return placeOnWall(zone, windowDef.wall, windowDef.offset, windowDef.width, windowDef.sill, windowDef.sill + windowDef.height, `${windowDef.room}-${windowDef.wall}-${index}`, "window", {
    frame: windowDef.frame,
    curtain: windowDef.curtain,
  });
}

function thicknessAt(runs: WallRun[], opening: RawOpening): number {
  const hit = runs.find((run) => run.axis === opening.axis && Math.abs(run.fixed - opening.fixed) < 0.04 && opening.from < run.to && opening.to > run.from);
  return hit?.thickness ?? 0.1;
}

function runsToWalls(runs: WallRun[]): WallBox[] {
  return runs.map((run, index) => {
    const length = run.to - run.from;
    const height = run.y1 - run.y0;
    const alongX = run.axis === "x";
    let kind: WallBox["kind"] = run.kind;
    if (run.kind !== "railing" && run.y0 > 0.4) kind = "lintel";
    else if (run.kind !== "railing" && run.y1 < 1.4 && run.y0 < 0.05) kind = "parapet";
    return {
      id: `wall-${index}`,
      x: alongX ? (run.from + run.to) / 2 : run.fixed,
      y: (run.y0 + run.y1) / 2,
      z: alongX ? run.fixed : (run.from + run.to) / 2,
      sx: alongX ? length : run.thickness,
      sy: height,
      sz: alongX ? run.thickness : length,
      kind,
      nx: run.nx,
      nz: run.nz,
      axis: run.axis,
    };
  });
}

function greedyFloors(grid: Grid, zones: ZoneRect[]): FloorRect[] {
  const { cols, rows, xs, zs, zone } = grid;
  const used = new Uint8Array(zone.length);
  const rects: FloorRect[] = [];
  let counter = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const start = idx(grid, i, j);
      if (used[start]) continue;
      const zoneId = zone[start];
      if (zoneId === undefined || zoneId < 0) continue;
      const material = zones[zoneId]?.floor ?? "marble_white";
      let w = 1;
      while (i + w < cols) {
        const id = idx(grid, i + w, j);
        const next = zone[id];
        if (used[id] || next === undefined || next < 0 || zones[next]?.floor !== material) break;
        w += 1;
      }
      let h = 1;
      outer: while (j + h < rows) {
        for (let k = 0; k < w; k++) {
          const id = idx(grid, i + k, j + h);
          const next = zone[id];
          if (used[id] || next === undefined || next < 0 || zones[next]?.floor !== material) break outer;
        }
        h += 1;
      }
      for (let jj = 0; jj < h; jj++) {
        for (let ii = 0; ii < w; ii++) used[idx(grid, i + ii, j + jj)] = 1;
      }
      const x0 = xs[i];
      const z0 = zs[j];
      const x1 = xs[i + w];
      const z1 = zs[j + h];
      if (x0 === undefined || z0 === undefined || x1 === undefined || z1 === undefined) continue;
      rects.push({ id: `floor-${counter++}`, material, x: x0, z: z0, w: x1 - x0, d: z1 - z0 });
    }
  }
  return rects;
}

export interface Shell {
  floors: FloorRect[];
  walls: WallBox[];
  openings: Opening[];
  /** Tường trước khi cắt lỗ — dùng để đẩy tủ vào mặt trong. */
  shellRuns: WallRun[];
  grid: Grid;
}

export function buildShell(file: ApartmentFile, zones: ZoneRect[]): Shell {
  const grid = buildGrid(zones);
  fillInteriorVoids(grid);
  const exteriorT = file.meta.wallThickness.exterior;
  const interiorT = file.meta.wallThickness.interior;
  const ceiling = file.meta.ceilingHeight;
  const shellRuns = collectRuns(grid, zones, exteriorT, interiorT, ceiling);

  const rawOpenings: RawOpening[] = [];
  for (const door of file.doors) {
    const opening = openingFromDoor(zones, door);
    if (opening) rawOpenings.push(opening);
  }
  file.windows.forEach((windowDef, index) => {
    const opening = openingFromWindow(zones, windowDef, index);
    if (opening) rawOpenings.push(opening);
  });

  let cut = shellRuns;
  const placed: Opening[] = [];
  for (const opening of rawOpenings) {
    const before = cut.length;
    const next = cutOpening(cut, opening);
    const changed = next.length !== before || next.some((run, i) => run !== cut[i]);
    if (!changed) {
      console.warn(`[Glory Heights] Không cắt được lỗ ${opening.id} trên tường ${opening.axis}=${opening.fixed.toFixed(2)}.`);
      continue;
    }
    cut = next;
    placed.push({
      ...opening,
      wallThickness: thicknessAt(shellRuns, opening),
    });
  }

  return {
    floors: greedyFloors(grid, zones),
    walls: runsToWalls(cut),
    openings: placed,
    shellRuns,
    grid,
  };
}

export function zoneIndexAt(grid: Grid, x: number, z: number): number {
  const { xs, zs, cols, rows, zone } = grid;
  if (x < (xs[0] ?? 0) || z < (zs[0] ?? 0) || x > (xs[cols] ?? 0) || z > (zs[rows] ?? 0)) return -1;
  let i = 0;
  let j = 0;
  while (i < cols - 1 && (xs[i + 1] ?? Infinity) <= x) i += 1;
  while (j < rows - 1 && (zs[j + 1] ?? Infinity) <= z) j += 1;
  return zone[j * cols + i] ?? -1;
}
