/**
 * Keeps an eye on how long the pose model takes per frame. The full model
 * is the most accurate, but on a slow laptop it can fall behind the
 * camera, and a late punch is worse than a slightly rougher skeleton. So
 * once it is clearly too slow the kit moves to the lite model.
 */

export interface PaceOptions {
  /** Longer than this per frame, on average, is too slow, in milliseconds. */
  budgetMs: number;
  /** Frames ignored at the start, while the GPU compiles its shaders. */
  warmupFrames: number;
  /** Frames averaged before deciding. */
  windowFrames: number;
}

export const DEFAULT_PACE: PaceOptions = { budgetMs: 55, warmupFrames: 15, windowFrames: 45 };

export class PaceGuard {
  private seen = 0;
  private total = 0;
  private counted = 0;
  private decided = false;
  private readonly options: PaceOptions;

  constructor(options: Partial<PaceOptions> = {}) {
    this.options = { ...DEFAULT_PACE, ...options };
  }

  /** Records one frame's inference time. True once, on the frame it decides the model is too slow. */
  record(ms: number): boolean {
    if (this.decided) return false;
    this.seen++;
    if (this.seen <= this.options.warmupFrames) return false;
    this.total += ms;
    this.counted++;
    if (this.counted < this.options.windowFrames) return false;
    const slow = this.total / this.counted > this.options.budgetMs;
    this.total = 0;
    this.counted = 0;
    if (slow) this.decided = true;
    return slow;
  }
}

/** Frames per second and the mean inference time over the last second, for the status line. */
export class RateMeter {
  private frames = 0;
  private busy = 0;
  private since: number | null = null;
  fps = 0;
  inferenceMs = 0;

  /** Returns true when a new second's figures are ready. */
  tick(now: number, ms: number): boolean {
    this.since ??= now;
    this.frames++;
    this.busy += ms;
    const elapsed = now - this.since;
    if (elapsed < 1000) return false;
    this.fps = (this.frames * 1000) / elapsed;
    this.inferenceMs = this.busy / this.frames;
    this.frames = 0;
    this.busy = 0;
    this.since = now;
    return true;
  }
}
