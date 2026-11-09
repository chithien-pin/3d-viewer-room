import { useEffect, useRef, useState } from "react";
import { input } from "../systems/movement/input";

const RADIUS = 46;

export function Joystick() {
  const [shown, setShown] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 800px)");
    const apply = () => setShown(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const release = () => {
    active.current = false;
    input.stickForward = 0;
    input.stickStrafe = 0;
    setKnob({ x: 0, y: 0 });
  };

  const move = (clientX: number, clientY: number, bounds: DOMRect) => {
    const dx = clientX - (bounds.left + bounds.width / 2);
    const dy = clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(dx, dy);
    const scale = length > RADIUS ? RADIUS / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    input.stickStrafe = Math.max(-1, Math.min(1, x / RADIUS));
    input.stickForward = Math.max(-1, Math.min(1, -y / RADIUS));
  };

  if (!shown) return null;

  return (
    <div
      className="absolute bottom-6 left-4 z-20 h-28 w-28 touch-none rounded-full border border-white/30 bg-[#2c2824]/55 shadow-lg"
      aria-label="Cần điều khiển"
      onPointerDown={(event) => {
        active.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onPointerMove={(event) => {
        if (!active.current) return;
        move(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4efe6] shadow"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
