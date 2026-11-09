import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { input } from "../systems/movement/input";
import { player } from "../systems/movement/player";
import type { WallBox } from "../types/model";
import { getMaterial } from "./materials";

function crossesView(wall: WallBox, camX: number, camZ: number): boolean {
  const px = player.x;
  const pz = player.z;
  if (wall.axis === "x") {
    const z = wall.z;
    if ((camZ - z) * (pz - z) > 0) return false;
    const denom = pz - camZ;
    if (Math.abs(denom) < 1e-4) return false;
    const t = (z - camZ) / denom;
    if (t < 0.02 || t > 0.98) return false;
    const x = camX + (px - camX) * t;
    return Math.abs(x - wall.x) <= wall.sx / 2 + 0.08;
  }
  const x = wall.x;
  if ((camX - x) * (px - x) > 0) return false;
  const denom = px - camX;
  if (Math.abs(denom) < 1e-4) return false;
  const t = (x - camX) / denom;
  if (t < 0.02 || t > 0.98) return false;
  const z = camZ + (pz - camZ) * t;
  return Math.abs(z - wall.z) <= wall.sz / 2 + 0.08;
}

function shouldHide(wall: WallBox, camX: number, camZ: number): boolean {
  if (input.view === "first" || !input.cutaway) return false;
  if (wall.kind !== "railing" && (wall.nx !== 0 || wall.nz !== 0)) {
    const facing = (camX - wall.x) * wall.nx + (camZ - wall.z) * wall.nz;
    if (facing > 0.12) return true;
  }
  const nearPlayer = Math.hypot(wall.x - player.x, wall.z - player.z) < 3.5;
  return nearPlayer && crossesView(wall, camX, camZ);
}

function skirtOffsets(wall: WallBox): Array<{ x: number; z: number }> {
  const alongX = wall.axis === "x";
  const half = (alongX ? wall.sz : wall.sx) / 2 + 0.009;
  if (wall.nx !== 0 || wall.nz !== 0) {
    return [{ x: -wall.nx * half, z: -wall.nz * half }];
  }
  return alongX
    ? [
        { x: 0, z: half },
        { x: 0, z: -half },
      ]
    : [
        { x: half, z: 0 },
        { x: -half, z: 0 },
      ];
}

function WallGroup({ wall }: { wall: WallBox }) {
  const ref = useRef<Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current) ref.current.visible = !shouldHide(wall, camera.position.x, camera.position.z);
  });

  const onFloor = wall.y - wall.sy / 2 < 0.08 && wall.kind !== "railing" && wall.kind !== "lintel";
  const alongX = wall.axis === "x";
  const material = getMaterial(wall.kind === "railing" ? "railingGlass" : "wall");
  const opaque = wall.kind !== "railing";

  return (
    <group ref={ref} position={[wall.x, wall.y, wall.z]}>
      <mesh castShadow={opaque} receiveShadow={opaque} material={material}>
        <boxGeometry args={[wall.sx, wall.sy, wall.sz]} />
      </mesh>
      {wall.kind === "railing" && (
        <mesh position={[0, wall.sy / 2 + 0.02, 0]} material={getMaterial("aluminum")}>
          <boxGeometry args={[alongX ? wall.sx : 0.045, 0.04, alongX ? 0.045 : wall.sz]} />
        </mesh>
      )}
      {onFloor &&
        skirtOffsets(wall).map((offset, index) => (
          <mesh
            key={index}
            position={[offset.x, -wall.sy / 2 + 0.04, offset.z]}
            material={getMaterial("baseboard")}
            receiveShadow
          >
            <boxGeometry args={[alongX ? Math.max(0.05, wall.sx - 0.02) : 0.016, 0.08, alongX ? 0.016 : Math.max(0.05, wall.sz - 0.02)]} />
          </mesh>
        ))}
    </group>
  );
}

export function Walls({ walls }: { walls: WallBox[] }) {
  return (
    <group>
      {walls.map((wall) => (
        <WallGroup key={wall.id} wall={wall} />
      ))}
    </group>
  );
}
