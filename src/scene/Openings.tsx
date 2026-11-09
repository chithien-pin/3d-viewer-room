import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { player } from "../systems/movement/player";
import type { Opening } from "../types/model";
import { getMaterial } from "./materials";

const OPEN_ANGLE = 0.82;

function Frame({ opening }: { opening: Opening }) {
  const width = opening.to - opening.from;
  const height = opening.y1 - opening.y0;
  const depth = opening.wallThickness + 0.04;
  const bar = opening.kind === "window" ? 0.05 : 0.055;
  const alongX = opening.axis === "x";
  const cx = alongX ? (opening.from + opening.to) / 2 : opening.fixed;
  const cz = alongX ? opening.fixed : (opening.from + opening.to) / 2;
  const material = getMaterial("aluminum");
  const jamb = (shift: number, key: string) => (
    <mesh
      key={key}
      position={[cx + (alongX ? shift : 0), opening.y0 + height / 2, cz + (alongX ? 0 : shift)]}
      material={material}
    >
      <boxGeometry args={[alongX ? bar : depth, height, alongX ? depth : bar]} />
    </mesh>
  );
  return (
    <group>
      {jamb(-width / 2, "l")}
      {jamb(width / 2, "r")}
      <mesh position={[cx, opening.y1 - bar / 2, cz]} material={material}>
        <boxGeometry args={[alongX ? width : depth, bar, alongX ? depth : width]} />
      </mesh>
      {opening.kind !== "window" && opening.y0 < 0.05 ? null : (
        <mesh position={[cx, opening.y0 + bar / 2, cz]} material={material}>
          <boxGeometry args={[alongX ? width : depth, bar, alongX ? depth : width]} />
        </mesh>
      )}
    </group>
  );
}

function SwingDoor({ opening }: { opening: Opening }) {
  const width = opening.to - opening.from;
  const height = opening.y1 - opening.y0;
  const yaw = Math.atan2(opening.inX, opening.inZ);
  const alongX = Math.cos(yaw);
  const alongZ = -Math.sin(yaw);
  const wantX = opening.axis === "x" ? 1 : 0;
  const wantZ = opening.axis === "z" ? 1 : 0;
  const flip = alongX * wantX + alongZ * wantZ < 0;
  const center = flip ? -width / 2 : width / 2;
  const entry = opening.style === "entry_oak_darkstripe";
  const leaf = useRef<Group>(null);
  const amount = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const across = opening.axis === "x" ? player.x : player.z;
    const perp = opening.axis === "x" ? Math.abs(player.z - opening.fixed) : Math.abs(player.x - opening.fixed);
    const inSpan = across > opening.from - 0.2 && across < opening.to + 0.2;
    const open = amount.current > 0.08;
    const near = inSpan && perp < (open ? 1.2 : 0.48);
    const target = near ? 1 : 0;
    const rate = target > amount.current ? 4.2 : 2.4;
    amount.current += (target - amount.current) * (1 - Math.exp(-rate * dt));
    if (leaf.current) leaf.current.rotation.y = yaw - OPEN_ANGLE * amount.current;
  });

  return (
    <group ref={leaf} position={[opening.hingeX, 0, opening.hingeZ]} rotation={[0, yaw, 0]}>
      {entry ? (
        <group position={[center, height / 2, 0]}>
          <mesh position={[-width * 0.16, 0, 0]} castShadow material={getMaterial("oak")}>
            <boxGeometry args={[width * 0.64, height, 0.04]} />
          </mesh>
          <mesh position={[width * 0.28, 0, 0]} castShadow material={getMaterial("robotDark")}>
            <boxGeometry args={[width * 0.3, height, 0.042]} />
          </mesh>
          <mesh position={[width * 0.34, 0.15, 0.03]} material={getMaterial("aluminum")}>
            <boxGeometry args={[0.08, 0.16, 0.02]} />
          </mesh>
        </group>
      ) : (
        <mesh position={[center, height / 2, 0]} castShadow material={getMaterial("oak")}>
          <boxGeometry args={[width, height, 0.04]} />
        </mesh>
      )}
      <mesh position={[flip ? -width + 0.08 : width - 0.08, 1.05, 0.035]} material={getMaterial("steel")}>
        <boxGeometry args={[0.03, 0.12, 0.03]} />
      </mesh>
    </group>
  );
}

function SlidingDoor({ opening }: { opening: Opening }) {
  const width = opening.to - opening.from;
  const height = opening.y1 - opening.y0;
  const alongX = opening.axis === "x";
  const panel = width * 0.34;
  const cx = alongX ? opening.to - panel / 2 : opening.fixed;
  const cz = alongX ? opening.fixed : opening.to - panel / 2;
  const glass = getMaterial("glass");
  const frame = getMaterial("aluminum");
  return (
    <group>
      <mesh position={[cx, opening.y0 + height / 2, cz]} material={glass}>
        <boxGeometry args={[alongX ? panel : 0.02, height - 0.08, alongX ? 0.02 : panel]} />
      </mesh>
      <mesh
        position={[
          cx + (alongX ? 0 : opening.inX * 0.03),
          opening.y0 + height / 2,
          cz + (alongX ? opening.inZ * 0.03 : 0),
        ]}
        material={frame}
      >
        <boxGeometry args={[alongX ? panel : 0.025, height - 0.12, alongX ? 0.025 : panel]} />
      </mesh>
    </group>
  );
}

function WindowDressing({ opening }: { opening: Opening }) {
  const width = opening.to - opening.from;
  const height = opening.y1 - opening.y0;
  const alongX = opening.axis === "x";
  const cx = alongX ? (opening.from + opening.to) / 2 : opening.fixed;
  const cz = alongX ? opening.fixed : (opening.from + opening.to) / 2;
  const ox = opening.inX * (opening.wallThickness / 2 + 0.07);
  const oz = opening.inZ * (opening.wallThickness / 2 + 0.07);
  const glass = getMaterial("glass");
  const frame = getMaterial("aluminum");
  const y = opening.y0 + height / 2;
  return (
    <group>
      <mesh position={[cx, y, cz]} material={glass}>
        <boxGeometry args={[alongX ? width - 0.08 : 0.02, height - 0.08, alongX ? 0.02 : width - 0.08]} />
      </mesh>
      <mesh position={[cx, y, cz]} material={frame}>
        <boxGeometry args={[alongX ? 0.035 : 0.04, height - 0.1, alongX ? 0.04 : 0.035]} />
      </mesh>
      <mesh position={[cx, y, cz]} material={frame}>
        <boxGeometry args={[alongX ? width - 0.1 : 0.04, 0.035, alongX ? 0.04 : width - 0.1]} />
      </mesh>
      {opening.curtain && (
        <group position={[ox, 0, oz]}>
          <mesh position={[cx, y, cz]} material={getMaterial("sheer")}>
            <boxGeometry args={[alongX ? width * 0.92 : 0.01, height * 0.96, alongX ? 0.01 : width * 0.92]} />
          </mesh>
          {[ -1, 1 ].map((side) => {
            const shift = side * (width / 2 - 0.14);
            const px = cx + (alongX ? shift : opening.inX * 0.04);
            const pz = cz + (alongX ? opening.inZ * 0.04 : shift);
            return (
              <group key={side} position={[px, y, pz]}>
                <mesh material={getMaterial("curtain")}>
                  <boxGeometry args={[alongX ? 0.2 : 0.025, height * 0.98, alongX ? 0.025 : 0.2]} />
                </mesh>
                <mesh position={[0, -height * 0.05, 0]} material={getMaterial("tie")}>
                  <boxGeometry args={[alongX ? 0.22 : 0.04, 0.045, alongX ? 0.04 : 0.22]} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

export function Openings({ openings }: { openings: Opening[] }) {
  return (
    <group>
      {openings.map((opening) => (
        <group key={opening.id}>
          <Frame opening={opening} />
          {opening.kind === "door" && <SwingDoor opening={opening} />}
          {opening.kind === "sliding" && <SlidingDoor opening={opening} />}
          {opening.kind === "window" && <WindowDressing opening={opening} />}
        </group>
      ))}
    </group>
  );
}
