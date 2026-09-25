import { MOVE } from "./tuning";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/** A turn sharper than this at speed is a plant and cut rather than a curve. */
const CUT_ANGLE = 1.2;
const CUT_SPEED = 2.6;

export interface SteerResult {
  /** The runner planted a foot to cut this step. */
  planted: boolean;
}

/**
 * Pushes on toward the speed the stick asks for with momentum. From a
 * standstill the first steps are explosive, then the push fades as top
 * speed nears, so full speed takes about half a second. Slowing and
 * turning use the grip of the shoes, split into the part along the run
 * and the part across it, so a sprinter curves rather than snapping
 * round, and a hard cut plants the outside foot and bleeds speed first.
 * `push` scales the push (lower with the ball), `stop` the braking.
 */
export function steer(a: Athlete, tx: number, tz: number, top: number, dt: number, push = 1, stop = 1): SteerResult {
  const speed = Math.hypot(a.vx, a.vz);
  const want = Math.hypot(tx, tz);
  const dvx = tx - a.vx;
  const dvz = tz - a.vz;
  if (Math.hypot(dvx, dvz) < 1e-6) return { planted: false };
  // Pushing gets weaker the closer the runner is to top speed.
  const drive = MOVE.burst * push * Math.max(0.2, 1 - (MOVE.fade * speed) / Math.max(1, top));
  if (speed < 0.25) {
    // From a standstill every direction is a fresh push.
    const k = Math.min(1, (drive * dt) / Math.hypot(dvx, dvz));
    a.vx += dvx * k;
    a.vz += dvz * k;
    return { planted: false };
  }
  const ux = a.vx / speed;
  const uz = a.vz / speed;
  const along = dvx * ux + dvz * uz;
  const across = -dvx * uz + dvz * ux;
  const turn = want > 0.5 ? Math.acos(clamp((tx * ux + tz * uz) / want, -1, 1)) : 0;
  const planted = turn > CUT_ANGLE && speed > CUT_SPEED;
  if (planted) a.plant = MOVE.plantTime;
  const grip = a.plant > 0 ? MOVE.plantGrip : MOVE.grip;
  // Speeding up is the push; slowing down is the brakes, harder still with a foot planted.
  const alongLimit = (along > 0 ? drive : Math.max(MOVE.brake, grip) * stop) * dt;
  const acrossLimit = grip * stop * dt;
  const da = clamp(along, -alongLimit, alongLimit);
  const dc = clamp(across, -acrossLimit, acrossLimit);
  a.vx += ux * da - uz * dc;
  a.vz += uz * da + ux * dc;
  return { planted };
}
