import type { ColliderBox, NavGrid } from "../../types/model";
import { zoneIndexAt, type Grid } from "./shell";

export const PLAYER_RADIUS = 0.22;
const NAV_CELL = 0.1;

function blocks(colliders: ColliderBox[], x: number, z: number): boolean {
  for (const box of colliders) {
    if (box.y - box.sy / 2 > 1.05) continue;
    const hx = box.sx / 2 + PLAYER_RADIUS;
    const hz = box.sz / 2 + PLAYER_RADIUS;
    if (Math.abs(x - box.x) <= hx && Math.abs(z - box.z) <= hz) return true;
  }
  return false;
}

export function buildNavGrid(grid: Grid, colliders: ColliderBox[], bounds: { minX: number; maxX: number; minZ: number; maxZ: number }): NavGrid {
  const originX = bounds.minX - 0.4;
  const originZ = bounds.minZ - 0.4;
  const cols = Math.ceil((bounds.maxX - bounds.minX + 0.8) / NAV_CELL);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ + 0.8) / NAV_CELL);
  const walkable = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = originX + (i + 0.5) * NAV_CELL;
      const z = originZ + (j + 0.5) * NAV_CELL;
      if (zoneIndexAt(grid, x, z) < 0) continue;
      if (blocks(colliders, x, z)) continue;
      walkable[j * cols + i] = 1;
    }
  }
  return { originX, originZ, cell: NAV_CELL, cols, rows, walkable };
}

export function navIndex(nav: NavGrid, i: number, j: number): number {
  return j * nav.cols + i;
}

export function worldToNav(nav: NavGrid, x: number, z: number): { i: number; j: number } | null {
  const i = Math.floor((x - nav.originX) / nav.cell);
  const j = Math.floor((z - nav.originZ) / nav.cell);
  if (i < 0 || j < 0 || i >= nav.cols || j >= nav.rows) return null;
  return { i, j };
}

export function navToWorld(nav: NavGrid, i: number, j: number): { x: number; z: number } {
  return {
    x: nav.originX + (i + 0.5) * nav.cell,
    z: nav.originZ + (j + 0.5) * nav.cell,
  };
}

export function isCellWalkable(nav: NavGrid, i: number, j: number): boolean {
  if (i < 0 || j < 0 || i >= nav.cols || j >= nav.rows) return false;
  return nav.walkable[navIndex(nav, i, j)] === 1;
}

export function nearestWalkable(nav: NavGrid, x: number, z: number, maxRadius = 8): { x: number; z: number } | null {
  const cell = worldToNav(nav, x, z);
  if (!cell) return null;
  if (isCellWalkable(nav, cell.i, cell.j)) return navToWorld(nav, cell.i, cell.j);
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dj = -radius; dj <= radius; dj++) {
      for (let di = -radius; di <= radius; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== radius) continue;
        const i = cell.i + di;
        const j = cell.j + dj;
        if (isCellWalkable(nav, i, j)) return navToWorld(nav, i, j);
      }
    }
  }
  return null;
}
