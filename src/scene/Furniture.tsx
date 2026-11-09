import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { MeshStandardMaterial } from "three";
import { catalogById, useLayoutStore, variantColor } from "../store/useLayoutStore";
import { elevation } from "../systems/edit/placement";
import type { CatalogItem } from "../types/catalog";
import type { PlacedItem } from "../types/layout";

const materials = new Map<string, MeshStandardMaterial>();

function paint(color: string): MeshStandardMaterial {
  const cached = materials.get(color);
  if (cached) return cached;
  const material = new MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04 });
  materials.set(color, material);
  return material;
}

const PIANO_KEYS = [-0.5, -0.38, -0.26, -0.14, -0.02, 0.1, 0.22, 0.34, 0.46];

function DigitalPiano({ color }: { color: string }) {
  const wood = paint(color);
  const ivory = paint("#f4f0e6");
  const black = paint("#141414");
  return (
    <group>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} position={[x, -0.18, 0.02]} castShadow receiveShadow material={wood}>
          <boxGeometry args={[0.09, 0.62, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, -0.03]} castShadow receiveShadow material={wood}>
        <boxGeometry args={[1.28, 0.32, 0.34]} />
      </mesh>
      <mesh position={[0, 0.36, 0.18]} castShadow receiveShadow material={ivory}>
        <boxGeometry args={[1.16, 0.035, 0.12]} />
      </mesh>
      {PIANO_KEYS.map((x) => (
        <mesh key={x} position={[x, 0.382, 0.15]} material={black}>
          <boxGeometry args={[0.028, 0.016, 0.055]} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, -0.02]} rotation={[-0.55, 0, 0]} castShadow material={wood}>
        <boxGeometry args={[0.46, 0.14, 0.012]} />
      </mesh>
      <mesh position={[0, -0.4, 0.12]} castShadow receiveShadow material={wood}>
        <boxGeometry args={[0.36, 0.02, 0.1]} />
      </mesh>
      {[-0.08, 0, 0.08].map((x) => (
        <mesh key={`pedal-${x}`} position={[x, -0.375, 0.16]} material={black}>
          <boxGeometry args={[0.045, 0.018, 0.07]} />
        </mesh>
      ))}
    </group>
  );
}

function SageSofa({ color }: { color: string }) {
  const fabric = paint(color);
  const wood = paint("#e2c396");
  const leg = (x: number, z: number) => (
    <mesh key={`${x}-${z}`} position={[x, -0.36, z]} castShadow receiveShadow material={wood}>
      <cylinderGeometry args={[0.035, 0.028, 0.1, 10]} />
    </mesh>
  );
  return (
    <group>
      {[[-0.7, -0.28], [-0.7, 0.26], [0.7, -0.28], [0.7, 0.26]].map(([x, z]) => leg(x, z))}
      <mesh position={[0, -0.26, 0.02]} castShadow receiveShadow material={fabric}>
        <boxGeometry args={[1.56, 0.08, 0.74]} />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={`seat-${x}`} position={[x, -0.14, 0.05]} castShadow receiveShadow material={fabric}>
          <boxGeometry args={[0.68, 0.16, 0.62]} />
        </mesh>
      ))}
      {[-0.74, 0.74].map((x) => (
        <mesh key={`arm-${x}`} position={[x, -0.04, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={fabric}>
          <cylinderGeometry args={[0.13, 0.13, 0.62, 16]} />
        </mesh>
      ))}
      {[-0.36, 0.36].map((x) => (
        <group key={`back-${x}`}>
          <mesh position={[x, 0.02, -0.3]} castShadow receiveShadow material={fabric}>
            <boxGeometry args={[0.64, 0.34, 0.14]} />
          </mesh>
          <mesh position={[x, 0.16, -0.3]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={fabric}>
            <cylinderGeometry args={[0.16, 0.16, 0.64, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function blocks(def: CatalogItem, y: number): boolean {
  return !def.isFlat && def.mount !== "wall" && y - def.size[2] / 2 < 1.05;
}

function ItemView({ item, selected }: { item: PlacedItem; selected: boolean }) {
  const items = useLayoutStore((state) => state.items);
  const def = catalogById.get(item.itemId);
  if (!def) return null;
  const [width, depth, height] = def.size;
  const y = elevation(item, items, catalogById);
  const round = def.id === "coffee_table_round" || def.id === "blue_stool" || def.id === "plant_big";
  const color = variantColor(item.itemId, item.variantId);
  const yaw = (item.rotY * Math.PI) / 180;

  return (
    <group>
      <group position={[item.position[0], y, item.position[1]]} rotation={[0, yaw, 0]} userData={{ uid: item.uid }}>
        {def.id === "digital_piano" ? (
          <DigitalPiano color={color} />
        ) : def.id === "sofa_sage_2" ? (
          <SageSofa color={color} />
        ) : round ? (
          <mesh castShadow receiveShadow material={paint(color)}>
            <cylinderGeometry args={[Math.min(width, depth) / 2, Math.min(width, depth) / 2, height, def.id === "plant_big" ? 8 : 18]} />
          </mesh>
        ) : (
          <mesh castShadow receiveShadow material={paint(color)}>
            <boxGeometry args={[width, height, depth]} />
          </mesh>
        )}
        {selected && (
          <mesh>
            <boxGeometry args={[width + 0.05, height + 0.05, depth + 0.05]} />
            <meshBasicMaterial color="#e07a3d" wireframe />
          </mesh>
        )}
      </group>
      {blocks(def, y) && (
        <RigidBody type="fixed" colliders={false} position={[item.position[0], y, item.position[1]]} rotation={[0, yaw, 0]}>
          <CuboidCollider args={[width / 2, height / 2, depth / 2]} />
        </RigidBody>
      )}
    </group>
  );
}

export function Furniture() {
  const items = useLayoutStore((state) => state.items);
  const selectedUid = useLayoutStore((state) => state.selectedUid);
  return (
    <group name="furniture">
      {items.map((item) => (
        <ItemView key={item.uid} item={item} selected={item.uid === selectedUid} />
      ))}
    </group>
  );
}
