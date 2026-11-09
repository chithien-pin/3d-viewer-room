import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import * as THREE from "three";
import { player } from "../systems/movement/player";
import type { ApartmentModel } from "../types/model";

function blocksView(
  camX: number,
  camY: number,
  camZ: number,
  focusX: number,
  focusY: number,
  focusZ: number,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): boolean {
  const closestX = Math.min(Math.max(camX, minX), maxX);
  const closestY = Math.min(Math.max(camY, minY), maxY);
  const closestZ = Math.min(Math.max(camZ, minZ), maxZ);
  const nearCamera = Math.hypot(camX - closestX, camY - closestY, camZ - closestZ) < 3.5;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  const inFront = (midX - camX) * (focusX - camX) + (midZ - camZ) * (focusZ - camZ) > 0;
  if (nearCamera && inFront) return true;
  if (camX >= minX && camX <= maxX && camY >= minY && camY <= maxY && camZ >= minZ && camZ <= maxZ) return true;
  const deltaX = focusX - camX;
  const deltaY = focusY - camY;
  const deltaZ = focusZ - camZ;
  const origin = [camX, camY, camZ];
  const delta = [deltaX, deltaY, deltaZ];
  const min = [minX, minY, minZ];
  const max = [maxX, maxY, maxZ];
  let tMin = 0;
  let tMax = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const direction = delta[axis];
    if (Math.abs(direction) < 1e-8) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return false;
      continue;
    }
    let enter = (min[axis] - origin[axis]) / direction;
    let exit = (max[axis] - origin[axis]) / direction;
    if (enter > exit) {
      const swap = enter;
      enter = exit;
      exit = swap;
    }
    tMin = Math.max(tMin, enter);
    tMax = Math.min(tMax, exit);
    if (tMin > tMax) return false;
  }
  return true;
}

function HideWhenBlocking({
  minX,
  minY,
  minZ,
  maxX,
  maxY,
  maxZ,
  children,
}: {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const pad = 0.6;
    group.visible = !blocksView(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      player.x,
      1.05,
      player.z,
      minX - pad,
      minY - pad,
      minZ - pad,
      maxX + pad,
      maxY + pad,
      maxZ + pad,
    );
  });
  return <group ref={ref}>{children}</group>;
}

export function Sun({ bounds }: { bounds: ApartmentModel["bounds"] }) {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(cx, 1.2, cz);
    return object;
  }, [cx, cz]);

  return (
    <>
      <primitive object={target} />
      <directionalLight
        target={target}
        position={[cx + 7, 16, cz + 9]}
        intensity={1.65}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.045}
        shadow-camera-near={2}
        shadow-camera-far={48}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[cx - 8, 8, cz - 6]} intensity={0.28} color="#d7e7fb" />
    </>
  );
}

export function Surroundings({ bounds }: { bounds: ApartmentModel["bounds"] }) {
  const blocks = useMemo(() => {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const gap = 16;
    return [
      { x: bounds.minX - gap, z: cz - 6, w: 8, d: 7, h: 32, color: "#d5dde6" },
      { x: cx - 8, z: bounds.minZ - gap, w: 11, d: 7, h: 40, color: "#c5d0dc" },
      { x: bounds.maxX + gap, z: cz + 2, w: 8, d: 9, h: 26, color: "#d9e2ea" },
      { x: cx + 4, z: bounds.maxZ + gap, w: 10, d: 7, h: 36, color: "#b7c3ce" },
      { x: bounds.minX - gap + 4, z: bounds.maxZ + gap - 6, w: 7, d: 7, h: 22, color: "#c9d5c4" },
      { x: bounds.maxX + gap - 2, z: bounds.minZ - gap + 8, w: 9, d: 7, h: 30, color: "#d0d7e0" },
    ];
  }, [bounds]);

  const trees = useMemo(() => {
    return [
      { x: bounds.minX - 1.6, z: bounds.maxZ - 0.4 },
      { x: bounds.maxX + 1.8, z: bounds.minZ + 2.2 },
      { x: bounds.minX + 0.4, z: bounds.minZ - 1.5 },
      { x: bounds.maxX + 0.6, z: bounds.maxZ + 1.2 },
      { x: bounds.minX - 2.2, z: (bounds.minZ + bounds.maxZ) / 2 },
    ];
  }, [bounds]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(bounds.minX + bounds.maxX) / 2, -0.04, (bounds.minZ + bounds.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#e5eee4" roughness={0.95} />
      </mesh>
      {blocks.map((block, index) => (
        <HideWhenBlocking
          key={index}
          minX={block.x - block.w / 2}
          maxX={block.x + block.w / 2}
          minY={0}
          maxY={block.h}
          minZ={block.z - block.d / 2}
          maxZ={block.z + block.d / 2}
        >
          <mesh position={[block.x, block.h / 2, block.z]} castShadow receiveShadow>
            <boxGeometry args={[block.w, block.h, block.d]} />
            <meshStandardMaterial color={block.color} roughness={0.72} />
          </mesh>
        </HideWhenBlocking>
      ))}
      {trees.map((tree, index) => (
        <HideWhenBlocking key={index} minX={tree.x - 0.6} maxX={tree.x + 0.6} minY={0} maxY={2.3} minZ={tree.z - 0.6} maxZ={tree.z + 0.6}>
          <group position={[tree.x, 0, tree.z]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 1.4, 6]} />
              <meshStandardMaterial color="#6d5338" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.7, 0]} castShadow>
              <sphereGeometry args={[0.55, 10, 8]} />
              <meshStandardMaterial color={index % 2 === 0 ? "#3f7f3f" : "#6aa356"} roughness={0.85} />
            </mesh>
          </group>
        </HideWhenBlocking>
      ))}
    </group>
  );
}
