import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import { input, subscribeInput } from "../systems/movement/input";
import type { ZoneRect } from "../types/model";

function Label({ zone }: { zone: ZoneRect }) {
  return (
    <Html
      position={[zone.x + zone.w / 2, 2.35, zone.z + zone.d / 2]}
      center
      sprite
      distanceFactor={11}
      style={{ pointerEvents: "none" }}
      zIndexRange={[8, 0]}
    >
      <div className="whitespace-nowrap rounded-full bg-[#2c2824]/75 px-2.5 py-1 text-[12px] font-semibold text-[#f4efe6] shadow-md">
        {zone.name}
      </div>
    </Html>
  );
}

export function RoomLabels({ zones }: { zones: ZoneRect[] }) {
  const [visible, setVisible] = useState(input.showLabels && input.view !== "first");

  useEffect(() => subscribeInput(() => setVisible(input.showLabels && input.view !== "first")), []);

  if (!visible) return null;
  return (
    <group>
      {zones.map((zone) => (
        <Label key={zone.id} zone={zone} />
      ))}
    </group>
  );
}
