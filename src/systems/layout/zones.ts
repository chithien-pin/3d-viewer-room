import type { ApartmentFile, Rect, WallSide } from "../../types/apartment";
import type { ZoneRect } from "../../types/model";

const SNAP_TOLERANCE = 0.12;

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Gộp các tọa độ lệch nhau trong sai số đo (±10–12 cm) về một đường kẻ chung. */
export function clusterAxis(values: number[], tolerance = SNAP_TOLERANCE): Map<number, number> {
  const unique = Array.from(new Set(values.map(round4))).sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const value of unique) {
    const last = clusters[clusters.length - 1];
    if (!last || value - last[last.length - 1] > tolerance) clusters.push([value]);
    else last.push(value);
  }
  const map = new Map<number, number>();
  for (const cluster of clusters) {
    const avg = round4(cluster.reduce((sum, value) => sum + value, 0) / cluster.length);
    for (const value of cluster) map.set(value, avg);
  }
  return map;
}

export function snapValue(map: Map<number, number>, value: number): number {
  const key = round4(value);
  return map.get(key) ?? key;
}

export function buildZones(file: ApartmentFile): { zones: ZoneRect[]; xMap: Map<number, number>; zMap: Map<number, number> } {
  const raw: Array<{ id: string; name: string; rect: Rect; floor: string; kind: ZoneRect["kind"]; openSides: WallSide[] }> = [];
  for (const room of file.closedRooms) {
    raw.push({
      id: room.id,
      name: room.name,
      rect: room.rect,
      floor: room.floor,
      kind: room.outdoor ? "outdoor" : "closed",
      openSides: room.openSides ?? [],
    });
  }
  for (const zone of file.openZones) {
    raw.push({
      id: zone.id,
      name: zone.name,
      rect: zone.rect,
      floor: zone.floor,
      kind: "open",
      openSides: [],
    });
  }

  const xs: number[] = [];
  const zs: number[] = [];
  for (const zone of raw) {
    const [x, z, w, d] = zone.rect;
    xs.push(x, x + w);
    zs.push(z, z + d);
  }
  const xMap = clusterAxis(xs);
  const zMap = clusterAxis(zs);

  const zones: ZoneRect[] = raw.map((zone) => {
    const [x, z, w, d] = zone.rect;
    const x0 = snapValue(xMap, x);
    const z0 = snapValue(zMap, z);
    const x1 = snapValue(xMap, x + w);
    const z1 = snapValue(zMap, z + d);
    return {
      id: zone.id,
      name: zone.name,
      x: x0,
      z: z0,
      w: round4(x1 - x0),
      d: round4(z1 - z0),
      floor: zone.floor,
      kind: zone.kind,
      openSides: zone.openSides,
    };
  });

  return { zones, xMap, zMap };
}

export function snapPoint(xMap: Map<number, number>, zMap: Map<number, number>, x: number, z: number): { x: number; z: number } {
  return { x: snapValue(xMap, x), z: snapValue(zMap, z) };
}
