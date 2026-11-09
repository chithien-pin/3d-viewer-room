import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { input, orbitBy, subscribeInput } from "../systems/movement/input";

export function OrbitKnob() {
  const [yaw, setYaw] = useState(input.yaw);
  const [visible, setVisible] = useState(input.view !== "first");
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setYaw((current) => (Math.abs(current - input.yaw) > 0.002 ? input.yaw : current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => subscribeInput(() => setVisible(input.view !== "first")), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    last.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    last.current = { x: event.clientX, y: event.clientY };
    orbitBy(dx, dy, 3.6);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  if (!visible) return null;

  return (
    <div className="absolute bottom-16 right-3 z-20 sm:bottom-[4.5rem] sm:right-5">
      <div
        role="slider"
        aria-label="Nắm xoay góc nhìn"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round((((-yaw * 180) / Math.PI) % 360 + 360) % 360)}
        className="relative h-[92px] w-[92px] cursor-grab touch-none select-none rounded-full border border-[#f4efe6]/45 bg-[#2c2824]/80 shadow-lg active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="pointer-events-none absolute inset-[14px] rounded-full border border-dashed border-[#f4efe6]/30" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 rounded-full border-2 border-[#2c2824] bg-[#f4efe6] shadow"
          style={{ transform: `translate(-50%, -50%) rotate(${-yaw}rad) translateY(-32px)` }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold tracking-wide text-[#f4efe6]">
          Xoay
        </div>
      </div>
    </div>
  );
}
