import type { ZoneRect } from "../../types/model";

/** Phòng nhỏ nhất chứa điểm. Dùng cho HUD và không phụ thuộc lưới tường. */
export function zoneAt(zones: ZoneRect[], x: number, z: number): ZoneRect | null {
  let best: ZoneRect | null = null;
  let bestArea = Infinity;
  for (const zone of zones) {
    if (x < zone.x || z < zone.z || x > zone.x + zone.w || z > zone.z + zone.d) continue;
    const area = zone.w * zone.d;
    if (area < bestArea) {
      best = zone;
      bestArea = area;
    }
  }
  return best;
}
