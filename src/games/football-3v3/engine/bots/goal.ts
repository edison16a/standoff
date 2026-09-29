import type { Athlete } from "../types";
import type { V2 } from "../vec";

/** Heads for a spot at full stick, easing off inside `ease` metres so the bot settles instead of circling. */
export function headFor(a: Athlete, spot: V2, ease = 1.2): void {
  const dx = spot.x - a.x;
  const dz = spot.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.15) {
    a.bot.goal = { x: 0, z: 0 };
    return;
  }
  const k = Math.min(1, d / ease) / d;
  a.bot.goal = { x: dx * k, z: dz * k };
}

/** Runs a direction at full stick. */
export function runDir(a: Athlete, dir: V2): void {
  const l = Math.hypot(dir.x, dir.z);
  a.bot.goal = l < 1e-6 ? { x: 0, z: 0 } : { x: dir.x / l, z: dir.z / l };
}

/** Where a runner will be `t` seconds from now if they keep going. */
export const ahead = (a: Athlete, t: number): V2 => ({ x: a.x + a.vx * t, z: a.z + a.vz * t });
