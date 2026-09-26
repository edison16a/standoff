/** The simulation always steps at 60 Hz, whatever the display refresh is. */
export const TICK_MS = 1000 / 60;
/** After a stall (a hidden tab) we skip ahead instead of fast forwarding. */
const MAX_STEPS_PER_ADVANCE = 5;

/**
 * Turns uneven animation frames into a steady count of fixed ticks. A
 * fixed step keeps the referee's timing identical on a 60 Hz laptop and a
 * 120 Hz display, and makes recorded replays line up frame for frame.
 */
export class FixedStepClock {
  private lastWall: number | null = null;

  /** How many ticks to run for this wall clock reading. */
  stepsFor(wallNow: number): number {
    if (this.lastWall === null) this.lastWall = wallNow;
    let steps = Math.floor((wallNow - this.lastWall) / TICK_MS);
    if (steps > MAX_STEPS_PER_ADVANCE) {
      this.lastWall = wallNow - MAX_STEPS_PER_ADVANCE * TICK_MS;
      steps = MAX_STEPS_PER_ADVANCE;
    }
    this.lastWall += steps * TICK_MS;
    return steps;
  }
}
