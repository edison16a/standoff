import type { PlayerEvent } from "./player";
import { Run } from "./run";
import type { Level } from "./types";

/**
 * A computer player that jumps exactly on the level's perfect beats. It
 * plays behind the menus and in the showcase. `slip` makes it miss one
 * jump now and then, so the demo also shows a crash and a restart.
 */
export class Autoplay {
  run: Run;
  private next = 0;
  private readonly spb: number;

  constructor(
    readonly level: Level,
    private readonly skip: ReadonlySet<number> = new Set(),
  ) {
    this.run = new Run(level);
    this.spb = 60 / level.bpm;
  }

  /** Plays up to a level time. Returns what happened. */
  advanceTo(time: number, events: PlayerEvent[] = []): PlayerEvent[] {
    const solution = this.run.level.solution;
    while (this.next < solution.length && solution[this.next]! * this.spb <= time) {
      if (!this.skip.has(this.next)) this.run.press(solution[this.next]! * this.spb);
      this.next += 1;
    }
    return this.run.advanceTo(time, events);
  }

  /** Back to the start, for another go. */
  restart(): void {
    this.run = new Run(this.level);
    this.next = 0;
  }
}
