/**
 * Keeps the match at its frame rate on a weaker graphics card. It
 * watches how long frames really take; if the picture keeps missing the
 * target for a few seconds it steps down one level, waits to see the
 * effect, and steps down again if it must. It never steps back up, so
 * the picture never pumps between levels in the middle of a match.
 *
 * Level 0 is everything. Level 1 keeps every body in its light cut, even
 * in close ups. Level 2 draws at a lower resolution, and level 3 lower
 * still.
 */

/** Seconds of frames judged together, and seconds to wait after a change before judging again. */
const WINDOW = 3;
const SETTLE = 4;
/** A frame this long or longer is a stall (a tab switch, a build), not a sign of a slow card. */
const STALL = 0.25;

export const MAX_LEVEL = 3;

export class AutoQuality {
  level = 0;
  private sum = 0;
  private frames = 0;
  private wait = SETTLE;

  /** `fps` is the rate to hold: the screen's, or the player's cap when it is lower. */
  constructor(private readonly fps: () => number) {}

  /** Records one frame, `dt` seconds after the last. Returns true when the level just changed. */
  frame(dt: number): boolean {
    if (!(dt > 0) || dt >= STALL || this.level >= MAX_LEVEL) return false;
    if (this.wait > 0) {
      this.wait -= dt;
      return false;
    }
    this.sum += dt;
    this.frames++;
    if (this.sum < WINDOW) return false;
    const rate = this.frames / this.sum;
    this.sum = 0;
    this.frames = 0;
    // A fifth under the target, judged over the whole window, is a card that cannot keep up.
    if (rate >= this.fps() * 0.8) return false;
    this.level++;
    this.wait = SETTLE;
    return true;
  }

  /** The highest share of the screen's pixel density to draw at. */
  get pixelCap(): number {
    return [1.5, 1.5, 1, 0.8][this.level]!;
  }

  /** Whether close ups may use the fine cut of the bodies. */
  get fineBodies(): boolean {
    return this.level === 0;
  }
}
