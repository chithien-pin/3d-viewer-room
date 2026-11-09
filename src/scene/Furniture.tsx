import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { catalogById, useLayoutStore, variantColor } from "../store/useLayoutStore";
import { elevation } from "../systems/edit/placement";
import type { CatalogItem } from "../types/catalog";
import type { PlacedItem } from "../types/layout";
import { ItemShape } from "./HomeItems";

function blocks(def: CatalogItem, y: number, height: number): boolean {
  return !def.isFlat && def.mount !== "wall" && y - height / 2 < 1.05;
}

function ItemView({ item, selected }: { item: PlacedItem; selected: boolean }) {
  const items = useLayoutStore((state) => state.items);
  const def = catalogById.get(item.itemId);
  if (!def) return null;
  const [sx, sy, sz] = item.scale ?? [1, 1, 1];
  const width = def.size[0] * sx;
  const depth = def.size[1] * sy;
  const height = def.size[2] * sz;
  const y = elevation(item, items, catalogById);
  const color = variantColor(item.itemId, item.variantId);
  const yaw = (item.rotY * Math.PI) / 180;

  return (
    <group>
      <group
        position={[item.position[0], y, item.position[1]]}
        rotation={[0, yaw, 0]}
        scale={[sx, sz, sy]}
        userData={{ uid: item.uid }}
      >
        <ItemShape id={def.id} color={color} />
        {selected && (
          <mesh>
            <boxGeometry args={[def.size[0] + 0.05, def.size[2] + 0.05, def.size[1] + 0.05]} />
            <meshBasicMaterial color="#e07a3d" wireframe />
          </mesh>
        )}
      </group>
      {blocks(def, y, height) && (
        <RigidBody
          key={`${width}-${height}-${depth}`}
          type="fixed"
          colliders={false}
          position={[item.position[0], y, item.position[1]]}
          rotation={[0, yaw, 0]}
        >
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
