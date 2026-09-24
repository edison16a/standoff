/** Frames slower than this, on average, mean the machine is struggling. */
const SLOW_MS = 21;
/**
 * Frames at about this pace mean the screen's refresh is the limit, not
 * the drawing, so there may be room to sharpen the picture again.
 */
const FAST_MS = 18;
const STEP = 0.25;
const MIN_RATIO = 0.5;
/** How long a trend must last before the resolution changes, so one hiccup never does it. */
const SLOW_HOLD_S = 1.5;
const FAST_HOLD_S = 6;

/**
 * Keeps the booth smooth on whatever computer runs it. It watches frame
 * times and lowers the drawing resolution while frames run slow, then
 * raises it again once there is room. A laptop that can manage full
 * resolution at 60 frames a second keeps it.
 */
export class QualityGovernor {
  private average = 16.7;
  private slowFor = 0;
  private fastFor = 0;
  /** Grows each time a sharper picture proves too slow, so it stops trying to flip back and forth. */
  private fastHold = FAST_HOLD_S;
  private raised = false;
  ratio: number;

  constructor(private max: number) {
    this.ratio = max;
  }

  /** Feeds one frame's length. Returns true when the ratio changed. */
  frame(ms: number): boolean {
    if (ms <= 0) return false;
    // A hidden tab or a debugger pause makes one huge gap. Count it as one slow frame, no more.
    const clamped = Math.min(ms, 250);
    this.average += (clamped - this.average) * 0.08;
    const seconds = clamped / 1000;
    this.slowFor = this.average > SLOW_MS ? this.slowFor + seconds : 0;
    this.fastFor = this.average < FAST_MS ? this.fastFor + seconds : 0;
    if (this.slowFor > SLOW_HOLD_S && this.ratio > MIN_RATIO) {
      if (this.raised) this.fastHold *= 2;
      this.raised = false;
      return this.set(this.ratio - STEP);
    }
    if (this.fastFor > this.fastHold && this.ratio < this.max) {
      this.raised = true;
      return this.set(this.ratio + STEP);
    }
    return false;
  }

  /** The screen's own density changed, say the window moved to another monitor. */
  setMax(max: number): void {
    if (max === this.max) return;
    this.max = max;
    this.ratio = Math.min(this.ratio, max);
  }

  private set(ratio: number): true {
    this.ratio = Math.max(MIN_RATIO, Math.min(this.max, ratio));
    // Start measuring afresh at the new resolution, from a neutral guess.
    this.average = (SLOW_MS + FAST_MS) / 2;
    this.slowFor = 0;
    this.fastFor = 0;
    return true;
  }
}
