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
  /** No jump keeps the head up this long. A head still up is a player who stood up, so the line moves there. */
  settleUpMs: number;
  /** A head down this long is a player who sat down, not a duck, so the line moves there. */
  settleDownMs: number;
  /** A move also needs this many frames before it can settle. A slow machine may see a whole jump in two frames far apart. */
  settleFrames: number;
}

export const DEFAULT_HEAD: HeadMoveOptions = {
  up: 0.35,
  down: 0.4,
  riseMs: 350,
  duckMs: 40,
  release: 0.5,
  landingMs: 400,
  settleUpMs: 2500,
  settleDownMs: 5000,
  settleFrames: 12,
};

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
  /** A move lasted too long to be one, so it ended and the line should move to where the head is now. */
  settled: boolean;
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
  private wasNear = false;
  private belowSince: number | null = null;
  private landedAt = -Infinity;
  private movedAt = -Infinity;
  /** Frames seen since the move under way began. */
  private movedFrames = 0;

  constructor(private options: HeadMoveOptions = DEFAULT_HEAD) {}

  configure(options: HeadMoveOptions): void {
    this.options = options;
  }

  reset(): void {
    this.jumping = this.ducking = false;
    this.restAt = this.landedAt = this.movedAt = -Infinity;
    this.wasNear = false;
    this.belowSince = null;
  }

  /** `rise` is the head above its line in shoulder widths, negative below. */
  update(rise: number, time: number): HeadMoves {
    const { up, down, riseMs, duckMs, release, landingMs, settleUpMs, settleDownMs, settleFrames } = this.options;
    const near = rise < up * release && rise > -down * release;
    // From near the line to over the band in one frame is quick however long the frame took, which
    // keeps jumps working on a machine that tracks only a few frames a second.
    const quick = time - this.restAt <= riseMs || this.wasNear;
    this.wasNear = near;
    if (near) this.restAt = time;
    const out = { jumped: false, landed: false, ducked: false, stood: false, settled: false };
    // Standing up from a chair or sitting down between rounds looks like the start of a move that never ends.
    this.movedFrames++;
    const settled = time - this.movedAt >= (this.jumping ? settleUpMs : settleDownMs) && this.movedFrames > settleFrames;
    if ((this.jumping || this.ducking) && settled) {
      out.landed = this.jumping;
      out.stood = this.ducking;
      out.settled = this.wasNear = true;
      this.jumping = this.ducking = false;
      this.belowSince = null;
      this.restAt = time;
      return { jumping: false, ducking: false, idle: false, ...out };
    }
    if (this.jumping && rise < up * release) {
      this.jumping = false;
      this.landedAt = time;
      out.landed = true;
    } else if (!this.jumping && !this.ducking && rise >= up && quick) {
      this.jumping = out.jumped = true;
      this.movedAt = time;
      this.movedFrames = 0;
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
      if (time >= ready) {
        this.ducking = out.ducked = true;
        this.movedAt = time;
        this.movedFrames = 0;
      }
    }
    const idle = !this.jumping && !this.ducking && this.belowSince === null;
    return { jumping: this.jumping, ducking: this.ducking, idle, ...out };
  }
}
