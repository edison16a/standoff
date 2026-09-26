import { median } from "./refresh-rate";

/** Recent refresh gaps kept to learn the screen's period. */
const HISTORY = 15;
/** Gaps longer than this are stalls or idle time, not a refresh. */
const MAX_PERIOD_MS = 50;

/**
 * Decides which screen refreshes run the game at a lower frame rate.
 *
 * Each game frame has an exact due time, one interval after the last due
 * time, so rounding never adds up to drift. A refresh runs a frame when
 * it is the refresh nearest that due time, which spreads uneven ratios
 * fairly: at 144 Hz held to 60 the gaps go 2, 3, 2, 3 refreshes and
 * average exactly 60.
 */
export class FramePacer {
  private interval: number;
  private due: number | null = null;
  private last: number | null = null;
  private gaps: number[] = [];
  private period: number;

  constructor(fps: number, refreshHz = 60) {
    this.interval = 1000 / fps;
    this.period = 1000 / refreshHz;
  }

  /** A new target rate. The next refresh starts the new rhythm. */
  setRate(fps: number): void {
    this.interval = 1000 / fps;
    this.due = null;
  }

  /** The screen's refresh period as learned so far, in milliseconds. */
  get refreshPeriod(): number {
    return this.period;
  }

  /** Called on every refresh while frames are wanted. True means run a frame now. */
  tick(now: number): boolean {
    this.learn(now);
    if (this.due === null) {
      this.due = now + this.interval;
      return true;
    }
    const late = now - this.due;
    // Half a refresh early still wins, since the next refresh would be later still.
    if (late < -this.period / 2) return false;
    // A whole frame behind means a stall or idle time. Start over from here
    // rather than rush frames out to catch up.
    this.due = late > this.interval ? now + this.interval : this.due + this.interval;
    return true;
  }

  private learn(now: number): void {
    const gap = this.last === null ? 0 : now - this.last;
    this.last = now;
    if (gap <= 0 || gap > MAX_PERIOD_MS) return;
    this.gaps.push(gap);
    if (this.gaps.length > HISTORY) this.gaps.shift();
    // The median shrugs off a dropped refresh that would double one gap.
    this.period = median(this.gaps);
  }
}
