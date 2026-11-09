export const PLAYER = {
  radius: 0.22,
  halfHeight: 0.36,
  standY: 0.58,
  walkSpeed: 2.05,
  runSpeed: 4.15,
} as const;

/** Vị trí runtime, không đưa vào store undo. Cập nhật mỗi frame. */
export const player: {
  x: number;
  y: number;
  z: number;
  rotY: number;
  moving: boolean;
  running: boolean;
  phase: number;
} = {
  x: 1.8,
  y: PLAYER.standY,
  z: 3.4,
  rotY: 0,
  moving: false,
  running: false,
  phase: 0,
};

export function placePlayer(x: number, z: number, rotY: number): void {
  player.x = x;
  player.y = PLAYER.standY;
  player.z = z;
  player.rotY = rotY;
  player.moving = false;
  player.running = false;
}

export function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}
