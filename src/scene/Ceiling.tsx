import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { input } from "../systems/movement/input";
import type { FloorRect } from "../types/model";
import { getMaterial } from "./materials";

function inside(floors: FloorRect[], x: number, z: number): boolean {
  return floors.some((floor) => x >= floor.x && x <= floor.x + floor.w && z >= floor.z && z <= floor.z + floor.d);
}

export function Ceiling({ floors, height }: { floors: FloorRect[]; height: number }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const y = height - 0.02;
    for (const floor of floors) {
      const base = positions.length / 3;
      const x1 = floor.x + floor.w;
      const z1 = floor.z + floor.d;
      positions.push(floor.x, y, floor.z, x1, y, floor.z, x1, y, z1, floor.x, y, z1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [floors, height]);

  const lights = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const floor of floors) {
      minX = Math.min(minX, floor.x);
      maxX = Math.max(maxX, floor.x + floor.w);
      minZ = Math.min(minZ, floor.z);
      maxZ = Math.max(maxZ, floor.z + floor.d);
    }
    const down: THREE.Vector3[] = [];
    const sprinklers: THREE.Vector3[] = [];
    for (let x = minX + 0.7; x < maxX; x += 1.55) {
      for (let z = minZ + 0.7; z < maxZ; z += 1.55) {
        if (inside(floors, x, z)) down.push(new THREE.Vector3(x, height - 0.04, z));
      }
    }
    for (let x = minX + 1.3; x < maxX; x += 2.7) {
      for (let z = minZ + 1.3; z < maxZ; z += 2.7) {
        if (inside(floors, x, z)) sprinklers.push(new THREE.Vector3(x, height - 0.03, z));
      }
    }
    return { down, sprinklers };
  }, [floors, height]);

  const downMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), getMaterial("lamp"), Math.max(1, lights.down.length));
    const dummy = new THREE.Object3D();
    lights.down.forEach((point, index) => {
      dummy.position.copy(point);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.count = lights.down.length;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [lights.down]);

  useLayoutEffect(() => () => {
    geometry.dispose();
    downMesh.geometry.dispose();
  }, [geometry, downMesh]);

  useFrame(() => {
    if (group.current) group.current.visible = input.showCeiling || input.view === "first";
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={geometry} material={getMaterial("ceiling")} />
      <primitive object={downMesh} />
      {lights.sprinklers.map((point, index) => (
        <mesh key={index} position={point} material={getMaterial("steel")}>
          <cylinderGeometry args={[0.025, 0.04, 0.03, 8]} />
        </mesh>
      ))}
    </group>
  );
}
