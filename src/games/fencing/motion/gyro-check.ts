/** Both rates must be at least this fast (rad/s) for a reading to count as evidence. */
const MOVING = 0.6;
/** Evidence needed either way before the gyroscope is trusted. */
const DECIDE = 3;
/** One reading can add at most this much, so a single glitch never decides. */
const MAX_STEP = 0.8;

/**
 * Checks the gyroscope against the orientation before trusting it. Not
 * every browser agrees on which way a rotation rate is signed, and a
 * gyroscope read backwards would push every chop toward a parry. The
 * orientation reading, differentiated, gives the same blade rise rate
 * the slow way. While the player waves the phone about during setup,
 * matching signs build up evidence one way or the other.
 */
export class GyroCheck {
  private evidence = 0;
  private sign: 1 | -1 | null = null;

  /** 1 or -1 once decided, null until then (use no gyroscope). */
  get verdict(): 1 | -1 | null {
    return this.sign;
  }

  /** Feeds the blade's rise rate as the orientation and as the gyroscope see it. */
  compare(fromOrientation: number, fromGyro: number): void {
    if (this.sign !== null) return;
    if (Math.abs(fromOrientation) < MOVING || Math.abs(fromGyro) < MOVING) return;
    const agree = Math.sign(fromOrientation) === Math.sign(fromGyro) ? 1 : -1;
    this.evidence += agree * Math.min(MAX_STEP, Math.abs(fromOrientation) * 0.3);
    if (this.evidence >= DECIDE) this.sign = 1;
    else if (this.evidence <= -DECIDE) this.sign = -1;
  }
}
