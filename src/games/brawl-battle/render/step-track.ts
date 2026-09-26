import type { Fighter } from "../engine/types";

/** Off the stage between a fall and the respawn, or out of the match. Nothing of them is drawn. */
export function isGone(f: Fighter): boolean {
  return f.action === "dead" || f.action === "out";
}

/**
 * Where to draw a fighter between two engine steps. The renderer calls
 * `remember` before each step and `at` on each screen frame. A fighter in
 * hit stop holds still. One coming back from a fall has nothing to blend
 * from: the last step left them past the blast line, so blending would
 * draw them streaking across the stage to the respawn platform.
 */
export class StepTrack {
  private readonly prev = { x: 0, y: 0 };
  private wasGone = false;
  private readonly drawn = { x: 0, y: 0 };

  constructor(f: Fighter) {
    this.remember(f);
  }

  remember(f: Fighter): void {
    this.prev.x = f.pos.x;
    this.prev.y = f.pos.y;
    this.wasGone = isGone(f);
  }

  /** `alpha` is how far the clock is from the last step to the next, 0 to 1. */
  at(f: Fighter, alpha: number): Readonly<{ x: number; y: number }> {
    const snap = f.freeze > 0 || this.wasGone;
    this.drawn.x = snap ? f.pos.x : this.prev.x + (f.pos.x - this.prev.x) * alpha;
    this.drawn.y = snap ? f.pos.y : this.prev.y + (f.pos.y - this.prev.y) * alpha;
    return this.drawn;
  }
}
