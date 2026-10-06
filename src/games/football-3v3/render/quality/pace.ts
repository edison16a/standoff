/** Frames kept for the judgement: about a second and a half at 60 a second. */
const WINDOW = 90;
/** Intervals longer than this are a hidden tab or a page still loading, not drawing. */
const IGNORE_MS = 100;

/**
 * Tells, without the card's own timer, whether frames are missing their
 * slot on the screen. The quickest intervals seen are the screen's
 * refresh (or the frame rate cap); when the typical interval runs well
 * over that, frames are being dropped. A cap of 30 a second reads as
 * steady, since every interval is then the same.
 */
export class PaceWatch {
  private readonly gaps: number[] = [];
  private last = -1;

  /** Takes a frame's time stamp; returns true when the last stretch of frames ran slow. */
  tick(nowMs: number): boolean {
    const gap = this.last < 0 ? 0 : nowMs - this.last;
    this.last = nowMs;
    if (gap <= 0 || gap > IGNORE_MS) return false;
    this.gaps.push(gap);
    if (this.gaps.length < WINDOW) return false;
    const slow = missing(this.gaps);
    this.gaps.length = 0;
    return slow;
  }
}

/** Whether the typical gap is well over the quickest, which is the screen's own pace. */
export function missing(gaps: readonly number[]): boolean {
  const sorted = [...gaps].sort((a, b) => a - b);
  const best = sorted[Math.floor(sorted.length * 0.1)]!;
  const typical = sorted[Math.floor(sorted.length * 0.5)]!;
  return typical > best * 1.3 + 1;
}
