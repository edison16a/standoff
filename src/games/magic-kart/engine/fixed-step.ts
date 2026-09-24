import { STEP } from "./tuning";

/** After a stall, like a hidden tab, skip ahead rather than fast forward. */
const MAX_STEPS = 6;

/**
 * Turns uneven animation frames into a steady count of fixed steps, so
 * the karts drive the same on a 60 Hz laptop and a 144 Hz monitor.
 */
export class FixedStepClock {
  private last: number | null = null;

  /** How many steps to run for this wall clock reading, in milliseconds. */
  stepsFor(nowMs: number): number {
    if (this.last === null) this.last = nowMs;
    const stepMs = STEP * 1000;
    let steps = Math.floor((nowMs - this.last) / stepMs);
    if (steps > MAX_STEPS) {
      this.last = nowMs - MAX_STEPS * stepMs;
      steps = MAX_STEPS;
    }
    this.last += steps * stepMs;
    return steps;
  }
}
