import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import type { KinematicCharacterController } from "@dimforge/rapier3d-compat";
import type { Group } from "three";
import { desiredDisplacement } from "../systems/movement/displace";
import { input, subscribeInput } from "../systems/movement/input";
import { lerpAngle, PLAYER, player } from "../systems/movement/player";
import { getMaterial } from "./materials";

function Nameplate() {
  const [show, setShow] = useState(input.showLabels && input.view !== "first");
  useEffect(() => subscribeInput(() => setShow(input.showLabels && input.view !== "first")), []);
  if (!show) return null;
  return (
    <Html position={[0, 1.38, 0]} center sprite distanceFactor={8} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
      <div className="nameplate">Bạn</div>
    </Html>
  );
}

function RobotVisual() {
  const spin = useRef<Group>(null);
  const bob = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const root = useRef<Group>(null);
  const body = getMaterial("robot");
  const accent = getMaterial("robotAccent");
  const dark = getMaterial("robotDark");

  useFrame(() => {
    if (root.current) root.current.visible = input.view !== "first";
    if (spin.current) spin.current.rotation.y = player.rotY;
    const swing = player.moving ? Math.sin(player.phase) : 0;
    const bobY = player.moving ? Math.abs(Math.sin(player.phase)) * 0.045 : Math.sin(performance.now() / 520) * 0.012;
    if (bob.current) bob.current.position.y = bobY;
    if (armL.current) armL.current.rotation.x = swing * 0.75;
    if (armR.current) armR.current.rotation.x = -swing * 0.75;
    if (legL.current) legL.current.rotation.x = -swing * 0.55;
    if (legR.current) legR.current.rotation.x = swing * 0.55;
  });

  return (
    <group ref={root} position={[0, -PLAYER.standY, 0]}>
      <group ref={spin}>
        <group ref={bob}>
          <group ref={legL} position={[-0.09, 0.16, 0]}>
            <mesh position={[0, -0.08, 0]} material={dark} castShadow>
              <boxGeometry args={[0.09, 0.16, 0.1]} />
            </mesh>
          </group>
          <group ref={legR} position={[0.09, 0.16, 0]}>
            <mesh position={[0, -0.08, 0]} material={dark} castShadow>
              <boxGeometry args={[0.09, 0.16, 0.1]} />
            </mesh>
          </group>
          <mesh position={[0, 0.48, 0]} material={body} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.4, 0.28]} />
          </mesh>
          <mesh position={[0, 0.5, 0.145]} material={accent}>
            <boxGeometry args={[0.18, 0.14, 0.02]} />
          </mesh>
          <group ref={armL} position={[-0.26, 0.58, 0]}>
            <mesh position={[0, -0.12, 0]} material={body} castShadow>
              <boxGeometry args={[0.09, 0.24, 0.09]} />
            </mesh>
          </group>
          <group ref={armR} position={[0.26, 0.58, 0]}>
            <mesh position={[0, -0.12, 0]} material={body} castShadow>
              <boxGeometry args={[0.09, 0.24, 0.09]} />
            </mesh>
          </group>
          <mesh position={[0, 0.86, 0]} material={body} castShadow>
            <sphereGeometry args={[0.2, 20, 16]} />
          </mesh>
          <mesh position={[-0.07, 0.88, 0.16]} material={dark}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
          <mesh position={[0.07, 0.88, 0.16]} material={dark}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
          <mesh position={[0, 0.8, 0.17]} material={accent}>
            <boxGeometry args={[0.06, 0.02, 0.02]} />
          </mesh>
          <mesh position={[0, 1.08, 0]} material={accent}>
            <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
          </mesh>
          <mesh position={[0, 1.17, 0]} material={accent}>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
        </group>
      </group>
      <Nameplate />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={getMaterial("shadow")}>
        <circleGeometry args={[0.28, 20]} />
      </mesh>
    </group>
  );
}

export function Character() {
  const body = useRef<RapierRigidBody>(null);
  const { world, rapier } = useRapier();
  const controller = useRef<KinematicCharacterController | null>(null);
  const wish = useRef(new rapier.Vector3(0, 0, 0));

  useEffect(() => {
    const next = world.createCharacterController(0.02);
    next.setSlideEnabled(true);
    next.enableAutostep(0.22, 0.12, true);
    next.enableSnapToGround(0.18);
    next.setMaxSlopeClimbAngle(Math.PI / 4);
    next.setMinSlopeSlideAngle(Math.PI / 3);
    next.setApplyImpulsesToDynamicBodies(false);
    controller.current = next;
    return () => {
      world.removeCharacterController(next);
      controller.current = null;
    };
  }, [world]);

  useFrame((_, delta) => {
    const rigidBody = body.current;
    const control = controller.current;
    if (!rigidBody || !control || rigidBody.numColliders() === 0) return;
    const stepWish = desiredDisplacement(delta);
    wish.current.x = stepWish.x;
    wish.current.y = stepWish.y;
    wish.current.z = stepWish.z;
    control.computeColliderMovement(rigidBody.collider(0), wish.current);
    const moved = control.computedMovement();
    const current = rigidBody.translation();
    let y = current.y + moved.y;
    if (control.computedGrounded() && Math.abs(y - PLAYER.standY) < 0.12) y = PLAYER.standY;
    if (y < 0.2 || y > 2.4) y = PLAYER.standY;
    const x = current.x + moved.x;
    const z = current.z + moved.z;
    rigidBody.setNextKinematicTranslation({ x, y, z });
    player.x = x;
    player.y = y;
    player.z = z;
    const step = Math.hypot(moved.x, moved.z);
    if (input.view === "first") player.rotY = input.yaw + Math.PI;
    if (step > 0.0008) {
      if (input.view !== "first") {
        player.rotY = lerpAngle(player.rotY, Math.atan2(moved.x, moved.z), 1 - Math.exp(-12 * Math.min(delta, 0.05)));
      }
      player.moving = true;
      player.running = input.run && step > 0.004;
      player.phase += Math.min(delta, 0.05) * (player.running ? 13 : 8.5);
    } else {
      player.moving = false;
      player.running = false;
    }
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[player.x, PLAYER.standY, player.z]}
      lockRotations
      gravityScale={0}
    >
      <CapsuleCollider args={[PLAYER.halfHeight, PLAYER.radius]} friction={0.15} />
      <RobotVisual />
    </RigidBody>
  );
}
