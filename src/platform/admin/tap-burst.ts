/** Longest pause between taps that still counts as one quick burst. */
export const TAP_GAP_MS = 450;

/** Taps in a burst that open the admin panel. */
export const ADMIN_TAPS = 3;

/**
 * Counts quick taps in a row on one button. A pause longer than the gap
 * starts a new burst, and reaching the target starts over, so a fourth
 * quick tap counts as the first of the next burst.
 */
export class TapBurst {
  private count = 0;
  private last = -Infinity;

  constructor(
    private readonly target = ADMIN_TAPS,
    private readonly gapMs = TAP_GAP_MS,
  ) {}

  /** Records a tap at now, in milliseconds. True when it completes a burst. */
  tap(now: number): boolean {
    this.count = now - this.last <= this.gapMs ? this.count + 1 : 1;
    this.last = now;
    if (this.count < this.target) return false;
    this.count = 0;
    this.last = -Infinity;
    return true;
  }
}
