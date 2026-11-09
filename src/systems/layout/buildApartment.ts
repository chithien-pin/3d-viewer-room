import type { ApartmentFile, Facing } from "../../types/apartment";
import type { ApartmentModel, ColliderBox } from "../../types/model";
import { buildBuiltIns } from "./builtIns";
import { buildNavGrid, nearestWalkable } from "./navGrid";
import { buildShell } from "./shell";
import { buildZones } from "./zones";

const FACING_YAW: Record<Facing, number> = {
  south: 0,
  west: Math.PI / 2,
  north: Math.PI,
  east: -Math.PI / 2,
};

function wallColliders(modelWalls: ApartmentModel["walls"]): ColliderBox[] {
  return modelWalls.map((wall) => {
    const railing = wall.kind === "railing";
    const alongX = wall.axis === "x";
    const thick = railing ? 0.1 : alongX ? wall.sz : wall.sx;
    return {
      id: `col-${wall.id}`,
      x: wall.x,
      y: wall.y,
      z: wall.z,
      sx: alongX ? wall.sx : thick,
      sy: wall.sy,
      sz: alongX ? thick : wall.sz,
    };
  });
}

/** Vành vô hình bên ngoài vỏ nhà, để cửa ra vào đi được nhưng không rơi ra ngoài căn hộ. */
function containment(bounds: ApartmentModel["bounds"], ceiling: number): ColliderBox[] {
  const pad = 0.55;
  const thick = 0.2;
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minZ = bounds.minZ - pad;
  const maxZ = bounds.maxZ + pad;
  const y = ceiling / 2;
  return [
    { id: "guard-n", x: (minX + maxX) / 2, y, z: minZ, sx: maxX - minX, sy: ceiling, sz: thick },
    { id: "guard-s", x: (minX + maxX) / 2, y, z: maxZ, sx: maxX - minX, sy: ceiling, sz: thick },
    { id: "guard-w", x: minX, y, z: (minZ + maxZ) / 2, sx: thick, sy: ceiling, sz: maxZ - minZ },
    { id: "guard-e", x: maxX, y, z: (minZ + maxZ) / 2, sx: thick, sy: ceiling, sz: maxZ - minZ },
  ];
}

export function buildApartment(file: ApartmentFile): ApartmentModel {
  const { zones, xMap, zMap } = buildZones(file);
  const shell = buildShell(file, zones);
  const built = buildBuiltIns(file, zones, shell.shellRuns, xMap, zMap);

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const zone of zones) {
    minX = Math.min(minX, zone.x);
    maxX = Math.max(maxX, zone.x + zone.w);
    minZ = Math.min(minZ, zone.z);
    maxZ = Math.max(maxZ, zone.z + zone.d);
  }
  const bounds = { minX, maxX, minZ, maxZ };
  const colliders = [...wallColliders(shell.walls), ...built.colliders, ...containment(bounds, file.meta.ceilingHeight)];
  const nav = buildNavGrid(shell.grid, colliders, bounds);

  const spawnRaw = file.spawn.position;
  let spawnX = spawnRaw[0];
  let spawnZ = spawnRaw[2];
  const safe = nearestWalkable(nav, spawnX, spawnZ, 12);
  if (!safe) {
    console.warn("[Glory Heights] Không tìm thấy ô đi được gần điểm spawn. Giữ nguyên tọa độ JSON.");
  } else if (Math.hypot(safe.x - spawnX, safe.z - spawnZ) > 0.2) {
    console.warn(
      `[Glory Heights] Spawn (${spawnX.toFixed(2)}, ${spawnZ.toFixed(2)}) bị chắn, dịch tới (${safe.x.toFixed(2)}, ${safe.z.toFixed(2)}).`,
    );
    spawnX = safe.x;
    spawnZ = safe.z;
  }

  let walkableCount = 0;
  for (const cell of nav.walkable) walkableCount += cell;
  console.info(
    `[Glory Heights] ${shell.walls.length} mảng tường, ${shell.floors.length} mảnh sàn, ${shell.openings.length} lỗ cửa/cửa sổ, ${walkableCount} ô đi được.`,
  );

  return {
    name: file.meta.name,
    ceilingHeight: file.meta.ceilingHeight,
    zones,
    floors: shell.floors,
    walls: shell.walls,
    colliders,
    openings: shell.openings,
    solids: built.solids,
    nav,
    spawn: {
      x: spawnX,
      y: spawnRaw[1],
      z: spawnZ,
      rotY: FACING_YAW[file.spawn.facing],
      facing: file.spawn.facing,
    },
    bounds,
  };
}
