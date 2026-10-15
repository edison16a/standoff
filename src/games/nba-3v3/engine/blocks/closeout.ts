import type { Athlete } from "../types";

/** How much of his run a closeout keeps into the leap: the last steps are chopped to brake. */
export const CLOSEOUT_CARRY = 0.6;
/** He flies by this far to the side of the shooter, never through him. */
export const PASS_BY = 0.75;

/**
 * Sets a closeout's flight as he leaves the floor. He brakes, keeping
 * only part of his run, and the run is turned so its line passes the
 * shooter at a shoulder's width on the side he is already on: the leap
 * carries him by the shooter with his hand up, the way a real closeout
 * flies past, instead of crashing through him.
 */
export function closeoutLeap(a: Athlete, shooter: Pick<Athlete, "x" | "z"> | null): void {
  a.vx *= CLOSEOUT_CARRY;
  a.vz *= CLOSEOUT_CARRY;
  const speed = Math.hypot(a.vx, a.vz);
  if (!shooter || speed < 0.3) return;
  const ux = a.vx / speed;
  const uz = a.vz / speed;
  const rx = shooter.x - a.x;
  const rz = shooter.z - a.z;
  // Already past him, or his line already clears him: nothing to turn.
  if (rx * ux + rz * uz <= 0) return;
  const side = rx * -uz + rz * ux;
  if (Math.abs(side) >= PASS_BY) return;
  // The point beside the shooter on the far side of the line from him, and the run turned at it.
  const s = side >= 0 ? -1 : 1;
  const ax = shooter.x + -uz * s * PASS_BY - a.x;
  const az = shooter.z + ux * s * PASS_BY - a.z;
  const l = Math.hypot(ax, az) || 1;
  a.vx = (ax / l) * speed;
  a.vz = (az / l) * speed;
}
