import type { Level } from "../engine/types";

/**
 * Plays one seat by itself on the level's perfect beats. It is a test
 * shortcut from the admin panel, so one person can try out a whole 1v1
 * race, or watch the finish, without jumping through the level.
 */
export class Pilot {
  private next = 0;
  private last = -Infinity;
  private readonly beats: readonly number[];

  constructor(level: Level) {
    const spb = 60 / level.bpm;
    this.beats = level.solution.map((beat) => beat * spb);
  }

  /**
   * The level times to press at, for a run whose clock reads `levelTime`
   * and whose avatar stands at `runTime`. Call it once a frame before the
   * run moves on, so every press lands ahead of the avatar, never behind.
   */
  due(levelTime: number, runTime: number): number[] {
    // A crash or a step out moves the clock back, so the plan starts again from where the avatar is.
    if (levelTime < this.last - 1e-9) this.next = this.firstFrom(runTime);
    this.last = levelTime;
    const out: number[] = [];
    while (this.next < this.beats.length && this.beats[this.next]! <= levelTime + 1e-9) {
      const at = this.beats[this.next]!;
      // While the avatar waits for its start it cannot jump, and the beats before it are behind it anyway.
      if (at >= runTime - 1e-6) out.push(at);
      this.next += 1;
    }
    return out;
  }

  private firstFrom(time: number): number {
    const index = this.beats.findIndex((at) => at >= time - 1e-6);
    return index < 0 ? this.beats.length : index;
  }
}
