import { useEffect, useRef } from "react";
import { useLayoutStore } from "../store/useLayoutStore";
import { player } from "../systems/movement/player";
import type { ZoneRect } from "../types/model";

function fillFor(zone: ZoneRect): string {
  if (zone.kind === "outdoor") return "#7f949c";
  if (zone.floor === "wood_laminate") return "#c4b09a";
  if (zone.floor === "slate_dark") return "#5e676e";
  return "#e6e0d8";
}

export function Minimap({
  zones,
  bounds,
}: {
  zones: ZoneRect[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;

    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = 176;
      const height = 148;
      if (canvas.width !== Math.floor(width * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#2c2824";
      context.beginPath();
      context.roundRect(0, 0, width, height, 16);
      context.fill();

      const worldW = Math.max(0.1, bounds.maxX - bounds.minX);
      const worldD = Math.max(0.1, bounds.maxZ - bounds.minZ);
      const pad = 14;
      const scale = Math.min((width - pad * 2) / worldW, (height - pad * 2) / worldD);
      const originX = (width - worldW * scale) / 2;
      const originY = (height - worldD * scale) / 2;
      const toX = (x: number) => originX + (x - bounds.minX) * scale;
      const toY = (z: number) => originY + (z - bounds.minZ) * scale;

      for (const zone of zones) {
        context.fillStyle = fillFor(zone);
        context.fillRect(toX(zone.x), toY(zone.z), zone.w * scale, zone.d * scale);
      }
      context.strokeStyle = "rgba(255,255,255,0.45)";
      context.lineWidth = 1;
      for (const zone of zones) {
        context.strokeRect(toX(zone.x), toY(zone.z), zone.w * scale, zone.d * scale);
      }

      const px = toX(player.x);
      const py = toY(player.z);
      context.fillStyle = "rgba(91,58,41,0.9)";
      for (const item of useLayoutStore.getState().items) {
        context.fillRect(toX(item.position[0]) - 1.6, toY(item.position[1]) - 1.6, 3.2, 3.2);
      }

      context.strokeStyle = "#fff";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(px + Math.sin(player.rotY) * 11, py + Math.cos(player.rotY) * 11);
      context.stroke();
      context.fillStyle = "#e07a3d";
      context.beginPath();
      context.arc(px, py, 4.5, 0, Math.PI * 2);
      context.fill();

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [bounds, zones]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none h-[148px] w-[176px] rounded-2xl shadow-lg"
      aria-label="Bản đồ nhỏ"
    />
  );
}
