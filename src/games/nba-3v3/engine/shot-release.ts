import { aimThrough, aimTimed, backspin } from "./physics/aim";
import { bankSpot } from "./physics/bank";
import type { Rng } from "./rng";
import type { Family } from "./shot-calibration";
import { drawError, spreadFor } from "./shot-error";
import { RIM } from "./tuning";
import type { V3 } from "./vec";

/**
 * Turns a shot into a real launch: where the shooter aims, the error
 * the hand puts on it, and the velocity and spin that carry the ball
 * there through the air. From then on the physics decides.
 */

export interface ReleaseInput {
  family: Family;
  from: V3;
  /** How high the arc peaks. */
  apex: number;
  /** Backspin in radians a second: a jumper about two and a half turns, a layup a little. */
  spinRate: number;
}

export interface Launch {
  vel: V3;
  spin: V3;
  /** The family it was actually thrown as: a bank with no angle to bank from goes straight at the ring. */
  family: Family;
}

/** Shooters aim a touch past the middle of the ring, where backspin helps a ball on the back iron drop. */
const AIM_LONG: Record<Family, number> = { jumper: 0.04, free: 0.04, floater: 0.02, layup: 0, bank: 0, bankJumper: 0, dunk: 0 };
/** A dunk is pushed down through the ring this fast, in seconds from the hand to the rim plane. */
const SLAM = 0.07;
const RIM_CENTRE: V3 = { x: RIM.x, y: RIM.y, z: RIM.z };

/** The last bank spot worked out, since a forced shot or a test asks for the same one many times over. */
let lastSpot: { key: string; spot: V3 | null } | null = null;

function cachedSpot(from: V3, apex: number, spin: V3): V3 | null {
  const key = [from.x, from.y, from.z, apex, spin.x, spin.y, spin.z].join();
  if (lastSpot?.key !== key) lastSpot = { key, spot: bankSpot(from, apex, spin) };
  return lastSpot.spot;
}

/** The launch for a release off by `long` metres past the aim and `side` metres to the shooter's right. */
export function launchFor(input: ReleaseInput, long: number, side: number): Launch {
  const { from, apex, spinRate } = input;
  const spin = backspin(from, RIM_CENTRE, spinRate);
  const dx = RIM.x - from.x;
  const dz = RIM.z - from.z;
  const d = Math.hypot(dx, dz);
  const ux = d > 0.05 ? dx / d : 0;
  const uz = d > 0.05 ? dz / d : -1;
  const family = input.family;
  if (family === "bank" || family === "bankJumper") {
    const spot = cachedSpot(from, apex, spin);
    if (spot) {
      // On the glass, long is up the board and side is along it.
      const target = { x: spot.x + side, y: spot.y + long * 0.8, z: spot.z };
      return { vel: aimThrough(from, target, apex, spin, "z"), spin, family };
    }
  }
  const straight: Family = family === "bank" ? "layup" : family === "bankJumper" ? "jumper" : family;
  const along = AIM_LONG[straight] + long;
  const target = { x: RIM.x + ux * along - uz * side, y: RIM.y, z: RIM.z + uz * along + ux * side };
  if (straight === "dunk") return { vel: aimTimed(from, target, SLAM, spin), spin, family: straight };
  return { vel: aimThrough(from, target, apex, spin), spin, family: straight };
}

/** Plans a real shot: the spread from the chance it should go in, an error drawn from it, and the launch. */
export function planRelease(rng: Rng, input: ReleaseInput, chance: number, distance: number): Launch {
  const spread = spreadFor(input.family, chance, distance);
  const err = drawError(rng, spread);
  return launchFor(input, err.long, err.side);
}
