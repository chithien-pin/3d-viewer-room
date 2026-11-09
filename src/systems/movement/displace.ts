import { input } from "./input";
import { PLAYER, player } from "./player";

export interface Displacement {
  x: number;
  y: number;
  z: number;
}

/**
 * WASD tương đối với hướng camera. Click-to-move đi theo waypoint thế giới.
 * Phím hướng hủy đường đi đang dở.
 */
export function desiredDisplacement(dt: number): Displacement {
  const step = Math.min(dt, 0.05);
  let moveX = 0;
  let moveZ = 0;
  const stick = Math.hypot(input.stickStrafe, input.stickForward);
  const keyboard = input.forward || input.back || input.left || input.right || stick > 0.12;

  if (keyboard) {
    input.path = null;
    input.destination = null;
    const forwardX = -Math.sin(input.yaw);
    const forwardZ = -Math.cos(input.yaw);
    const rightX = Math.cos(input.yaw);
    const rightZ = -Math.sin(input.yaw);
    const ahead = (input.forward ? 1 : 0) - (input.back ? 1 : 0) + input.stickForward;
    const side = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.stickStrafe;
    moveX = forwardX * ahead + rightX * side;
    moveZ = forwardZ * ahead + rightZ * side;
  } else {
    const path = input.path;
    const waypoint = path?.[0];
    if (path && waypoint) {
      const dx = waypoint.x - player.x;
      const dz = waypoint.z - player.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.14) {
        path.shift();
        if (path.length === 0) {
          input.path = null;
          input.destination = null;
        }
      } else {
        moveX = dx / length;
        moveZ = dz / length;
      }
    }
  }

  const magnitude = Math.hypot(moveX, moveZ);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveZ /= magnitude;
  }
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const scale = magnitude > 0.001 ? speed * step : 0;
  return { x: moveX * scale, y: -1.6 * step, z: moveZ * scale };
}
