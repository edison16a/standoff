import { clampLane, type Lane } from "./tuning";

/** A lean counts once it is held this long, so a wobble halfway through a step never does. */
export const LEAN_HOLD_MS = 150;
/** A lean only steers while the hips sit this near the middle of their lane, in lanes. */
export const LEAN_CENTRED = 0.3;
/** A duck this soon after landing a jump is the knees soaking up the landing. */
export const LANDING_MS = 400;

/** What the camera reads of one player this frame, as the kit gives it. */
export interface BodyReading {
  /** The lane the hips stand in. */
  lane: number;
  /** The hips from the player's spot, in lanes. */
  offset: number;
  /** Which way the upper body leans: -1 left, 0 upright, 1 right. */
  lean: number;
  ducking: boolean;
}

/**
 * Turns one player's body into lane changes and ducks the runner can
 * trust. Stepping moves the runner, and so does a lean held while the
 * feet stay put. A real jump ends with bent knees, which the camera reads
 * as a duck, and that would slam the runner down in mid air. So a duck
 * that follows a landing waits a moment, and only counts if the player
 * is still down. Pure, so tests can feed it made up readings.
 */
export class BodySteer {
  private leanSide = 0;
  private leanSince = 0;
  private landedAt = -Infinity;
  /** When a duck held back after a landing is looked at again. */
  private duckCheckAt: number | null = null;

  /** The lane to run in now. */
  lane(reading: BodyReading, now: number): Lane {
    const hips = clampLane(Math.round(reading.lane));
    const side = Math.sign(reading.lean);
    if (side !== this.leanSide) {
      this.leanSide = side;
      this.leanSince = now;
    }
    const centred = Math.abs(reading.offset - hips) < LEAN_CENTRED;
    if (!side || !centred || now - this.leanSince < LEAN_HOLD_MS) return hips;
    return clampLane(hips + side);
  }

  landed(time: number): void {
    this.landedAt = time;
  }

  /** A duck the camera just saw. True if it counts at once. */
  duck(time: number): boolean {
    if (time - this.landedAt >= LANDING_MS) return true;
    this.duckCheckAt = this.landedAt + LANDING_MS;
    return false;
  }

  /** Whether the player is down, leaving out the bend of a landing. */
  ducking(reading: BodyReading, now: number): boolean {
    return reading.ducking && now - this.landedAt >= LANDING_MS;
  }

  /** True once, when a duck held back after a landing turns out to be a real one. */
  heldDuck(reading: BodyReading, now: number): boolean {
    if (this.duckCheckAt === null || now < this.duckCheckAt) return false;
    this.duckCheckAt = null;
    return reading.ducking;
  }

  reset(): void {
    this.leanSide = 0;
    this.landedAt = -Infinity;
    this.duckCheckAt = null;
  }
}
