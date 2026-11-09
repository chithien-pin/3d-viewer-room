import { useEffect } from "react";
import { Physics } from "@react-three/rapier";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useRuntimeStore } from "../store/useRuntimeStore";
import type { ApartmentModel, ColliderBox } from "../types/model";
import { EditSession } from "./EditSession";
import { Furniture } from "./Furniture";
import { BuiltIns } from "./BuiltIns";
import { Ceiling } from "./Ceiling";
import { Character } from "./Character";
import { Sun, Surroundings } from "./Environment";
import { Floors } from "./Floors";
import { NavDebug } from "./NavDebug";
import { Openings } from "./Openings";
import { CameraRig, DestinationMarker, PointerControls } from "./PointerControls";
import { RoomLabels } from "./RoomLabels";
import { Walls } from "./Walls";

function StaticColliders({ boxes }: { boxes: ColliderBox[] }) {
  return (
    <RigidBody type="fixed" colliders={false} friction={0.8}>
      <CuboidCollider args={[40, 0.12, 40]} position={[4, -0.12, 4]} />
      {boxes.map((box) => (
        <CuboidCollider
          key={box.id}
          args={[box.sx / 2, box.sy / 2, box.sz / 2]}
          position={[box.x, box.y, box.z]}
        />
      ))}
    </RigidBody>
  );
}

export function Experience({ model }: { model: ApartmentModel }) {
  const setReady = useRuntimeStore((state) => state.setReady);
  const debugPhysics = new URLSearchParams(window.location.search).has("physics");

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, [setReady]);

  return (
    <>
      <color attach="background" args={["#c5e3f6"]} />
      <fog attach="fog" args={["#d5e8f6", 28, 78]} />
      <hemisphereLight args={["#e7f3ff", "#f4eadf", 0.7]} />
      <ambientLight intensity={0.16} />
      <Sun bounds={model.bounds} />
      <Surroundings bounds={model.bounds} />
      <Floors floors={model.floors} />
      <Walls walls={model.walls} />
      <Openings openings={model.openings} />
      <BuiltIns solids={model.solids} />
      <Ceiling floors={model.floors} height={model.ceilingHeight} />
      <NavDebug nav={model.nav} />
      <RoomLabels zones={model.zones} />
      <DestinationMarker />
      <PointerControls nav={model.nav} />
      <EditSession model={model} />
      <Physics gravity={[0, -9.81, 0]} timeStep="vary" debug={debugPhysics}>
        <StaticColliders boxes={model.colliders} />
        <Furniture />
        <Character />
      </Physics>
      <CameraRig />
    </>
  );
}
