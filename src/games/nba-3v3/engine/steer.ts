import { BODY } from "./body/body-spec";
import type { Athlete } from "./types";

/** A turn sharper than this at speed is a plant and cut rather than a curve. */
const CUT_ANGLE = 1.2;
const CUT_SPEED = 2.6;
/** How long the planted foot shows in the legs. */
export const PLANT_TIME = 0.2;

export interface SteerResult {
  /** The runner planted a foot to cut this step. */
  planted: boolean;
}

/** What the legs have to work with this step. */
export interface Legs {
  /** Push power per kilogram, in watts. */
  power: number;
  /** Share of the shoes' full grip that can be used: less with the ball, less while off balance. */
  grip: number;
  /** Braking strength over the plain grip: both feet planted in a jump stop brake harder. */
  brake: number;
}

/**
 * Moves the velocity toward the speed the stick asks for, the way legs
 * on a hardwood floor can. Every push, brake and turn goes through the
 * shoes, so together they can never pass the grip of about one g: the
 * friction circle. Speeding up is limited by grip from a standstill and
 * by leg power once moving (force is power over speed), so the first
 * steps are explosive and top speed comes over most of a second.
 * Turning at speed is limited by the same grip, so a sprinter curves
 * wide, and a turn too sharp for that plants the outside foot and
 * bleeds speed before coming round.
 */
export function steer(a: Athlete, tx: number, tz: number, dt: number, legs: Legs): SteerResult {
  const speed = Math.hypot(a.vx, a.vz);
  const dvx = tx - a.vx;
  const dvz = tz - a.vz;
  const dl = Math.hypot(dvx, dvz);
  if (dl < 1e-6 || dt <= 0) return { planted: false };
  const g = BODY.gravity;
  const grip = BODY.traction * legs.grip * g;
  const push = Math.min(grip, legs.power / Math.max(speed, 0.5));
  if (speed < 0.25) {
    // From a standstill every direction is a fresh push.
    const k = Math.min(dl, push * dt) / dl;
    a.vx += dvx * k;
    a.vz += dvz * k;
    return { planted: false };
  }
  const ux = a.vx / speed;
  const uz = a.vz / speed;
  const want = Math.hypot(tx, tz);
  const turn = want > 0.5 ? Math.acos(Math.max(-1, Math.min(1, (tx * ux + tz * uz) / want))) : 0;
  const planted = turn > CUT_ANGLE && speed > CUT_SPEED;
  if (planted) a.plant = PLANT_TIME;
  const limit = (a.plant > 0 ? BODY.plantTraction : BODY.traction) * legs.grip * g * legs.brake;
  const along = dvx * ux + dvz * uz;
  const across = -dvx * uz + dvz * ux;
  let aAlong = along > 0 ? Math.min(along / dt, push) : Math.max(along / dt, -limit);
  let aAcross = Math.max(-limit, Math.min(limit, across / dt));
  // The friction circle: the grip is shared between the turn and the push or the brake.
  const total = Math.hypot(aAlong, aAcross);
  if (total > limit) {
    aAlong *= limit / total;
    aAcross *= limit / total;
  }
  a.vx += (ux * aAlong - uz * aAcross) * dt;
  a.vz += (uz * aAlong + ux * aAcross) * dt;
  return { planted };
}
