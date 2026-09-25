import { blendControl, clampControl, GUARD, type SwordControl } from "./sword";

/**
 * How quickly the drawn sword catches up with the phone. Readings arrive
 * at an uneven 50 to 60 Hz over WiFi, and a touch of smoothing hides that
 * jitter without making the sword feel slow.
 */
const FOLLOW_PER_S = 28;

/** How long a clash throws the sword, then how long it takes to ease back into the hand. */
export interface KnockTiming {
  outMs: number;
  returnMs: number;
}

interface Knock {
  at: number;
  start: SwordControl;
  peak: SwordControl;
}

/**
 * Moves one fighter's sword. Normally it follows the phone closely. A
 * clash throws it: for a moment it flies away from the other blade and
 * ignores the phone, then it eases back into wherever the phone is by
 * then, so there is never a jump.
 */
export class SwordDriver {
  /** The latest hold the phone asked for. */
  private target: SwordControl = { ...GUARD };
  /** The phone's hold, smoothed. What the sword shows when nothing is in the way. */
  private followed: SwordControl = { ...GUARD };
  private current: SwordControl = { ...GUARD };
  private previous: SwordControl = { ...GUARD };
  private knock: Knock | null = null;
  private lastDt = 1000 / 60;

  constructor(private readonly timing: () => KnockTiming) {}

  /** Where the sword is now. */
  get control(): SwordControl {
    return this.current;
  }

  /** Where it was one step ago, for the swept tests. */
  get before(): SwordControl {
    return this.previous;
  }

  /** How the hold is changing, in radians a second, for working out which way a clash throws it. */
  get turnRate(): { yaw: number; pitch: number } {
    const k = 1000 / this.lastDt;
    return { yaw: (this.current.yaw - this.previous.yaw) * k, pitch: (this.current.pitch - this.previous.pitch) * k };
  }

  /** 1 while thrown by a clash, easing to 0 as the sword returns to the hand. */
  knockedAt(now: number): number {
    if (!this.knock) return 0;
    const { outMs, returnMs } = this.timing();
    const elapsed = now - this.knock.at;
    if (elapsed < outMs) return 1;
    return Math.max(0, 1 - (elapsed - outMs) / returnMs);
  }

  /** A thrown sword neither hurts nor clashes until it is back in the hand, so it can never bounce to and fro. */
  isFree(now: number): boolean {
    return this.knockedAt(now) === 0;
  }

  setTarget(control: SwordControl): void {
    this.target = clampControl(control);
  }

  /** Straight to a hold with no easing, for the start of a fight. */
  reset(control: SwordControl = GUARD): void {
    this.target = clampControl(control);
    this.followed = { ...this.target };
    this.current = { ...this.target };
    this.previous = { ...this.target };
    this.knock = null;
  }

  /** Throws the sword by this much from `from` (where it is now by default). The arm is pulled back too. */
  knockBack(by: { yaw: number; pitch: number }, now: number, from: SwordControl = this.current): void {
    const start = { ...from };
    this.current = start;
    this.knock = { at: now, start, peak: clampControl({ ...start, yaw: start.yaw + by.yaw, pitch: start.pitch + by.pitch, reach: 0 }) };
  }

  step(dtMs: number, now: number): SwordControl {
    this.lastDt = Math.max(1, dtMs);
    this.previous = this.current;
    const k = 1 - Math.exp((-FOLLOW_PER_S * dtMs) / 1000);
    this.followed = blendControl(this.followed, this.target, k);
    this.current = this.knock ? this.knocked(now) : this.followed;
    return this.current;
  }

  private knocked(now: number): SwordControl {
    const knock = this.knock!;
    const { outMs, returnMs } = this.timing();
    const elapsed = now - knock.at;
    if (elapsed < outMs) return blendControl(knock.start, knock.peak, easeOut(elapsed / outMs));
    if (elapsed < outMs + returnMs) return blendControl(knock.peak, this.followed, smooth((elapsed - outMs) / returnMs));
    this.knock = null;
    return this.followed;
  }
}

function easeOut(k: number): number {
  return 1 - (1 - k) * (1 - k);
}

function smooth(k: number): number {
  return k * k * (3 - 2 * k);
}
