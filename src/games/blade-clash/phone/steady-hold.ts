import type { Quat } from "@/games/kit/motion/math3d";

/** Turning less than this over the steadiness window counts as holding still. */
const STILL_ANGLE = (2.5 * Math.PI) / 180;
const WINDOW_MS = 350;
/** Holding still for this long takes the reading. */
export const HOLD_MS = 800;
/** Wobbling drains the progress this fast, so a reading is only taken when truly steady. */
const DRAIN_MS = 250;

export interface HoldReading {
  steady: boolean;
  /** 0 to 1: how far through the hold the player is. */
  progress: number;
}

/**
 * Watches the phone settle on a calibration target. The player points and
 * holds still, and the reading is taken on its own once they have held it
 * for a moment. No tapping, so a tap can never nudge the aim off.
 */
export class SteadyHold {
  private history: { t: number; q: Quat }[] = [];
  private progress = 0;
  private lastT: number | null = null;

  update(q: Quat, t: number): HoldReading {
    const dt = this.lastT === null ? 0 : Math.min(100, Math.max(0, t - this.lastT));
    this.lastT = t;
    this.history.push({ t, q });
    // Keep one reading from before the window, so a phone that reads slowly still covers all of it.
    while (this.history.length > 2 && t - this.history[1]!.t >= WINDOW_MS) this.history.shift();
    const covered = t - this.history[0]!.t >= WINDOW_MS * 0.6;
    const steady = covered && this.history.every((entry) => angleBetween(entry.q, q) < STILL_ANGLE);
    this.progress = steady ? Math.min(1, this.progress + dt / HOLD_MS) : Math.max(0, this.progress - dt / DRAIN_MS);
    return { steady, progress: this.progress };
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
