import type { StrikeAction } from "@/games/fencing/protocol";
import { DEG } from "@/games/kit/motion/math3d";
import type { Tuning } from "@/games/fencing/tuning";
import { PARRY_REARM_SHARE, parryPointFrom, parryProgress, type ParryPoint } from "./parry-point";

/** One reading: where the blade points, and how hard the phone is moving. */
export interface GestureSample {
  /** Milliseconds. */
  t: number;
  /** Blade rise and swing right from the calibrated guard, radians. */
  pitch: number;
  yaw: number;
  /** Size of the acceleration with gravity removed, m/s², whatever its direction. */
  accel: number;
  /** How fast the phone turns about any axis, rad/s. */
  spin: number;
}

export interface GestureSettings {
  strikeAccel: number;
  /** rad/s. */
  strikeSpin: number;
  parry: ParryPoint;
  refractoryMs: number;
}

/**
 * How big a quick move has to be to jab, as a share of the thresholds. 1
 * is the host's setting. The practice step moves it for each player.
 */
export interface Sensitivity {
  strike: number;
}

/** The last action and how hard it was, for the practice step. */
export interface StrikeReport {
  action: StrikeAction;
  t: number;
  /** The strongest strike score of the move, in thresholds. */
  peak: number;
}

/** A move is over once its score stays under this share of the level for RELEASE_MS. */
const QUIET = 0.4;
/** Long enough to span the still moment in the middle of a shake. */
const RELEASE_MS = 150;
/** A quick move waits this long before it counts, in case it is a fast parry. */
export const CONFIRM_MS = 70;
/** While the blade keeps gaining on the parry point, the jab waits up to this long. */
const MAX_HOLD_MS = 300;
/** Still gaining means some gain in the last this many ms. */
const GAIN_MS = 50;
const GAIN_STEP = 0.01;
/** How long after a jab its peak is still being measured. */
const PEAK_MS = 160;

export function gestureSettings(tuning: Tuning): GestureSettings {
  return { strikeAccel: tuning.strikeAccel, strikeSpin: tuning.strikeSpin * DEG, parry: parryPointFrom(tuning), refractoryMs: tuning.refractoryMs };
}

/**
 * Sorts phone motion into jabs and parries. Slow moves do nothing, so the
 * blade just follows the phone.
 *
 * A parry is a place, not a speed: the blade passing a point up and right
 * of the guard. A jab is any quick move, a spike in acceleration or turn
 * whichever way it goes. A whole move counts once: it has to calm down
 * before another can start, and nothing fires for a refractory period
 * after an action. A quick move heading up and right is given a moment to
 * reach the parry point, and if it does it is a parry, not a jab.
 */
export class GestureClassifier {
  private previous: GestureSample | null = null;
  private score = 0;
  private progress = 0;
  /** The move under way, from its first loud reading until it calms down. */
  private move: { best: number; quietSince: number | null } | null = null;
  /** A jab waiting to be confirmed. */
  private pending: { at: number; best: number; gainAt: number } | null = null;
  /** False from a parry until the blade drops back under the rearm share. */
  private parryArmed = false;
  private lastActionAt = -Infinity;
  private suppressedUntil = -Infinity;
  private report: StrikeReport | null = null;

  constructor(
    private settings: GestureSettings,
    private sensitivity: Sensitivity = { strike: 1 },
  ) {}

  configure(settings: GestureSettings): void {
    this.settings = settings;
  }

  setSensitivity(sensitivity: Sensitivity): void {
    this.sensitivity = sensitivity;
  }

  get lastStrike(): StrikeReport | null {
    return this.report;
  }

  /** The strike score in thresholds, and the progress toward the parry point, for the practice meter. */
  get scores(): { jab: number; parry: number } {
    return { jab: this.score, parry: this.progress };
  }

  /** Ignores new moves until then, used around taps on the screen. */
  suppressUntil(t: number): void {
    this.suppressedUntil = Math.max(this.suppressedUntil, t);
  }

  update(sample: GestureSample): StrikeAction | null {
    const prev = this.previous;
    this.previous = sample;
    // Averaging with the previous reading shaves off single frame spikes.
    const accel = prev ? (sample.accel + prev.accel) / 2 : sample.accel;
    const spin = prev ? (sample.spin + prev.spin) / 2 : sample.spin;
    this.score = Math.max(accel / this.settings.strikeAccel, spin / this.settings.strikeSpin);
    this.progress = parryProgress(sample, this.settings.parry);
    this.trackMove(sample.t);
    return this.checkParry(sample.t) ?? this.checkJab(sample.t);
  }

  reset(): void {
    this.previous = null;
    this.move = null;
    this.pending = null;
    // A blade already up at the point must come down before it can parry.
    this.parryArmed = false;
    this.lastActionAt = -Infinity;
    this.suppressedUntil = -Infinity;
  }

  private trackMove(t: number): void {
    const level = this.sensitivity.strike;
    const move = this.move;
    if (!move) {
      if (this.score < level) return;
      this.move = { best: this.score, quietSince: null };
      if (this.canStart(t)) this.pending = { at: t, best: this.progress, gainAt: t };
      return;
    }
    move.best = Math.max(move.best, this.score);
    if (this.score >= level * QUIET) move.quietSince = null;
    else if (move.quietSince === null) move.quietSince = t;
    else if (t - move.quietSince >= RELEASE_MS) this.move = null;
    const report = this.report;
    if (report?.action === "jab" && t - report.t <= PEAK_MS && move.best > report.peak) this.report = { ...report, peak: move.best };
  }

  /**
   * A move can become a jab unless the screen was just tapped, an action
   * just fired, or the blade is still up from a parry: bringing it back
   * down to guard is quick too, and is not a jab.
   */
  private canStart(t: number): boolean {
    return t >= this.suppressedUntil && t - this.lastActionAt >= this.settings.refractoryMs && this.parryArmed;
  }

  private checkParry(t: number): StrikeAction | null {
    if (!this.parryArmed) {
      if (this.progress < PARRY_REARM_SHARE) this.parryArmed = true;
      return null;
    }
    if (this.progress < 1 || t < this.suppressedUntil || t - this.lastActionAt < this.settings.refractoryMs) return null;
    this.parryArmed = false;
    this.pending = null;
    return this.fire("parry", t, this.move?.best ?? this.score);
  }

  private checkJab(t: number): StrikeAction | null {
    const pending = this.pending;
    if (!pending) return null;
    if (this.progress > pending.best + GAIN_STEP) {
      pending.best = this.progress;
      pending.gainAt = t;
    }
    const age = t - pending.at;
    const heading = this.progress > 0 && t - pending.gainAt < GAIN_MS && age < MAX_HOLD_MS;
    if (age < CONFIRM_MS || heading) return null;
    this.pending = null;
    return this.fire("jab", t, this.move?.best ?? this.score);
  }

  private fire(action: StrikeAction, t: number, peak: number): StrikeAction {
    this.lastActionAt = t;
    this.report = { action, t, peak };
    return action;
  }
}
