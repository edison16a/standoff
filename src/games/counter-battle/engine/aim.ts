import type { V3 } from "./vec";

export interface Aim {
  yaw: number;
  pitch: number;
}

/** Aim angles with the pitch kept short of straight up or down. */
export const clampAim = (yaw: number, pitch: number): Aim => ({ yaw, pitch: Math.max(-1.2, Math.min(1.2, pitch)) });

/** The world yaw and pitch that look from `eye` at `point`. */
export function anglesTo(eye: V3, point: V3): Aim {
  const dx = point.x - eye.x;
  const dz = point.z - eye.z;
  return clampAim(Math.atan2(dx, dz), Math.atan2(point.y - eye.y, Math.hypot(dx, dz)));
}
