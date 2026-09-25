import { Bot } from "../engine/bot";
import { POWER_SECONDS } from "../engine/powers";
import { Run } from "../engine/run";
import type { PowerKind } from "../engine/types";

export interface ShowOptions {
  /** Runs once on the fresh run, before the warmup. */
  setup?: (run: Run) => void;
  /**
   * Turns every power up laid on the course into this kind, or clears them
   * all with null. The seeds lay magnets early on, and a magnet pulls every
   * coin in from afar, which looks like coins taken before they are reached.
   */
  pickups?: PowerKind | null;
  /** Ends each power up this many seconds after it starts, so it shows for a short part of a clip. */
  powerSeconds?: number;
}

/**
 * A computer runner playing a seeded run, for the showcase. Time only
 * moves in fixed steps from the clock it is given, so a capture tool
 * stepping the clock frame by frame sees the same run every time.
 */
export class ShowRun {
  readonly run: Run;
  private readonly bot = new Bot({ flair: true });
  private simulated = 0;
  /** All the time handed in so far. Leftovers carry over, so frames shorter than a step still add up. */
  private given = 0;

  constructor(
    seed: number,
    warmupS: number,
    private readonly options: ShowOptions = {},
  ) {
    this.run = new Run(seed);
    options.setup?.(this.run);
    this.tidy();
    this.advance(warmupS);
    this.run.drain();
  }

  /** Plays on by `seconds`, and returns what happened. */
  advance(seconds: number) {
    this.given += seconds;
    const step = 1 / 60;
    while (this.simulated + step <= this.given + 1e-9) {
      this.bot.drive(this.run);
      this.run.update(step);
      this.tidy();
      this.simulated += step;
    }
    return this.run.drain();
  }

  /** Swaps new power ups on the course and cuts short the ones running, after every step. */
  private tidy(): void {
    const { pickups, powerSeconds } = this.options;
    const course = this.run.course;
    if (pickups === null) course.pickups.length = 0;
    else if (pickups) for (const p of course.pickups) p.kind = pickups;
    if (powerSeconds === undefined) return;
    const powers = this.run.powers;
    for (const kind of powers.active()) if (powers.remaining(kind) <= POWER_SECONDS[kind] - powerSeconds) powers.end(kind);
  }
}
