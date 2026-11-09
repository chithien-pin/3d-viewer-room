import { useMemo } from "react";
import * as THREE from "three";
import type { NavGrid } from "../types/model";
import { navToWorld } from "../systems/layout/navGrid";

export function NavDebug({ nav }: { nav: NavGrid }) {
  const show = useMemo(() => new URLSearchParams(window.location.search).has("nav"), []);
  const mesh = useMemo(() => {
    if (!show) return null;
    const spots: { x: number; z: number }[] = [];
    for (let j = 0; j < nav.rows; j++) {
      for (let i = 0; i < nav.cols; i++) {
        if (nav.walkable[j * nav.cols + i] !== 1) continue;
        spots.push(navToWorld(nav, i, j));
      }
    }
    const geometry = new THREE.PlaneGeometry(nav.cell * 0.72, nav.cell * 0.72);
    const material = new THREE.MeshBasicMaterial({ color: "#2f9e44", transparent: true, opacity: 0.35, depthWrite: false });
    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(1, spots.length));
    const dummy = new THREE.Object3D();
    spots.forEach((spot, index) => {
      dummy.position.set(spot.x, 0.04, spot.z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.count = spots.length;
    instanced.instanceMatrix.needsUpdate = true;
    return instanced;
  }, [nav, show]);

  if (!mesh) return null;
  return <primitive object={mesh} />;
}
