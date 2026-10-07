import type { BallBody } from "../physics/air";
import { SUBSTEP } from "../physics/ball-spec";
import { stepBall, type Contact, type TouchHook } from "../physics/world";
import { startRide, stepRide, type RideSpec, type RideState } from "./rim-ride";

/**
 * A shot's flight, step by step: free physics through the air, the
 * glass, the iron and the net, except while an authored roll round the
 * ring has the ball. The live ball and the solver's look ahead both fly
 * through here in the same small steps, so a planned ending is the one
 * the court sees.
 */

export interface ShotFlight {
  /** The roll the preset asked for, taken at the first touch on top of the ring. */
  ride: RideSpec | null;
  riding: RideState | null;
  rode: boolean;
}

export function newFlight(ride: RideSpec | null): ShotFlight {
  return { ride, riding: null, rode: false };
}

export function copyFlight(f: ShotFlight): ShotFlight {
  return { ...f, riding: f.riding ? { ...f.riding } : null };
}

/** True while the authored roll has the ball, so nothing else should touch it. */
export function onTheRing(f: ShotFlight): boolean {
  return f.riding !== null;
}

/** Steps a shot `dt` seconds in the physics' own small steps. */
export function stepShotFlight(b: BallBody, f: ShotFlight, dt: number, out: Contact[], hook?: TouchHook): void {
  const steps = Math.max(1, Math.round(dt / SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    if (f.riding) {
      if (!stepRide(f.riding, b, h, out)) f.riding = null;
      continue;
    }
    const before = out.length;
    stepBall(b, h, out, hook);
    if (!f.ride || f.rode) continue;
    for (let k = before; k < out.length; k++) {
      if (out[k]!.kind !== "rim") continue;
      f.riding = startRide(f.ride, b);
      // One chance only: a touch from below or the side leaves the shot to the physics.
      f.rode = true;
      break;
    }
  }
}
