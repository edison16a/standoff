/** Nothing in a level moves faster than this, in blocks a second. A bigger step in one frame is a replayed jump. */
const TOP_SPEED = 32;
/** Slack on top, so a slow frame is never taken for a replay. */
const SLACK = 0.2;
/** How quickly the drawn height closes on the real one after a replay, as a time constant in seconds. */
const EASE = 0.035;

/**
 * Eases the drawn height after a late jump is replayed. The run then
 * puts the cube where it would be had the jump come on time, which can be
 * a block higher than the frame before. Drawn as is, the cube would blink
 * upward. This lets it rise there over a few frames instead.
 */
export class CatchUp {
  private last: number | null = null;
  private offset = 0;

  /** Forgets the last height, for a fresh start or a respawn, which should jump straight there. */
  reset(): void {
    this.last = null;
    this.offset = 0;
  }

  /** The height to draw this frame for a real height of `y`. */
  apply(y: number, dt: number): number {
    if (this.last !== null && Math.abs(y - this.last) > TOP_SPEED * dt + SLACK) this.offset += this.last - y;
    this.last = y;
    this.offset *= dt > 0 ? Math.exp(-dt / EASE) : 1;
    if (Math.abs(this.offset) < 1e-3) this.offset = 0;
    return y + this.offset;
  }
}
