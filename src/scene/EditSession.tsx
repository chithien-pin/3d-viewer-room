import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Raycaster, Vector2, type Group, type MeshStandardMaterial, type Object3D } from "three";
import { catalogById, nextUid, useLayoutStore, variantColor } from "../store/useLayoutStore";
import { draft } from "../systems/edit/draft";
import { resolvePose } from "../systems/edit/placement";
import { input } from "../systems/movement/input";
import type { ApartmentModel } from "../types/model";
import type { PlacedItem } from "../types/layout";

const raycaster = new Raycaster();
const pointer = new Vector2();

function readPointer(event: PointerEvent, element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function uidOf(object: Object3D): string | null {
  let current: Object3D | null = object;
  while (current) {
    if (typeof current.userData.uid === "string") return current.userData.uid;
    current = current.parent;
  }
  return null;
}

export function EditSession({ model }: { model: ApartmentModel }) {
  const { camera, gl, scene } = useThree();
  const ghost = useRef<Group>(null);
  const ghostMat = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    const group = ghost.current;
    const material = ghostMat.current;
    if (!group || !material) return;
    group.visible = input.editing && draft.active;
    group.position.set(draft.x, draft.y, draft.z);
    group.rotation.y = (draft.rotY * Math.PI) / 180;
    group.scale.set(draft.w, draft.h, draft.d);
    material.color.set(draft.valid ? "#3dba6a" : "#d4534a");
    material.opacity = draft.active ? 0.42 : 0;
  });

  useEffect(() => {
    const element = gl.domElement;
    let drag: { uid: string; ox: number; oz: number } | null = null;

    const floorPoint = (event: PointerEvent): { x: number; z: number } | null => {
      readPointer(event, element);
      raycaster.setFromCamera(pointer, camera);
      const floors = scene.getObjectByName("floors");
      if (!floors) return null;
      const hit = raycaster.intersectObject(floors, true)[0];
      if (!hit) return null;
      return { x: hit.point.x, z: hit.point.z };
    };

    const showDraft = (
      x: number,
      z: number,
      itemId: string,
      variantId: string | undefined,
      rotY: number,
      ignoreUid?: string,
      scale?: [number, number, number],
    ) => {
      const def = catalogById.get(itemId);
      const state = useLayoutStore.getState();
      if (!def) {
        draft.active = false;
        return;
      }
      const pose = resolvePose(x, z, rotY, def, state.items, model, catalogById, state.snap, ignoreUid, scale);
      const sized = scale ? [def.size[0] * scale[0], def.size[1] * scale[1], def.size[2] * scale[2]] : def.size;
      draft.active = true;
      draft.x = pose.x;
      draft.z = pose.z;
      draft.y = pose.y;
      draft.rotY = pose.rotY;
      draft.valid = pose.valid;
      draft.w = sized[0];
      draft.h = sized[2];
      draft.d = sized[1];
      draft.color = variantColor(itemId, variantId);
      draft.placeOn = pose.placeOn;
      draft.stackedOn = pose.stackedOn;
    };

    const onMove = (event: PointerEvent) => {
      if (!input.editing) return;
      const armed = useLayoutStore.getState().armed;
      if (!drag && !armed) return;
      const point = floorPoint(event);
      if (!point) return;
      const state = useLayoutStore.getState();
      if (drag) {
        const item = state.items.find((entry) => entry.uid === drag?.uid);
        if (!item) return;
        showDraft(point.x + drag.ox, point.z + drag.oz, item.itemId, item.variantId, item.rotY, item.uid, item.scale);
        return;
      }
      if (state.armed) showDraft(point.x, point.z, state.armed.itemId, state.armed.variantId, state.armed.rotY);
    };

    const onDown = (event: PointerEvent) => {
      if (!input.editing || event.button !== 0) return;
      const point = floorPoint(event);
      readPointer(event, element);
      raycaster.setFromCamera(pointer, camera);
      const furniture = scene.getObjectByName("furniture");
      const hit = furniture ? raycaster.intersectObject(furniture, true)[0] : undefined;
      const uid = hit ? uidOf(hit.object) : null;
      const state = useLayoutStore.getState();
      if (uid && !state.armed) {
        state.select(uid);
        const item = state.items.find((entry) => entry.uid === uid);
        if (item && !item.locked && point) drag = { uid, ox: item.position[0] - point.x, oz: item.position[1] - point.z };
        draft.active = false;
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!input.editing || event.button !== 0) return;
      const state = useLayoutStore.getState();
      if (drag) {
        const item = state.items.find((entry) => entry.uid === drag?.uid);
        if (item && draft.active && draft.valid) {
          const next: PlacedItem = {
            ...item,
            position: [draft.x, draft.z],
            rotY: draft.rotY,
            placeOn: draft.placeOn,
            stackedOn: draft.stackedOn,
          };
          state.commitMove(item.uid, next);
        }
        drag = null;
        draft.active = false;
        return;
      }
      if (state.armed && draft.active && draft.valid) {
        const item: PlacedItem = {
          uid: nextUid(state.armed.itemId),
          itemId: state.armed.itemId,
          variantId: state.armed.variantId,
          position: [draft.x, draft.z],
          rotY: draft.rotY,
          placeOn: draft.placeOn,
          stackedOn: draft.stackedOn,
        };
        state.place(item);
        draft.active = false;
      }
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointerup", onUp);
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointerup", onUp);
      draft.active = false;
    };
  }, [camera, gl, model, scene]);

  return (
    <group ref={ghost} visible={false}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={ghostMat} transparent opacity={0.42} depthWrite={false} color="#3dba6a" />
      </mesh>
    </group>
  );
}
