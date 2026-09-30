import type { TrackId } from "../tracks";
import type { Framing, SweepKey } from "./sweep";

/** Where the camera sits for a shot. Distances are metres, fields of view degrees. */
export type Rig =
  /** Behind the pack, low, a little to one side. */
  | ({ kind: "chase" } & Framing)
  /**
   * Behind the pack like the chase, gliding from one framing to the next
   * at the race times of its keys, so one long take can swing wide
   * through a drift and climb as the gliders open.
   */
  | { kind: "sweep"; keys: readonly SweepKey[] }
  /**
   * Planted beside the road at a point on the lap, turning to follow the
   * pack and zooming like a television camera, so the pack fills about
   * `frame` metres of the picture however far off it is.
   */
  | { kind: "post"; at: number; d: number; height: number; frame: number }
  /**
   * Close on one kart from a corner, turning with it. Angle 0 is dead
   * ahead of it. The camera looks at a point `aim` metres above the kart,
   * so a low aim lifts the kart up the picture.
   */
  | {
      kind: "hero";
      kart: number;
      angle: number;
      dist: number;
      height: number;
      aim: number;
      fov: number;
      /** Radians a second the camera circles the kart, for a sweeping close up. */
      orbit?: number;
      /** Metres a second the camera moves out (or in, when negative). */
      push?: number;
      /** Measure the angle from the road instead of the kart's nose, so a spin does not whirl the camera. */
      road?: boolean;
    };

/**
 * A few seconds of one seeded race with four computer karts. The same
 * seed always plays out the same way, so each shot was picked by running
 * many seeds and keeping the liveliest moments: throws landing, the pack
 * in the air together and places changing hands.
 */
export interface Shot {
  map: TrackId;
  seed: number;
  /** Race seconds after the start signal where the shot begins. */
  from: number;
  /** Seconds on screen. */
  length: number;
  /** How fast the race runs on screen: 0.5 is half speed slow motion. */
  rate?: number;
  rig: Rig;
}

export interface Plan {
  shots: readonly Shot[];
  /** For a still: seconds into its one shot where time stops. */
  freeze?: number;
  /** For a loop: seconds of clock before the first shot starts, so a recording that warms up first begins on it. */
  lead?: number;
}

export function planLength(plan: Plan): number {
  return plan.shots.reduce((sum, shot) => sum + shot.length, 0);
}

/** A still starts playing this long before the moment it stops on, so sparks and the camera have settled. */
const STILL_LEAD = 1.2;

/**
 * Which shot is on, and how many race seconds into it, this long after
 * the showcase began. A slow motion shot runs the race slower than the
 * clock. A loop wraps round, so its end runs into its start.
 */
export function shotAt(plan: Plan, elapsed: number): { shot: Shot; time: number } {
  const first = plan.shots[0]!;
  if (plan.freeze !== undefined) return { shot: first, time: Math.min(plan.freeze, Math.max(0, plan.freeze - STILL_LEAD) + elapsed) };
  const length = planLength(plan);
  let phase = (((elapsed - (plan.lead ?? 0)) % length) + length) % length;
  for (const shot of plan.shots) {
    if (phase < shot.length - 1e-9) return { shot, time: phase * (shot.rate ?? 1) };
    phase -= shot.length;
  }
  return { shot: first, time: 0 };
}
