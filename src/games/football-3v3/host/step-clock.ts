import { STEP } from "../engine/tuning";

/**
 * Turns animation frame times into whole fixed steps of the match, the
 * way the engine wants them: leftover time carries to the next frame,
 * and after a stall only a few steps are made up, so the match slows
 * for a moment rather than jumping ahead.
 */
export class StepClock {
  private last: number | null = null;
  private carry = 0;

  constructor(private readonly maxSteps = 8) {}

  stepsFor(nowMs: number): number {
    if (this.last === null) {
      this.last = nowMs;
      return 0;
    }
    this.carry += Math.max(0, nowMs - this.last) / 1000;
    this.last = nowMs;
    const steps = Math.min(this.maxSteps, Math.floor(this.carry / STEP + 1e-6));
    this.carry = Math.min(this.carry - steps * STEP, STEP);
    return steps;
  }

  /** Forgets the time that passed, after a pause like a replay. */
  reset(): void {
    this.last = null;
    this.carry = 0;
  }
}
