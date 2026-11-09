import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { FloorRect } from "../types/model";
import { FLOOR_TILE, getFloorMaterial } from "./materials";

function buildFloorGeometry(rects: FloorRect[], tileU: number, tileV: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const y = 0.008;
  for (const rect of rects) {
    const base = positions.length / 3;
    const x1 = rect.x + rect.w;
    const z1 = rect.z + rect.d;
    positions.push(rect.x, y, rect.z, x1, y, rect.z, x1, y, z1, rect.x, y, z1);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(rect.x / tileU, rect.z / tileV, x1 / tileU, rect.z / tileV, x1 / tileU, z1 / tileV, rect.x / tileU, z1 / tileV);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function FloorMesh({ rects, materialId }: { rects: FloorRect[]; materialId: string }) {
  const tile = FLOOR_TILE[materialId] ?? { u: 1, v: 1 };
  const geometry = useMemo(() => buildFloorGeometry(rects, tile.u, tile.v), [rects, tile.u, tile.v]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  if (rects.length === 0) return null;
  return (
    <mesh geometry={geometry} receiveShadow userData={{ floor: true }} material={getFloorMaterial(materialId)} />
  );
}

export function Floors({ floors }: { floors: FloorRect[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, FloorRect[]>();
    for (const floor of floors) {
      const list = map.get(floor.material);
      if (list) list.push(floor);
      else map.set(floor.material, [floor]);
    }
    return Array.from(map.entries());
  }, [floors]);

  return (
    <group name="floors">
      {groups.map(([materialId, rects]) => (
        <FloorMesh key={materialId} materialId={materialId} rects={rects} />
      ))}
    </group>
  );
}
