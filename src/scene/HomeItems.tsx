import type { ReactNode } from "react";
import { MeshStandardMaterial } from "three";

const materials = new Map<string, MeshStandardMaterial>();

function paint(color: string, roughness = 0.62, metalness = 0.04, opacity = 1): MeshStandardMaterial {
  const key = `${color}-${roughness}-${metalness}-${opacity}`;
  const cached = materials.get(key);
  if (cached) return cached;
  const material = new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    side: 2,
  });
  materials.set(key, material);
  return material;
}

const PIANO_KEYS = [-0.5, -0.38, -0.26, -0.14, -0.02, 0.1, 0.22, 0.34, 0.46];

function DigitalPiano({ color }: { color: string }) {
  const wood = paint(color, 0.5, 0.08);
  const ivory = paint("#f4f0e6", 0.4);
  const black = paint("#141414", 0.45);
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

function SofaOlive({ color }: { color: string }) {
  const fabric = paint(color, 0.9);
  const b = -0.41;
  return (
    <group>
      <mesh position={[0, b + 0.16, 0.04]} castShadow receiveShadow material={fabric}>
        <boxGeometry args={[1.72, 0.28, 0.78]} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, b + 0.32, 0.08]} castShadow receiveShadow material={fabric}>
          <boxGeometry args={[0.72, 0.16, 0.62]} />
        </mesh>
      ))}
      <mesh position={[0, b + 0.46, -0.32]} castShadow receiveShadow material={fabric}>
        <boxGeometry args={[1.55, 0.42, 0.18]} />
      </mesh>
      <mesh position={[0, b + 0.64, -0.32]} rotation={[0, 0, Math.PI / 2]} castShadow material={fabric}>
        <cylinderGeometry args={[0.16, 0.16, 1.55, 16]} />
      </mesh>
      {[-0.86, 0.86].map((x) => (
        <mesh key={`arm-${x}`} position={[x, b + 0.34, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow material={fabric}>
          <cylinderGeometry args={[0.14, 0.14, 0.7, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function FridgeSharp({ color }: { color: string }) {
  const steel = paint(color, 0.35, 0.72);
  const dark = paint("#4e555a", 0.5, 0.3);
  const poster = paint("#2c2c2c");
  return (
    <group>
      <mesh position={[0, -0.815, 0]} receiveShadow material={dark}>
        <boxGeometry args={[0.64, 0.07, 0.7]} />
      </mesh>
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow material={steel}>
        <boxGeometry args={[0.6, 1.63, 0.64]} />
      </mesh>
      <mesh position={[0, 0.48, 0.33]} material={dark}>
        <boxGeometry args={[0.56, 0.62, 0.02]} />
      </mesh>
      <mesh position={[0, -0.22, 0.33]} material={poster}>
        <boxGeometry args={[0.42, 0.55, 0.015]} />
      </mesh>
    </group>
  );
}

function RoundClock() {
  const gold = paint("#d7b07a", 0.4, 0.4);
  const face = paint("#f7f4ee");
  const mark = paint("#2c2824", 0.45);
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={gold}>
        <cylinderGeometry args={[0.16, 0.16, 0.035, 24]} />
      </mesh>
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={face}>
        <cylinderGeometry args={[0.135, 0.135, 0.012, 24]} />
      </mesh>
      <mesh position={[0, 0.07, 0.022]} material={mark}>
        <boxGeometry args={[0.012, 0.03, 0.006]} />
      </mesh>
      <mesh position={[0.1, 0, 0.022]} material={mark}>
        <boxGeometry args={[0.03, 0.012, 0.006]} />
      </mesh>
      <mesh position={[0, -0.1, 0.022]} material={mark}>
        <boxGeometry args={[0.012, 0.03, 0.006]} />
      </mesh>
      <mesh position={[-0.1, 0, 0.022]} material={mark}>
        <boxGeometry args={[0.03, 0.012, 0.006]} />
      </mesh>
      <mesh position={[0.02, 0.035, 0.024]} rotation={[0, 0, -0.5]} material={mark}>
        <boxGeometry args={[0.09, 0.012, 0.006]} />
      </mesh>
      <mesh position={[-0.01, 0.02, 0.026]} rotation={[0, 0, 0.4]} material={mark}>
        <boxGeometry args={[0.012, 0.07, 0.006]} />
      </mesh>
    </group>
  );
}

function PlasticStool({ color }: { color: string }) {
  const plastic = paint(color, 0.45, 0.05);
  const b = -0.23;
  return (
    <group>
      <mesh position={[0, b + 0.4, 0]} castShadow receiveShadow material={plastic}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
      </mesh>
      {[-0.12, 0.12].map((x) =>
        [-0.12, 0.12].map((z) => (
          <mesh key={`${x}${z}`} position={[x, b + 0.18, z]} material={plastic}>
            <boxGeometry args={[0.04, 0.34, 0.04]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function WaterJug({ color }: { color: string }) {
  const water = paint(color, 0.25, 0.08);
  const cap = paint("#f08a1a", 0.45);
  return (
    <group>
      <mesh position={[0, -0.02, 0]} castShadow material={water}>
        <cylinderGeometry args={[0.13, 0.14, 0.4, 18]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={cap}>
        <cylinderGeometry args={[0.07, 0.08, 0.08, 14]} />
      </mesh>
    </group>
  );
}

function CatTree({ color }: { color: string }) {
  const plush = paint(color, 0.9);
  const rope = paint("#b08958", 0.85);
  const hole = paint("#6d6460");
  const b = -0.64;
  return (
    <group>
      <mesh position={[0.08, b + 0.18, 0.04]} castShadow receiveShadow material={plush}>
        <boxGeometry args={[0.4, 0.36, 0.4]} />
      </mesh>
      <mesh position={[0.08, b + 0.2, 0.25]} material={hole}>
        <circleGeometry args={[0.09, 16]} />
      </mesh>
      <mesh position={[-0.08, b + 0.42, -0.04]} material={rope}>
        <cylinderGeometry args={[0.045, 0.045, 0.48, 10]} />
      </mesh>
      <mesh position={[0.02, b + 0.68, 0]} castShadow material={plush}>
        <boxGeometry args={[0.46, 0.05, 0.36]} />
      </mesh>
      <mesh position={[0.08, b + 0.96, 0.02]} material={rope}>
        <cylinderGeometry args={[0.05, 0.05, 0.46, 10]} />
      </mesh>
      <mesh position={[0.08, b + 1.2, 0.02]} castShadow material={plush}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
      </mesh>
    </group>
  );
}

function LitterBox({ color }: { color: string }) {
  const body = paint(color, 0.7);
  const lid = paint("#e2c04a", 0.55);
  const hole = paint("#4a4038");
  return (
    <group>
      <mesh position={[0, -0.08, 0]} castShadow receiveShadow material={body}>
        <boxGeometry args={[0.46, 0.26, 0.36]} />
      </mesh>
      <mesh position={[0, 0.08, 0]} material={lid}>
        <boxGeometry args={[0.48, 0.08, 0.38]} />
      </mesh>
      <mesh position={[0, 0.02, 0.19]} material={hole}>
        <circleGeometry args={[0.08, 16]} />
      </mesh>
    </group>
  );
}

function WovenMat({ color }: { color: string }) {
  return (
    <mesh receiveShadow material={paint(color, 0.9)}>
      <boxGeometry args={[1.2, 0.02, 0.8]} />
    </mesh>
  );
}

function Monstera({ color }: { color: string }) {
  const leaf = paint(color, 0.55);
  const pot = paint("#f3efe6", 0.6);
  const soil = paint("#4a3424", 0.9);
  const stem = paint("#7da86a", 0.6);
  const leaves: Array<[number, number, number, number]> = [
    [0.22, 0.12, 0.12, 0.4],
    [-0.18, 0.22, -0.05, -0.6],
    [0.08, 0.34, 0.16, 0.9],
    [0.28, 0.05, -0.1, 1.2],
  ];
  return (
    <group>
      <mesh position={[0, -0.4, 0]} castShadow receiveShadow material={pot}>
        <cylinderGeometry args={[0.13, 0.11, 0.22, 16]} />
      </mesh>
      <mesh position={[0, -0.3, 0]} material={soil}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 14]} />
      </mesh>
      <mesh position={[0.02, -0.08, 0]} material={stem}>
        <cylinderGeometry args={[0.015, 0.02, 0.42, 8]} />
      </mesh>
      {leaves.map(([x, y, z, yaw]) => (
        <mesh key={`${x}${y}`} position={[x, y, z]} rotation={[0.5, yaw, 0.2]} material={leaf}>
          <circleGeometry args={[0.2, 7]} />
        </mesh>
      ))}
    </group>
  );
}

function Bookshelf({ color }: { color: string }) {
  const wood = paint(color, 0.55);
  const books = ["#2f4c7a", "#8d3b3b", "#e6e2dc", "#1f1f1f", "#c9a24a"];
  const b = -0.79;
  const shelves = [0.08, 0.38, 0.68, 0.98, 1.28, 1.5];
  return (
    <group>
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, b + 0.79, 0]} material={wood}>
          <boxGeometry args={[0.04, 1.58, 0.34]} />
        </mesh>
      ))}
      {shelves.map((y) => (
        <mesh key={y} position={[0, b + y, 0]} castShadow receiveShadow material={wood}>
          <boxGeometry args={[0.76, 0.025, 0.32]} />
        </mesh>
      ))}
      {books.map((tone, index) => (
        <mesh key={tone} position={[-0.28 + index * 0.12, b + 1.4, 0]} material={paint(tone)}>
          <boxGeometry args={[0.08, 0.18, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}

function AlpacaChair({ color }: { color: string }) {
  const body = paint(color, 0.85);
  const wool = paint("#f4f1ea", 0.9);
  const b = -0.58;
  return (
    <group>
      <mesh position={[0, b + 0.28, 0.05]} castShadow receiveShadow material={body}>
        <boxGeometry args={[0.5, 0.36, 0.58]} />
      </mesh>
      <mesh position={[0, b + 0.62, -0.08]} material={wool}>
        <cylinderGeometry args={[0.09, 0.11, 0.42, 12]} />
      </mesh>
      <mesh position={[0, b + 0.9, -0.02]} castShadow material={wool}>
        <sphereGeometry args={[0.16, 16, 12]} />
      </mesh>
      {[-0.16, 0.16].map((x) =>
        [-0.16, 0.16].map((z) => (
          <mesh key={`${x}${z}`} position={[x, b + 0.08, z]} material={wool}>
            <cylinderGeometry args={[0.05, 0.05, 0.14, 8]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function WalnutSideboard({ color }: { color: string }) {
  const wood = paint(color, 0.5);
  const dark = paint("#2a211c", 0.4);
  const b = -0.44;
  return (
    <group>
      {[-0.42, 0.42].map((x) =>
        [-0.16, 0.16].map((z) => (
          <mesh key={`${x}${z}`} position={[x, b + 0.06, z]} material={dark}>
            <boxGeometry args={[0.05, 0.1, 0.05]} />
          </mesh>
        )),
      )}
      <mesh position={[0, b + 0.46, 0]} castShadow receiveShadow material={wood}>
        <boxGeometry args={[1.04, 0.68, 0.44]} />
      </mesh>
      <mesh position={[0, b + 0.82, 0]} material={dark}>
        <boxGeometry args={[1.08, 0.04, 0.48]} />
      </mesh>
      <mesh position={[-0.24, b + 0.5, 0.225]} material={dark}>
        <boxGeometry args={[0.01, 0.5, 0.01]} />
      </mesh>
    </group>
  );
}

function Aquarium({ color }: { color: string }) {
  const glass = paint(color, 0.08, 0.05, 0.38);
  const water = paint("#7ec8d8", 0.2, 0.05);
  const stone = paint("#3a3a3a", 0.8);
  return (
    <group>
      <mesh castShadow material={glass}>
        <boxGeometry args={[0.62, 0.34, 0.3]} />
      </mesh>
      <mesh position={[0, -0.03, 0]} material={water}>
        <boxGeometry args={[0.56, 0.22, 0.24]} />
      </mesh>
      {[-0.16, 0, 0.14].map((x) => (
        <mesh key={x} position={[x, -0.12, 0]} material={stone}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function FloorFan({ color }: { color: string }) {
  const grey = paint(color, 0.45, 0.25);
  const dark = paint("#2c3134", 0.4, 0.4);
  const b = -0.27;
  return (
    <group>
      <mesh position={[0, b + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={grey}>
        <torusGeometry args={[0.16, 0.018, 8, 20, Math.PI]} />
      </mesh>
      <mesh position={[0, b + 0.28, 0]} rotation={[0.2, 0, 0]} castShadow material={grey}>
        <cylinderGeometry args={[0.2, 0.2, 0.07, 24]} />
      </mesh>
      <mesh position={[0, b + 0.28, 0.04]} rotation={[0.2, 0, 0]} material={dark}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
      </mesh>
    </group>
  );
}

function PetFeeder({ color }: { color: string }) {
  const body = paint(color, 0.5);
  const lid = paint("#b7ddd4", 0.45);
  const bowl = paint("#d9dde0", 0.35, 0.4);
  const b = -0.25;
  return (
    <group>
      <mesh position={[0, b + 0.22, -0.04]} castShadow material={body}>
        <boxGeometry args={[0.26, 0.32, 0.24]} />
      </mesh>
      <mesh position={[0, b + 0.4, -0.04]} material={lid}>
        <boxGeometry args={[0.22, 0.06, 0.18]} />
      </mesh>
      <mesh position={[0, b + 0.08, 0.12]} material={bowl}>
        <cylinderGeometry args={[0.09, 0.07, 0.08, 14]} />
      </mesh>
    </group>
  );
}

const shapes: Record<string, (color: string) => ReactNode> = {
  digital_piano: (color) => <DigitalPiano color={color} />,
  sofa_olive: (color) => <SofaOlive color={color} />,
  fridge_sharp: (color) => <FridgeSharp color={color} />,
  round_clock: () => <RoundClock />,
  plastic_stool: (color) => <PlasticStool color={color} />,
  water_jug: (color) => <WaterJug color={color} />,
  cat_tree: (color) => <CatTree color={color} />,
  litter_box: (color) => <LitterBox color={color} />,
  woven_mat: (color) => <WovenMat color={color} />,
  monstera: (color) => <Monstera color={color} />,
  bookshelf: (color) => <Bookshelf color={color} />,
  alpaca_chair: (color) => <AlpacaChair color={color} />,
  walnut_sideboard: (color) => <WalnutSideboard color={color} />,
  aquarium: (color) => <Aquarium color={color} />,
  floor_fan: (color) => <FloorFan color={color} />,
  pet_feeder: (color) => <PetFeeder color={color} />,
};

export function ItemShape({ id, color }: { id: string; color: string }) {
  const render = shapes[id];
  if (!render) return null;
  return render(color);
}
