import { length, type Vec2 } from "./geometry";
import { BLADE_GAP_S, SLICE_SPEED, SPEED_SMOOTHING_S, SWIPE_SPEED } from "./tuning";

/** The stretch the blade covered since the last frame, in world units. */
export interface BladeSegment {
  from: Vec2;
  to: Vec2;
}

/**
 * One player's blade: where it is, the path it took this frame and how
 * fast it moves. The speed is smoothed over a few frames so a single
 * jittery reading never counts as a slash, and slow hovering never cuts.
 */
export class Blade {
  private last: { x: number; y: number; t: number } | null = null;
  private fast = false;
  /** Smoothed speed in world units per second. */
  speed = 0;
  segment: BladeSegment | null = null;
  /** True for the one frame a new swipe begins, for the whoosh. */
  swipeStarted = false;

  /** Feeds this frame's aim, in world units, or null when the phone is not aiming. */
  move(point: Vec2 | null, t: number): void {
    this.swipeStarted = false;
    if (!point) return this.reset();
    const last = this.last;
    if (!last || t - last.t > BLADE_GAP_S) {
      this.reset();
      this.last = { x: point.x, y: point.y, t };
      return;
    }
    const dt = t - last.t;
    if (dt <= 0) {
      this.segment = null;
      return;
    }
    const instant = length(point.x - last.x, point.y - last.y) / dt;
    this.speed += (instant - this.speed) * Math.min(1, dt / SPEED_SMOOTHING_S);
    this.segment = { from: { x: last.x, y: last.y }, to: { x: point.x, y: point.y } };
    this.last = { x: point.x, y: point.y, t };
    // A little hysteresis, so one swipe never whooshes twice.
    if (!this.fast && this.speed >= SWIPE_SPEED) {
      this.fast = true;
      this.swipeStarted = true;
    } else if (this.fast && this.speed < SLICE_SPEED) {
      this.fast = false;
    }
  }

  /** Whether this frame's path cuts. */
  get cutting(): boolean {
    return this.segment !== null && this.speed >= SLICE_SPEED;
  }

  get position(): Vec2 | null {
    return this.last ? { x: this.last.x, y: this.last.y } : null;
  }

  /** The unit direction of this frame's path, or straight down when still. */
  get direction(): Vec2 {
    const s = this.segment;
    if (!s) return { x: 0, y: -1 };
    const dx = s.to.x - s.from.x;
    const dy = s.to.y - s.from.y;
    const len = length(dx, dy);
    return len > 1e-6 ? { x: dx / len, y: dy / len } : { x: 0, y: -1 };
  }

  reset(): void {
    this.last = null;
    this.segment = null;
    this.speed = 0;
    this.fast = false;
  }
}
