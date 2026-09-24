import { COURT, RIM } from "./tuning";
import { clamp, type V2 } from "./vec";

/** Where the arc's straight corner lines meet the curve, measured out from the baseline. */
export const CORNER_Z = RIM.z + Math.sqrt(COURT.arcRadius ** 2 - COURT.cornerX ** 2);

export const RIM_SPOT: V2 = { x: RIM.x, z: RIM.z };

/** Horizontal distance from the middle of the rim. */
export function rimDistance(p: V2): number {
  return Math.hypot(p.x - RIM.x, p.z - RIM.z);
}

/** Whether a shot from here is worth three: beyond the arc, or past the corner lines. */
export function isThree(p: V2): boolean {
  if (p.z < CORNER_Z) return Math.abs(p.x) > COURT.cornerX;
  return rimDistance(p) > COURT.arcRadius;
}

/** Whether a player with the ball here has taken it back past the arc. */
export function beyondArc(p: V2, margin = 0.15): boolean {
  if (p.z < CORNER_Z) return Math.abs(p.x) > COURT.cornerX + margin;
  return rimDistance(p) > COURT.arcRadius + margin;
}

/** Keeps a player on the floor. The baseline and sidelines are walls; the top is open a little. */
export function clampToCourt(p: V2, radius: number): V2 {
  return {
    x: clamp(p.x, -COURT.halfWidth + radius, COURT.halfWidth - radius),
    z: clamp(p.z, 0.2 + radius, COURT.depth + 1.2),
  };
}

/** Whether a ball on or near the floor has left the court. */
export function outOfBounds(p: V2): boolean {
  return Math.abs(p.x) > COURT.halfWidth + 0.2 || p.z < -0.2 || p.z > COURT.depth + 1.8;
}

/** The nearest spot just past the arc, for taking the ball back. */
export function nearestBeyondArc(p: V2, extra = 0.9): V2 {
  const dx = p.x - RIM.x;
  const dz = Math.max(0.6, p.z - RIM.z);
  const d = Math.hypot(dx, dz) || 1;
  const r = COURT.arcRadius + extra;
  const spot = { x: RIM.x + (dx / d) * r, z: RIM.z + (dz / d) * r };
  if (spot.z < CORNER_Z) return { x: Math.sign(dx || 1) * Math.min(COURT.halfWidth - 0.5, COURT.cornerX + extra * 0.5), z: Math.max(0.9, p.z) };
  return clampToCourt(spot, 0.5);
}
