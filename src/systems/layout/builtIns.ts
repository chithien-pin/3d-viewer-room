import type { ApartmentFile, Rect } from "../../types/apartment";
import type { ColliderBox, Solid, ZoneRect } from "../../types/model";
import type { WallRun } from "./shell";
import { snapValue } from "./zones";

interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface Inset {
  box: Box;
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function snapRect(rect: Rect, xMap: Map<number, number>, zMap: Map<number, number>): Box {
  const [x, z, w, d] = rect;
  const x0 = snapValue(xMap, x);
  const z0 = snapValue(zMap, z);
  const x1 = snapValue(xMap, x + w);
  const z1 = snapValue(zMap, z + d);
  return { x: x0, z: z0, w: round4(Math.max(0.05, x1 - x0)), d: round4(Math.max(0.05, z1 - z0)) };
}

/** Đẩy cạnh đang nằm trên tim tường vào mặt trong, để tủ không chìm trong tường. */
function insetAgainstWalls(box: Box, runs: WallRun[]): Inset {
  let { x, z, w, d } = box;
  let x1 = x + w;
  let z1 = z + d;
  let north = false;
  let south = false;
  let east = false;
  let west = false;
  for (const run of runs) {
    if (run.y1 < 0.4) continue;
    if (run.axis === "x") {
      const overlap = Math.min(x1, run.to) - Math.max(x, run.from);
      if (overlap < 0.08) continue;
      const push = run.thickness / 2;
      if (Math.abs(z - run.fixed) < 0.08) {
        z = run.fixed + push;
        north = true;
      }
      if (Math.abs(z1 - run.fixed) < 0.08) {
        z1 = run.fixed - push;
        south = true;
      }
    } else {
      const overlap = Math.min(z1, run.to) - Math.max(z, run.from);
      if (overlap < 0.08) continue;
      const push = run.thickness / 2;
      if (Math.abs(x - run.fixed) < 0.08) {
        x = run.fixed + push;
        west = true;
      }
      if (Math.abs(x1 - run.fixed) < 0.08) {
        x1 = run.fixed - push;
        east = true;
      }
    }
  }
  if (x1 - x < 0.12 || z1 - z < 0.12) return { box, north: false, south: false, east: false, west: false };
  return { box: { x, z, w: x1 - x, d: z1 - z }, north, south, east, west };
}

function unionBoxes(boxes: Box[]): Box[] {
  if (boxes.length === 0) return [];
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minZ = Math.min(minZ, box.z);
    maxX = Math.max(maxX, box.x + box.w);
    maxZ = Math.max(maxZ, box.z + box.d);
  }
  const cell = 0.05;
  const cols = Math.ceil((maxX - minX) / cell) + 1;
  const rows = Math.ceil((maxZ - minZ) / cell) + 1;
  const mask = new Uint8Array(cols * rows);
  for (const box of boxes) {
    const i0 = Math.max(0, Math.floor((box.x - minX) / cell));
    const j0 = Math.max(0, Math.floor((box.z - minZ) / cell));
    const i1 = Math.min(cols, Math.ceil((box.x + box.w - minX) / cell));
    const j1 = Math.min(rows, Math.ceil((box.z + box.d - minZ) / cell));
    for (let j = j0; j < j1; j++) {
      for (let i = i0; i < i1; i++) mask[j * cols + i] = 1;
    }
  }
  const used = new Uint8Array(mask.length);
  const out: Box[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const start = j * cols + i;
      if (!mask[start] || used[start]) continue;
      let w = 1;
      while (i + w < cols && mask[j * cols + i + w] && !used[j * cols + i + w]) w += 1;
      let h = 1;
      outer: while (j + h < rows) {
        for (let k = 0; k < w; k++) {
          const id = (j + h) * cols + i + k;
          if (!mask[id] || used[id]) break outer;
        }
        h += 1;
      }
      for (let jj = 0; jj < h; jj++) {
        for (let ii = 0; ii < w; ii++) used[(j + jj) * cols + i + ii] = 1;
      }
      out.push({ x: minX + i * cell, z: minZ + j * cell, w: w * cell, d: h * cell });
    }
  }
  return out;
}

function addBox(solids: Solid[], colliders: ColliderBox[], solid: Solid, block: boolean): void {
  solids.push(solid);
  if (!block) return;
  colliders.push({
    id: `col-${solid.id}`,
    x: solid.x,
    y: solid.y,
    z: solid.z,
    sx: solid.sx,
    sy: solid.sy,
    sz: solid.sz,
  });
}

function cabinetMaterial(name: string): string {
  if (name === "walnut") return "walnut";
  if (name.includes("herringbone")) return "herringbone";
  return "walnut";
}

function counterMaterial(name: string): string {
  if (name.includes("granite")) return "granite";
  return "granite";
}

function splashMaterial(name: string): string {
  if (name.includes("lime")) return "lime";
  return "lime";
}

export function buildBuiltIns(
  file: ApartmentFile,
  zones: ZoneRect[],
  runs: WallRun[],
  xMap: Map<number, number>,
  zMap: Map<number, number>,
): { solids: Solid[]; colliders: ColliderBox[] } {
  const solids: Solid[] = [];
  const colliders: ColliderBox[] = [];

  for (const built of file.builtIns) {
    if (built.type === "unknown") continue;
    if (built.type === "kitchen_counter_L") {
      const insets = built.rects.map((rect) => insetAgainstWalls(snapRect(rect, xMap, zMap), runs));
      const parts = unionBoxes(insets.map((item) => item.box));
      parts.forEach((part, index) => {
        const height = built.height;
        addBox(solids, colliders, {
          id: `${built.id}-base-${index}`,
          shape: "box",
          x: part.x + part.w / 2,
          y: height / 2,
          z: part.z + part.d / 2,
          sx: part.w,
          sy: height,
          sz: part.d,
          material: cabinetMaterial(built.cabinet),
        }, true);
        addBox(solids, colliders, {
          id: `${built.id}-top-${index}`,
          shape: "box",
          x: part.x + part.w / 2,
          y: height + 0.015,
          z: part.z + part.d / 2,
          sx: part.w + 0.02,
          sy: 0.03,
          sz: part.d + 0.02,
          material: counterMaterial(built.countertop),
        }, false);
      });
      insets.forEach((inset, index) => {
        const { box, north, south, east, west } = inset;
        const splash = (along: "x" | "z", cx: number, cz: number, len: number) => {
          addBox(solids, colliders, {
            id: `${built.id}-splash-${index}-${along}-${cx.toFixed(2)}`,
            shape: "box",
            x: cx,
            y: built.height + 0.3,
            z: cz,
            sx: along === "x" ? len : 0.012,
            sy: 0.58,
            sz: along === "z" ? len : 0.012,
            material: splashMaterial(built.backsplash),
          }, false);
        };
        if (north) splash("x", box.x + box.w / 2, box.z + 0.01, box.w);
        if (south) splash("x", box.x + box.w / 2, box.z + box.d - 0.01, box.w);
        if (west) splash("z", box.x + 0.01, box.z + box.d / 2, box.d);
        if (east) splash("z", box.x + box.w - 0.01, box.z + box.d / 2, box.d);
      });
      const longestX = parts.slice().sort((a, b) => b.w - a.w)[0];
      const longestZ = parts.slice().sort((a, b) => b.d - a.d)[0];
      if (longestX && longestX.w >= 0.5) {
        addBox(solids, colliders, {
          id: `${built.id}-cooktop`,
          shape: "box",
          x: longestX.x + longestX.w * 0.42,
          y: built.height + 0.035,
          z: longestX.z + longestX.d / 2,
          sx: Math.min(0.55, longestX.w * 0.45),
          sy: 0.012,
          sz: Math.min(0.48, longestX.d * 0.72),
          material: "cooktop",
        }, false);
      }
      if (longestZ) {
        const sx = Math.min(0.46, longestZ.w * 0.7);
        const sz = Math.min(0.38, longestZ.d * 0.28);
        addBox(solids, colliders, {
          id: `${built.id}-sink`,
          shape: "box",
          x: longestZ.x + longestZ.w / 2,
          y: built.height + 0.02,
          z: longestZ.z + longestZ.d * 0.55,
          sx,
          sy: 0.04,
          sz,
          material: "steel",
        }, false);
        addBox(solids, colliders, {
          id: `${built.id}-basin`,
          shape: "box",
          x: longestZ.x + longestZ.w / 2,
          y: built.height + 0.005,
          z: longestZ.z + longestZ.d * 0.55,
          sx: sx * 0.78,
          sy: 0.03,
          sz: sz * 0.72,
          material: "steelDark",
        }, false);
        addBox(solids, colliders, {
          id: `${built.id}-faucet`,
          shape: "cylinder",
          x: longestZ.x + longestZ.w / 2,
          y: built.height + 0.2,
          z: longestZ.z + longestZ.d * 0.55 - sz * 0.45,
          sx: 0.012,
          sy: 0.32,
          sz: 0.012,
          material: "steel",
        }, false);
        addBox(solids, colliders, {
          id: `${built.id}-faucet-neck`,
          shape: "cylinder",
          x: longestZ.x + longestZ.w / 2,
          y: built.height + 0.36,
          z: longestZ.z + longestZ.d * 0.55 - sz * 0.2,
          sx: 0.01,
          sy: 0.22,
          sz: 0.01,
          rotX: Math.PI / 2,
          material: "steel",
        }, false);
      }
    }

    if (built.type === "kitchen_upper") {
      const parts = unionBoxes(built.rects.map((rect) => insetAgainstWalls(snapRect(rect, xMap, zMap), runs).box));
      const height = built.topY - built.bottomY;
      const glassSpan = built.doors.includes("glass_black_frame");
      parts.forEach((part, index) => {
        const y = (built.bottomY + built.topY) / 2;
        addBox(solids, colliders, {
          id: `${built.id}-box-${index}`,
          shape: "box",
          x: part.x + part.w / 2,
          y,
          z: part.z + part.d / 2,
          sx: part.w,
          sy: height,
          sz: part.d,
          material: "cream",
        }, false);
        addBox(solids, colliders, {
          id: `${built.id}-led-${index}`,
          shape: "box",
          x: part.x + part.w / 2,
          y: built.bottomY - 0.012,
          z: part.z + part.d / 2,
          sx: Math.max(0.05, part.w - 0.04),
          sy: 0.015,
          sz: Math.max(0.05, part.d - 0.04),
          material: "lamp",
        }, false);
        if (glassSpan && index === 0 && part.w > 0.7) {
          const gw = Math.min(0.55, part.w * 0.4);
          const gx = part.x + part.w - gw / 2 - 0.08;
          const gz = part.z + part.d / 2;
          addBox(solids, colliders, {
            id: `${built.id}-glass-frame`,
            shape: "box",
            x: gx,
            y,
            z: gz + part.d * 0.08,
            sx: gw,
            sy: height * 0.78,
            sz: 0.02,
            material: "aluminum",
          }, false);
          addBox(solids, colliders, {
            id: `${built.id}-glass`,
            shape: "box",
            x: gx,
            y,
            z: gz + part.d * 0.08 + 0.008,
            sx: gw * 0.86,
            sy: height * 0.66,
            sz: 0.008,
            material: "cabinetGlass",
            transparent: true,
          }, false);
        }
      });
    }

    if (built.type === "tall_cabinet_with_niche") {
      const inset = insetAgainstWalls(snapRect(built.rect, xMap, zMap), runs);
      const box = inset.box;
      const nicheH = Math.min(built.niche.height, built.height - 0.35);
      const side = 0.045;
      const topY = nicheH;
      const topH = built.height - topY;
      const cx = box.x + box.w / 2;
      const cz = box.z + box.d / 2;
      addBox(solids, colliders, {
        id: `${built.id}-back`,
        shape: "box",
        x: box.x + box.w - side / 2,
        y: built.height / 2,
        z: cz,
        sx: side,
        sy: built.height,
        sz: box.d,
        material: cabinetMaterial(built.cabinet),
      }, false);
      addBox(solids, colliders, {
        id: `${built.id}-side-n`,
        shape: "box",
        x: cx,
        y: built.height / 2,
        z: box.z + side / 2,
        sx: box.w,
        sy: built.height,
        sz: side,
        material: cabinetMaterial(built.cabinet),
      }, false);
      addBox(solids, colliders, {
        id: `${built.id}-side-s`,
        shape: "box",
        x: cx,
        y: built.height / 2,
        z: box.z + box.d - side / 2,
        sx: box.w,
        sy: built.height,
        sz: side,
        material: cabinetMaterial(built.cabinet),
      }, false);
      addBox(solids, colliders, {
        id: `${built.id}-top`,
        shape: "box",
        x: cx,
        y: topY + topH / 2,
        z: cz,
        sx: box.w,
        sy: topH,
        sz: box.d,
        material: cabinetMaterial(built.cabinet),
      }, false);
      colliders.push({
        id: `col-${built.id}`,
        x: cx,
        y: built.height / 2,
        z: cz,
        sx: box.w,
        sy: built.height,
        sz: box.d,
      });
    }

    if (built.type === "wall_panel") {
      const zone = zones.find((item) => item.id === built.zone);
      if (!zone) {
        console.warn(`[Glory Heights] Vách ${built.id} không thấy zone ${built.zone}.`);
        continue;
      }
      const along = built.wall === "north" || built.wall === "south" ? "x" : "z";
      const edge =
        built.wall === "west" ? zone.x : built.wall === "east" ? zone.x + zone.w : built.wall === "north" ? zone.z : zone.z + zone.d;
      const host = runs.find((run) => run.axis === along && Math.abs(run.fixed - edge) < 0.08);
      const inward = (host?.thickness ?? 0.2) / 2;
      const depth = 0.045;
      const span0 = Math.min(built.z[0], built.z[1]);
      const span1 = Math.max(built.z[0], built.z[1]);
      const y = built.height / 2;
      if (built.wall === "west" || built.wall === "east") {
        const sign = built.wall === "west" ? 1 : -1;
        addBox(solids, colliders, {
          id: built.id,
          shape: "box",
          x: edge + sign * (inward + depth / 2 + 0.01),
          y,
          z: (span0 + span1) / 2,
          sx: depth,
          sy: built.height,
          sz: span1 - span0,
          material: cabinetMaterial(built.material),
        }, true);
      } else {
        const sign = built.wall === "north" ? 1 : -1;
        addBox(solids, colliders, {
          id: built.id,
          shape: "box",
          x: (span0 + span1) / 2,
          y,
          z: edge + sign * (inward + depth / 2 + 0.01),
          sx: span1 - span0,
          sy: built.height,
          sz: depth,
          material: cabinetMaterial(built.material),
        }, true);
      }
    }
  }

  return { solids, colliders };
}
