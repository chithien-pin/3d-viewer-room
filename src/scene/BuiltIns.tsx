import type { Solid } from "../types/model";
import { getMaterial } from "./materials";

function SolidMesh({ solid }: { solid: Solid }) {
  const material = getMaterial(solid.material);
  const cast = !solid.transparent && solid.material !== "lamp" && solid.material !== "lime";
  return (
    <mesh
      position={[solid.x, solid.y, solid.z]}
      rotation={[solid.rotX ?? 0, solid.rotY ?? 0, solid.rotZ ?? 0]}
      material={material}
      castShadow={cast}
      receiveShadow={cast}
    >
      {solid.shape === "cylinder" ? (
        <cylinderGeometry args={[solid.sx, solid.sz || solid.sx, solid.sy, 18]} />
      ) : (
        <boxGeometry args={[Math.max(0.01, solid.sx), Math.max(0.01, solid.sy), Math.max(0.01, solid.sz)]} />
      )}
    </mesh>
  );
}

export function BuiltIns({ solids }: { solids: Solid[] }) {
  const lights = solids.filter((solid) => solid.material === "lime").slice(0, 3);
  return (
    <group>
      {solids.map((solid) => (
        <SolidMesh key={solid.id} solid={solid} />
      ))}
      {lights.map((solid) => (
        <pointLight
          key={`light-${solid.id}`}
          position={[solid.x - solid.sx * 0.2, solid.y, solid.z + 0.25]}
          color="#e8ff8a"
          intensity={0.35}
          distance={2.6}
          decay={2}
        />
      ))}
    </group>
  );
}
