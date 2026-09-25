export interface HeadMoveOptions {
  /** The top of the band: the head this far above the line, in shoulder widths, is a jump. */
  up: number;
  /** The bottom of the band: the head this far below the line is a duck. */
  down: number;
  /** A jump must leave the band within this long of the head last resting near the line, so a slow stretch never counts. */
  riseMs: number;
  /** The head must stay under the band this long before a duck starts, so a bob never counts. */
  duckMs: number;
  /** A move ends once the head is back within this share of its edge. */
  release: number;
  /** After a landing, a drop under the band only counts if it lasts this long past the landing. Knees bend to land. */
  landingMs: number;
}

export const DEFAULT_HEAD: HeadMoveOptions = { up: 0.35, down: 0.4, riseMs: 350, duckMs: 40, release: 0.5, landingMs: 400 };

export interface HeadMoves {
  jumping: boolean;
  ducking: boolean;
  /** True on the one frame each happens. */
  jumped: boolean;
  landed: boolean;
  ducked: boolean;
  stood: boolean;
  /** Neither move is under way or waiting to start, so the line may follow the player. */
  idle: boolean;
}

/**
 * Jumps and ducks from how far the head is above or below its line.
 * The head must leave the band quickly to jump, and stay under it for a
 * moment to duck, so bobbing and slow drifts never count. Each move ends
 * only once the head is well back inside the band, so it never flickers
 * at an edge. Pure, so tests feed it made up heights.
 */
export class HeadMoveDetector {
  private jumping = false;
  private ducking = false;
  private restAt = -Infinity;
  private belowSince: number | null = null;
  private landedAt = -Infinity;

  constructor(private options: HeadMoveOptions = DEFAULT_HEAD) {}

  configure(options: HeadMoveOptions): void {
    this.options = options;
  }

  reset(): void {
    this.jumping = this.ducking = false;
    this.restAt = this.landedAt = -Infinity;
    this.belowSince = null;
  }

  /** `rise` is the head above its line in shoulder widths, negative below. */
  update(rise: number, time: number): HeadMoves {
    const { up, down, riseMs, duckMs, release, landingMs } = this.options;
    const near = rise < up * release && rise > -down * release;
    if (near) this.restAt = time;
    const out = { jumped: false, landed: false, ducked: false, stood: false };
    if (this.jumping && rise < up * release) {
      this.jumping = false;
      this.landedAt = time;
      out.landed = true;
    } else if (!this.jumping && !this.ducking && rise >= up && time - this.restAt <= riseMs) {
      this.jumping = out.jumped = true;
    }
    if (rise <= -down) this.belowSince ??= time;
    else if (!this.ducking) this.belowSince = null;
    if (this.ducking && rise > -down * release) {
      this.ducking = false;
      this.belowSince = null;
      out.stood = true;
    } else if (!this.ducking && !this.jumping && this.belowSince !== null) {
      // The knees soak up a landing. Only a player still down once that is over is ducking.
      const ready = Math.max(this.belowSince + duckMs, this.landedAt + landingMs);
      if (time >= ready) this.ducking = out.ducked = true;
    }
    const idle = !this.jumping && !this.ducking && this.belowSince === null;
    return { jumping: this.jumping, ducking: this.ducking, idle, ...out };
  }
}
