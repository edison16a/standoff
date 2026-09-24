import type { StrikeAction } from "@/games/fencing/protocol";

export interface StrikeSettings {
  jabThreshold: number;
  parryThreshold: number;
  refractoryMs: number;
}

/**
 * A strike has to climb from quiet to the threshold inside this window.
 * That is what separates a snap of the wrist from a slow move of the arm,
 * like tilting the sword to aim.
 */
export const RISE_WINDOW_MS = 160;
/** Below this share of the threshold the signal counts as quiet. */
const QUIET_RATIO = 0.35;
/** The signal has to drop back under this share before it can fire again. */
const REARM_RATIO = 0.5;

/**
 * Turns downward acceleration into discrete jab and parry events. A spike
 * down is a jab, a spike up is a parry. Both are edge triggered and
 * followed by a refractory period, because every chop ends with the arm
 * braking and coming back, and that recovery is a spike the other way we
 * must not read as the other strike.
 */
export class StrikeDetector {
  private refractoryUntil = -Infinity;
  private lastQuietForward = -Infinity;
  private lastQuietBackward = -Infinity;
  private armed = true;
  private previous = 0;

  constructor(private settings: StrikeSettings) {}

  configure(settings: StrikeSettings): void {
    this.settings = settings;
  }

  /** True while a recent strike is still settling. */
  isRefractory(now: number): boolean {
    return now < this.refractoryUntil;
  }

  /**
   * Feeds one sample of downward acceleration in m/s² with its time in ms.
   * Returns the strike it completes, if any.
   */
  update(downAccel: number, now: number): StrikeAction | null {
    // Average with the previous sample to shave off single frame spikes.
    const a = (downAccel + this.previous) / 2;
    this.previous = downAccel;
    const { jabThreshold, parryThreshold, refractoryMs } = this.settings;

    if (a < jabThreshold * QUIET_RATIO) this.lastQuietForward = now;
    if (-a < parryThreshold * QUIET_RATIO) this.lastQuietBackward = now;
    if (!this.armed && a < jabThreshold * REARM_RATIO && -a < parryThreshold * REARM_RATIO) {
      this.armed = true;
    }
    if (!this.armed || this.isRefractory(now)) return null;

    let action: StrikeAction | null = null;
    if (a >= jabThreshold && now - this.lastQuietForward <= RISE_WINDOW_MS) action = "jab";
    else if (-a >= parryThreshold && now - this.lastQuietBackward <= RISE_WINDOW_MS) action = "parry";
    if (!action) return null;

    this.armed = false;
    this.refractoryUntil = now + refractoryMs;
    return action;
  }

  reset(): void {
    this.refractoryUntil = -Infinity;
    this.lastQuietForward = -Infinity;
    this.lastQuietBackward = -Infinity;
    this.armed = true;
    this.previous = 0;
  }
}
