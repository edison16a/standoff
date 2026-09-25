import { STEP } from "./tuning";

/**
 * A slow frame is caught up in full, up to a quarter second. Past that,
 * as after a hidden tab, the match skips ahead rather than fast forward.
 */
const MAX_STEPS = 15;

/**
 * Turns uneven animation frames into a steady count of fixed steps, so
 * the match plays the same on a 60 Hz laptop and a 144 Hz monitor.
 */
export class FixedStepClock {
  private last: number | null = null;

  constructor(private readonly maxSteps = MAX_STEPS) {}

  /** How many steps to run for this wall clock reading, in milliseconds. */
  stepsFor(nowMs: number): number {
    if (this.last === null) this.last = nowMs;
    const stepMs = STEP * 1000;
    let steps = Math.floor((nowMs - this.last) / stepMs);
    if (steps > this.maxSteps) {
      this.last = nowMs - this.maxSteps * stepMs;
      steps = this.maxSteps;
    }
    this.last += steps * stepMs;
    return steps;
  }

  reset(): void {
    this.last = null;
  }
}
