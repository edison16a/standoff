import { topSpeed } from "./body";
import type { Match } from "./match";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/** How far behind the receiver a defender on Guard trails. */
export const TAIL = 1.4;

/** The spot just behind a receiver, along the way they are running. */
export function tailSpot(r: Athlete): V2 {
  const speed = Math.hypot(r.vx, r.vz);
  const dir = speed > 0.5 ? { x: r.vx / speed, z: r.vz / speed } : { x: Math.sin(r.yaw), z: Math.cos(r.yaw) };
  return { x: r.x - dir.x * TAIL, z: r.z - dir.z * TAIL };
}

/**
 * Guard steers for the player: match the receiver's run and close on the
 * spot behind them. Trailing like this never puts the defender in front
 * of the ball, which is why Guard cannot intercept.
 */
export function guardMove(m: Match, a: Athlete, target: number): V2 {
  const r = m.athlete(target);
  if (!r) return { x: 0, z: 0 };
  const spot = tailSpot(r);
  const want = { x: r.vx + (spot.x - a.x) * 2.2, z: r.vz + (spot.z - a.z) * 2.2 };
  const top = topSpeed(a, false);
  const l = Math.hypot(want.x, want.z) / top;
  return l > 1 ? { x: want.x / top / l, z: want.z / top / l } : { x: want.x / top, z: want.z / top };
}
