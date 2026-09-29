/**
 * Hold to confirm, the kit's standard for calibrating without a button.
 * The player points (or levels) and keeps still, a meter fills, and the
 * reading is taken on its own. No tap, so a tap can never nudge the phone
 * off the target at the last moment.
 */

/** Holding still for this long takes the reading. */
export const HOLD_MS = 900;
/** Wobbling drains the meter this fast, so a reading is only taken when truly steady. */
export const DRAIN_MS = 250;

/**
 * A meter that fills while a condition holds and drains when it breaks.
 * Time steps are capped, so a frame that stalls never fills it in one go.
 */
export class HoldProgress {
  private value = 0;
  private lastT: number | null = null;

  constructor(
    private readonly holdMs = HOLD_MS,
    private readonly drainMs = DRAIN_MS,
  ) {}

  /** Feeds one frame. Returns the meter from 0 to 1; at 1 the hold is done. */
  update(ok: boolean, t: number): number {
    const dt = this.lastT === null ? 0 : Math.min(100, Math.max(0, t - this.lastT));
    this.lastT = t;
    this.value = ok ? Math.min(1, this.value + dt / this.holdMs) : Math.max(0, this.value - dt / this.drainMs);
    return this.value;
  }

  get progress(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
    this.lastT = null;
  }
}

/** Readings closer than this over the window count as holding still. */
export const STILL_ANGLE = (2.5 * Math.PI) / 180;
const WINDOW_MS = 350;

/**
 * Tells whether a stream of readings has settled: every reading in the
 * last moment lies within a small angle of the newest one. Works on any
 * reading, given how far apart two of them are.
 */
export class SteadyWindow<T> {
  private history: { t: number; sample: T }[] = [];

  constructor(
    private readonly distance: (a: T, b: T) => number,
    private readonly limit = STILL_ANGLE,
    private readonly windowMs = WINDOW_MS,
  ) {}

  update(sample: T, t: number): boolean {
    this.history.push({ t, sample });
    // Keep one reading from before the window, so a phone that reads slowly still covers all of it.
    while (this.history.length > 2 && t - this.history[1]!.t >= this.windowMs) this.history.shift();
    const covered = t - this.history[0]!.t >= this.windowMs * 0.6;
    return covered && this.history.every((entry) => this.distance(entry.sample, sample) < this.limit);
  }

  reset(): void {
    this.history = [];
  }
}
