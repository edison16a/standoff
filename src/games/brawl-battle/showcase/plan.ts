/**
 * Where the camera sits for a shot. Distances are metres, angles radians,
 * fields of view degrees.
 */
export type Rig =
  /** The game's own fight camera, framing everyone still in play. */
  | { kind: "wide" }
  /** Planted, looking at a point on the stage. */
  | { kind: "fixed"; x: number; y: number; distance: number; yaw?: number; lift?: number; fov?: number }
  /**
   * Locked on one fighter, looking `dx` and `dy` metres off their feet.
   * It turns `orbit` radians a second round them and moves `push` metres
   * a second further off (in, when negative), so a close up can sweep.
   */
  | {
      kind: "follow";
      id: number;
      distance: number;
      dx?: number;
      dy?: number;
      yaw?: number;
      lift?: number;
      fov?: number;
      orbit?: number;
      push?: number;
    };

/** A stretch of one seeded match. The same seed always plays out the same fight. */
export interface Shot {
  seed: number;
  /** Match seconds where the shot begins. */
  from: number;
  /** Seconds on screen. */
  length: number;
  /** How fast the fight runs on screen: 0.5 is half speed slow motion. */
  rate?: number;
  rig: Rig;
}

export interface Plan {
  shots: readonly Shot[];
  /** For a still: seconds into its one shot where time stops. */
  freeze?: number;
  /** For a loop: seconds of clock before the first shot, so a recording that warms up first begins on it. */
  lead?: number;
}

/** A still is played in from this long before its frozen moment, so trails and sparks are there. */
const STILL_LEAD = 1.5;

export function planLength(plan: Plan): number {
  return plan.shots.reduce((sum, shot) => sum + shot.length, 0);
}

/**
 * Which shot is on, and how many match seconds into it, this long after
 * the showcase began. A loop wraps round, so its end runs into its start.
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
