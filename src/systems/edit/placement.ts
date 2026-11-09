import type { CatalogItem } from "../../types/catalog";
import type { PlacedItem } from "../../types/layout";
import type { ApartmentModel, ColliderBox, WallBox, ZoneRect } from "../../types/model";

export interface Pose {
  x: number;
  z: number;
  rotY: number;
  y: number;
  valid: boolean;
  placeOn?: string;
  stackedOn?: string;
}

export function catalogMap(items: CatalogItem[]): Map<string, CatalogItem> {
  return new Map(items.map((item) => [item.id, item]));
}

export function itemColor(def: CatalogItem, variantId?: string): string {
  const variant = def.variants?.find((entry) => entry.id === variantId);
  return variant?.color ?? def.color ?? "#c8c2b8";
}

export const SCALE_MIN = 0.4;
export const SCALE_MAX = 2.2;
const MAX_HEIGHT = 2.75;

export function unitScale(scale?: [number, number, number]): [number, number, number] {
  if (!scale) return [1, 1, 1];
  return [scale[0], scale[1], scale[2]];
}

/** Kích thước mẫu nhân hệ số của món đã đặt. */
export function scaledCatalog(def: CatalogItem, scale?: [number, number, number]): CatalogItem {
  const [sx, sy, sz] = unitScale(scale);
  if (sx === 1 && sy === 1 && sz === 1) return def;
  return { ...def, size: [def.size[0] * sx, def.size[1] * sy, def.size[2] * sz] };
}

export function clampAxis(base: number, value: number, capHeight: boolean): number {
  let next = Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));
  if (capHeight && base * next > MAX_HEIGHT) next = Math.max(SCALE_MIN, MAX_HEIGHT / base);
  return Math.round(next * 100) / 100;
}

function deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function footprint(
  def: CatalogItem,
  x: number,
  z: number,
  rotY: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const [width, depth] = def.size;
  const c = Math.abs(Math.cos(rad(rotY)));
  const s = Math.abs(Math.sin(rad(rotY)));
  const halfW = (width * c + depth * s) / 2;
  const halfD = (width * s + depth * c) / 2;
  return { minX: x - halfW, maxX: x + halfW, minZ: z - halfD, maxZ: z + halfD };
}

function pointInZone(x: number, z: number, zones: ZoneRect[]): boolean {
  return zones.some(
    (zone) => x >= zone.x - 0.04 && x <= zone.x + zone.w + 0.04 && z >= zone.z - 0.04 && z <= zone.z + zone.d + 0.04,
  );
}

function insideUnit(box: { minX: number; maxX: number; minZ: number; maxZ: number }, zones: ZoneRect[]): boolean {
  const cx = (box.minX + box.maxX) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  if (!pointInZone(cx, cz, zones)) return false;
  const inset = 0.08;
  const points: [number, number][] = [
    [box.minX + inset, box.minZ + inset],
    [box.maxX - inset, box.minZ + inset],
    [box.minX + inset, box.maxZ - inset],
    [box.maxX - inset, box.maxZ - inset],
  ];
  return points.every(([x, z]) => pointInZone(x, z, zones));
}

function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function hitsCollider(
  box: { minX: number; maxX: number; minZ: number; maxZ: number },
  y: number,
  height: number,
  colliders: ColliderBox[],
  ignoreIds?: string[],
): boolean {
  const bottom = y - height / 2;
  const top = y + height / 2;
  for (const solid of colliders) {
    if (ignoreIds?.some((name) => solid.id.includes(name))) continue;
    const low = solid.y - solid.sy / 2;
    const high = solid.y + solid.sy / 2;
    if (high < 0.02 || low > 1.15) continue;
    if (overlap1d(bottom, top, low, high) <= 0) continue;
    const ox = overlap1d(box.minX, box.maxX, solid.x - solid.sx / 2, solid.x + solid.sx / 2);
    const oz = overlap1d(box.minZ, box.maxZ, solid.z - solid.sz / 2, solid.z + solid.sz / 2);
    if (ox > 0.07 && oz > 0.07) return true;
  }
  return false;
}

function hitsItem(
  box: { minX: number; maxX: number; minZ: number; maxZ: number },
  items: PlacedItem[],
  catalog: Map<string, CatalogItem>,
  ignoreUid?: string,
  hostUid?: string,
): boolean {
  const area = Math.max(0.01, (box.maxX - box.minX) * (box.maxZ - box.minZ));
  for (const other of items) {
    if (other.uid === ignoreUid || other.uid === hostUid) continue;
    const raw = catalog.get(other.itemId);
    if (!raw || raw.isFlat || raw.mount === "wall") continue;
    const def = scaledCatalog(raw, other.scale);
    const otherBox = footprint(def, other.position[0], other.position[1], other.rotY);
    const ox = overlap1d(box.minX, box.maxX, otherBox.minX, otherBox.maxX);
    const oz = overlap1d(box.minZ, box.maxZ, otherBox.minZ, otherBox.maxZ);
    if (ox <= 0.05 || oz <= 0.05) continue;
    const otherArea = Math.max(0.01, (otherBox.maxX - otherBox.minX) * (otherBox.maxZ - otherBox.minZ));
    if (ox * oz > Math.min(area, otherArea) * 0.5) return true;
  }
  return false;
}

function nearestWall(x: number, z: number, walls: WallBox[]): { wall: WallBox; dist: number; sign: number } | null {
  let best: { wall: WallBox; dist: number; sign: number } | null = null;
  for (const wall of walls) {
    if (wall.kind === "railing" || wall.kind === "parapet" || wall.kind === "lintel" || wall.sy < 1.4) continue;
    const along = wall.axis === "x" ? x : z;
    const half = (wall.axis === "x" ? wall.sx : wall.sz) / 2;
    const center = wall.axis === "x" ? wall.x : wall.z;
    if (along < center - half - 0.2 || along > center + half + 0.2) continue;
    const fixed = wall.axis === "x" ? wall.z : wall.x;
    const point = wall.axis === "x" ? z : x;
    const dist = Math.abs(point - fixed);
    const sign = point >= fixed ? 1 : -1;
    if (!best || dist < best.dist) best = { wall, dist, sign };
  }
  return best;
}

function snapMount(
  x: number,
  z: number,
  def: CatalogItem,
  walls: WallBox[],
): { x: number; z: number; rotY: number } | null {
  const hit = nearestWall(x, z, walls);
  if (!hit || hit.dist > 1.6) return null;
  const { wall, sign } = hit;
  const thick = (wall.axis === "x" ? wall.sz : wall.sx) / 2;
  const face = (wall.axis === "x" ? wall.z : wall.x) + sign * (thick + 0.02);
  const center = face + sign * (def.size[1] / 2);
  const intoX = wall.axis === "z" ? sign : 0;
  const intoZ = wall.axis === "x" ? sign : 0;
  const rotY = deg(Math.atan2(intoX, intoZ));
  if (wall.axis === "x") return { x, z: center, rotY };
  return { x: center, z, rotY };
}

function pullToWall(x: number, z: number, rotY: number, def: CatalogItem, walls: WallBox[]): { x: number; z: number } {
  const hit = nearestWall(x, z, walls);
  if (!hit || hit.dist > 0.36) return { x, z };
  const box = footprint(def, x, z, rotY);
  const { wall, sign } = hit;
  const thick = (wall.axis === "x" ? wall.sz : wall.sx) / 2;
  const face = (wall.axis === "x" ? wall.z : wall.x) + sign * (thick + 0.02);
  if (wall.axis === "x") {
    const edge = sign > 0 ? box.minZ : box.maxZ;
    return { x, z: z + (face - edge) };
  }
  const edge = sign > 0 ? box.minX : box.maxX;
  return { x: x + (face - edge), z };
}

function snapToBuiltIn(x: number, z: number, def: CatalogItem, colliders: ColliderBox[]): { x: number; z: number } | null {
  if (!def.snapTo || def.snapTo.length === 0) return null;
  let best: ColliderBox | null = null;
  let bestDist = 1.1;
  for (const box of colliders) {
    if (!def.snapTo.some((name) => box.id.includes(name))) continue;
    const dist = Math.hypot(box.x - x, box.z - z);
    if (dist < bestDist) {
      best = box;
      bestDist = dist;
    }
  }
  return best ? { x: best.x, z: best.z } : null;
}

function findHost(
  x: number,
  z: number,
  ids: string[] | undefined,
  items: PlacedItem[],
  maxDist: number,
): PlacedItem | undefined {
  if (!ids || ids.length === 0) return undefined;
  let best: PlacedItem | undefined;
  let bestDist = maxDist;
  for (const item of items) {
    if (!ids.includes(item.itemId)) continue;
    const dist = Math.hypot(item.position[0] - x, item.position[1] - z);
    if (dist < bestDist) {
      best = item;
      bestDist = dist;
    }
  }
  return best;
}

export function elevation(item: PlacedItem, items: PlacedItem[], catalog: Map<string, CatalogItem>, depth = 0): number {
  const raw = catalog.get(item.itemId);
  if (!raw) return 0;
  const def = scaledCatalog(raw, item.scale);
  if (def.mount === "wall") return raw.mountHeight ?? def.size[2] / 2;
  let base = 0;
  const hostId = item.placeOn ?? item.stackedOn;
  if (hostId && depth < 4) {
    const host = items.find((entry) => entry.uid === hostId);
    const hostRaw = host ? catalog.get(host.itemId) : undefined;
    if (host && hostRaw) {
      const hostDef = scaledCatalog(hostRaw, host.scale);
      base = elevation(host, items, catalog, depth + 1) + hostDef.size[2] / 2;
    }
  }
  return base + def.size[2] / 2;
}

export function assess(
  item: PlacedItem,
  items: PlacedItem[],
  catalog: Map<string, CatalogItem>,
  model: ApartmentModel,
): { valid: boolean; y: number } {
  const raw = catalog.get(item.itemId);
  if (!raw) return { valid: false, y: 0 };
  const def = scaledCatalog(raw, item.scale);
  const [x, z] = item.position;
  const y = elevation(item, items, catalog);
  const box = footprint(def, x, z, item.rotY);
  const onWall = def.mount === "wall";
  const inRoom = (onWall || def.isFlat) ? pointInZone(x, z, model.zones) : insideUnit(box, model.zones);
  const blocked = onWall || def.isFlat ? false : hitsCollider(box, y, def.size[2], model.colliders, def.snapTo);
  const crowded = def.isFlat ? false : hitsItem(box, items, catalog, item.uid, item.placeOn ?? item.stackedOn);
  return { valid: inRoom && !blocked && !crowded, y };
}

export function resolvePose(
  x: number,
  z: number,
  rotY: number,
  def: CatalogItem,
  items: PlacedItem[],
  model: ApartmentModel,
  catalog: Map<string, CatalogItem>,
  snap: boolean,
  ignoreUid?: string,
  scale?: [number, number, number],
): Pose {
  const sized = scaledCatalog(def, scale);
  let px = x;
  let pz = z;
  let rot = rotY;
  const niche = def.mount === "wall" ? null : snapToBuiltIn(x, z, def, model.colliders);
  if (def.mount === "wall") {
    if (snap) {
      px = Math.round(x * 10) / 10;
      pz = Math.round(z * 10) / 10;
    }
    const mounted = snapMount(px, pz, sized, model.walls);
    if (mounted) {
      px = mounted.x;
      pz = mounted.z;
      rot = mounted.rotY;
    }
  } else if (niche) {
    px = niche.x;
    pz = niche.z;
  } else {
    if (snap) {
      px = Math.round(x * 10) / 10;
      pz = Math.round(z * 10) / 10;
    }
    const pulled = pullToWall(px, pz, rot, sized, model.walls);
    px = pulled.x;
    pz = pulled.z;
  }

  const others = ignoreUid ? items.filter((entry) => entry.uid !== ignoreUid) : items;
  let placeOn: string | undefined;
  let stackedOn: string | undefined;
  if (def.placeOn) {
    const host = findHost(px, pz, def.placeOn, others, 0.9);
    if (host) {
      placeOn = host.uid;
      px = host.position[0];
      pz = host.position[1];
      rot = host.rotY;
    }
  }
  if (def.stackableOn && !placeOn) {
    const host = findHost(px, pz, def.stackableOn, others, 1.4);
    const hostRaw = host ? catalog.get(host.itemId) : undefined;
    if (host && hostRaw) {
      const rug = footprint(scaledCatalog(hostRaw, host.scale), host.position[0], host.position[1], host.rotY);
      if (px >= rug.minX && px <= rug.maxX && pz >= rug.minZ && pz <= rug.maxZ) stackedOn = host.uid;
    }
  }

  const probe: PlacedItem = {
    uid: ignoreUid ?? "_draft",
    itemId: def.id,
    position: [px, pz],
    rotY: rot,
    scale,
    placeOn,
    stackedOn,
  };
  const { valid, y } = assess(probe, items, catalog, model);
  const mounted = def.mount === "wall" ? snapMount(px, pz, sized, model.walls) : null;
  return {
    x: px,
    z: pz,
    rotY: rot,
    y,
    valid: valid && (def.mount !== "wall" || mounted !== null),
    placeOn,
    stackedOn,
  };
}

export function nudgeItem(
  item: PlacedItem,
  existing: PlacedItem[],
  catalog: Map<string, CatalogItem>,
  model: ApartmentModel,
): PlacedItem {
  if (assess(item, existing, catalog, model).valid) return item;
  for (let radius = 0.1; radius <= 0.8; radius += 0.1) {
    for (let step = 0; step < 8; step += 1) {
      const angle = (step / 8) * Math.PI * 2;
      const trial: PlacedItem = {
        ...item,
        position: [item.position[0] + Math.cos(angle) * radius, item.position[1] + Math.sin(angle) * radius],
      };
      if (assess(trial, existing, catalog, model).valid) {
        console.warn(
          `Đồ ${item.uid} bị trùng chỗ, chuyển tới (${trial.position[0].toFixed(2)}, ${trial.position[1].toFixed(2)}).`,
        );
        return trial;
      }
    }
  }
  console.warn(`Đồ ${item.uid} chưa có chỗ trống, giữ nguyên vị trí mẫu.`);
  return item;
}
