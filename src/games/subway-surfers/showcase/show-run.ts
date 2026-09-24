import { Bot } from "../engine/bot";
import { Run } from "../engine/run";

/**
 * A computer runner playing a seeded run, for the showcase. Time only
 * moves in fixed steps from the clock it is given, so a capture tool
 * stepping the clock frame by frame sees the same run every time.
 */
export class ShowRun {
  readonly run: Run;
  private readonly bot = new Bot(true);
  private simulated = 0;

  constructor(seed: number, warmupS: number, setup?: (run: Run) => void) {
    this.run = new Run(seed);
    setup?.(this.run);
    this.advance(warmupS);
    this.run.drain();
  }

  /** Plays on by `seconds`, and returns what happened. */
  advance(seconds: number) {
    const target = this.simulated + seconds;
    const step = 1 / 60;
    while (this.simulated + step <= target + 1e-9) {
      this.bot.drive(this.run);
      this.run.update(step);
      this.simulated += step;
    }
    return this.run.drain();
  }
}
