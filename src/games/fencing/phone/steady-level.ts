import { rotate, vec, type Quat } from "@/games/kit/motion/math3d";

/** Within this of flat, the phone counts as level. */
export const LEVEL_TOLERANCE = (7 * Math.PI) / 180;
/** Turning less than this over the steadiness window counts as holding still. */
const STILL_ANGLE = (2.2 * Math.PI) / 180;
const WINDOW_MS = 350;
/** Holding level and still for this long captures the guard. */
export const HOLD_MS = 900;

export interface LevelReading {
  /** Top edge's rise and right edge's rise, radians. */
  pitch: number;
  roll: number;
  level: boolean;
  steady: boolean;
  /** 0 to 1: how far through the hold the player is. */
  progress: number;
}

/**
 * Watches the phone settle into its guard. The player tilts until the
 * bubble is in the middle and holds still, and the guard is captured on
 * its own once they have held it for a moment. No tapping, so the tap
 * itself can never nudge the guard off. Any wobble lets the progress
 * drain away again, so a guard is only taken when it is truly steady.
 */
export class SteadyLevel {
  private history: { t: number; q: Quat }[] = [];
  private progress = 0;
  private lastT: number | null = null;

  update(q: Quat, t: number): LevelReading {
    const dt = this.lastT === null ? 0 : Math.min(100, Math.max(0, t - this.lastT));
    this.lastT = t;
    this.history.push({ t, q });
    while (this.history.length > 2 && t - this.history[0]!.t > WINDOW_MS) this.history.shift();

    const top = rotate(q, vec(0, 1, 0));
    const right = rotate(q, vec(1, 0, 0));
    const pitch = Math.asin(Math.max(-1, Math.min(1, top.z)));
    const roll = Math.asin(Math.max(-1, Math.min(1, right.z)));
    const level = Math.hypot(pitch, roll) < LEVEL_TOLERANCE;
    const covered = t - this.history[0]!.t >= WINDOW_MS * 0.6;
    const steady = covered && this.history.every((entry) => angleBetween(entry.q, q) < STILL_ANGLE);

    if (level && steady) this.progress = Math.min(1, this.progress + dt / HOLD_MS);
    else this.progress = Math.max(0, this.progress - dt / 250);
    return { pitch, roll, level, steady, progress: this.progress };
  }

  reset(): void {
    this.history = [];
    this.progress = 0;
    this.lastT = null;
  }
}

/** The rotation angle between two orientations, radians. */
export function angleBetween(a: Quat, b: Quat): number {
  const d = Math.abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z);
  return 2 * Math.acos(Math.min(1, d));
}
