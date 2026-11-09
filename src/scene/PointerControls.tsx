import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { bindKeyboard, bindViewBridge, clamp, input, orbitBy } from "../systems/movement/input";
import { findPath } from "../systems/movement/pathfinding";
import { player } from "../systems/movement/player";
import { isCellWalkable, nearestWalkable, worldToNav } from "../systems/layout/navGrid";
import type { NavGrid } from "../types/model";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const focusScratch = new THREE.Vector3();

function resolveGoal(nav: NavGrid, x: number, z: number): { x: number; z: number } | null {
  const cell = worldToNav(nav, x, z);
  if (cell && isCellWalkable(nav, cell.i, cell.j)) return { x, z };
  return nearestWalkable(nav, x, z, 8);
}

export function PointerControls({ nav }: { nav: NavGrid }) {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    const element = gl.domElement;
    const unbindView = bindViewBridge((mode) => {
      if (mode === "first") {
        const lock = element.requestPointerLock();
        void Promise.resolve(lock).catch(() => undefined);
      } else if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    });
    const unbindKeys = bindKeyboard(window);
    let dragging = false;
    let touchOrbit = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;

    const orbit = (dx: number, dy: number) => {
      if (input.view === "first") {
        input.yaw -= dx * 0.005;
        input.lookPitch = clamp(input.lookPitch + dy * 0.0032, -1.2, 1.2);
        return;
      }
      orbitBy(dx, dy);
    };

    const onMouseLook = (event: MouseEvent) => {
      if (document.pointerLockElement !== element || input.view !== "first") return;
      input.yaw -= event.movementX * 0.0022;
      input.lookPitch = clamp(input.lookPitch + event.movementY * 0.002, -1.2, 1.2);
    };

    const onPointerDown = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
      if (event.button === 2 || (event.button === 0 && event.pointerType === "touch")) {
        dragging = true;
        touchOrbit = event.pointerType === "touch";
        lastX = event.clientX;
        lastY = event.clientY;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      if (event.buttons === 2 || touchOrbit) orbit(dx, dy);
    };

    const onPointerUp = (event: PointerEvent) => {
      const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
      const tap = event.button === 0 && moved < 7;
      dragging = false;
      touchOrbit = false;
      if (input.view === "first") {
        if (tap) {
          const lock = element.requestPointerLock();
          void Promise.resolve(lock).catch(() => undefined);
        }
        return;
      }
      if (input.editing) return;
      if (!tap) return;
      const rect = element.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const floors = scene.getObjectByName("floors");
      if (!floors) return;
      const hit = raycaster.intersectObject(floors, true)[0];
      if (!hit) return;
      const goal = resolveGoal(nav, hit.point.x, hit.point.z);
      if (!goal) return;
      let startX = player.x;
      let startZ = player.z;
      const startCell = worldToNav(nav, startX, startZ);
      if (!startCell || !isCellWalkable(nav, startCell.i, startCell.j)) {
        const near = nearestWalkable(nav, startX, startZ, 8);
        if (!near) return;
        startX = near.x;
        startZ = near.z;
      }
      const path = findPath(nav, startX, startZ, goal.x, goal.z);
      if (!path || path.length === 0) {
        console.warn("[Glory Heights] Không có lối đi tới điểm đã chọn.");
        return;
      }
      input.path = path;
      input.destination = goal;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (input.view === "first") return;
      input.distance = clamp(input.distance + event.deltaY * 0.008, 6, 20);
    };
    const onContext = (event: Event) => event.preventDefault();

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mousemove", onMouseLook);
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("contextmenu", onContext);
    return () => {
      unbindView();
      unbindKeys();
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mousemove", onMouseLook);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("contextmenu", onContext);
      if (document.pointerLockElement === element) document.exitPointerLock();
    };
  }, [camera, gl, nav, scene]);

  return null;
}

export function CameraRig() {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const ready = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = 1 - Math.exp(-5.5 * dt);
    if (input.view === "first") {
      const eye = 1.6;
      const cp = Math.cos(input.lookPitch);
      desired.current.set(player.x, eye, player.z);
      focusScratch.set(
        player.x - Math.sin(input.yaw) * cp,
        eye - Math.sin(input.lookPitch),
        player.z - Math.cos(input.yaw) * cp,
      );
    } else {
      const focusY = 1.05;
      const horizontal = Math.cos(input.pitch) * input.distance;
      const vertical = Math.sin(input.pitch) * input.distance;
      desired.current.set(
        player.x + Math.sin(input.yaw) * horizontal,
        Math.max(0.6, focusY + vertical),
        player.z + Math.cos(input.yaw) * horizontal,
      );
      focusScratch.set(player.x, focusY, player.z);
    }
    if (!ready.current) {
      camera.position.copy(desired.current);
      look.current.copy(focusScratch);
      ready.current = true;
    } else {
      camera.position.lerp(desired.current, k);
      look.current.lerp(focusScratch, k);
    }
    camera.lookAt(look.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = input.view === "first" ? 68 : 40;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * k;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

export function DestinationMarker() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const destination = input.destination;
    if (!destination) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.set(destination.x, 0.035, destination.z);
    mesh.rotation.z -= dt * 1.4;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.16, 0.26, 28]} />
      <meshBasicMaterial color="#2f7a45" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}
