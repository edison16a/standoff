import { CHASE } from "./tuning";

/**
 * The guard and his dog. They chase the runner off at the start, drop
 * back, then close in again after a stumble. Stumble twice while they
 * are close and they catch you.
 */
export class Chase {
  /** How far behind the runner they are, in metres. */
  gap: number = CHASE.startGap;
  private lastStumble = -Infinity;
  private time = 0;

  /** True while they are close enough to be on screen. */
  get close(): boolean {
    return this.gap < 8;
  }

  update(dt: number, time: number, caught: boolean): void {
    this.time = time;
    let target: number;
    if (caught) target = 0.9;
    else if (time < CHASE.startS || time - this.lastStumble < CHASE.memoryS) target = time < CHASE.startS ? CHASE.startGap : CHASE.closeGap;
    else target = CHASE.farGap;
    // They close in fast and fall back slowly, so a stumble feels like a scare.
    const rate = target < this.gap ? 9 : 3.2;
    const step = rate * dt;
    this.gap += Math.max(-step, Math.min(step, target - this.gap));
  }

  /** A stumble. Returns true when it was the second one in a row, and they catch the runner. */
  stumble(time: number): boolean {
    // Scraping along a ramp and on into its train is one stumble, and a camera player needs a moment to step back.
    if (time - this.lastStumble < CHASE.graceS) return false;
    const caught = time - this.lastStumble < CHASE.memoryS;
    this.lastStumble = time;
    return caught;
  }

  /** A hoverboard took the blame: the slate is wiped. */
  forgive(): void {
    this.lastStumble = this.time - CHASE.memoryS * 0.5;
  }
}
