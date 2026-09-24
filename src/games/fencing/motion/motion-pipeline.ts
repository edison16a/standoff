import type { StrikeAction } from "@/games/fencing/protocol";
import type { Tuning } from "@/games/fencing/tuning";
import { cross, DEG, dot, rotate, sub, vec, type Quat, type Vec3 } from "@/games/kit/motion/math3d";
import { GyroCheck } from "./gyro-check";
import { StrikeDetector, type Sensitivity, type StrikeReport } from "./strike-detector";
import { calibrate, swordPose, type Calibration, type SwordPose } from "./sword-pose";

/** A `devicemotion` reading, in the device frame. */
export interface MotionReading {
  t: number;
  /** Linear acceleration with gravity removed, when the browser provides it. */
  acceleration: Vec3 | null;
  /** Raw acceleration including gravity, the fallback when it does not. */
  accelerationIncludingGravity: Vec3 | null;
  /** The gyroscope, in degrees a second around the device's x, y and z axes. Null without one. */
  rotationRate?: Vec3 | null;
}

/** What the phone sends to the host every frame: the sword, plus footwork from the buttons. */
export interface ControllerFrame extends SwordPose {
  move: number;
}

/** Smoothing for the gravity estimate used by the fallback path. */
const GRAVITY_SMOOTHING = 0.08;
/** A thumb on the screen jolts the phone. Strikes wait this long after a tap. */
export const TAP_QUIET_MS = 150;
const EARTH_UP = vec(0, 0, 1);

/**
 * Everything the phone does with its sensors, with no browser APIs in
 * sight so the whole thing can be unit tested with synthetic readings.
 *
 * Orientation drives the sword directly. Motion is rotated into the earth
 * frame, and three things go to the strike detector: the vertical part
 * (a chop down is a jab, a lift is a parry), the part toward the opponent,
 * and, from the gyroscope, how fast the blade tip is rising or falling.
 */
export class MotionPipeline {
  private orientation: Quat | null = null;
  private calibration: Calibration | null = null;
  private gravity: Vec3 | null = null;
  private readonly strikes: StrikeDetector;
  private pose: SwordPose = { pitch: 0, yaw: 0, roll: 0 };
  private readonly gyro = new GyroCheck();
  /** The blade's rise rate as the orientation sees it, for checking the gyroscope. */
  private tip = { pitch: 0, t: -Infinity, rate: 0 };

  constructor(
    tuning: Tuning,
    /** Called the instant a jab or parry is detected. */
    private readonly onStrike: (action: StrikeAction) => void,
  ) {
    this.strikes = new StrikeDetector(tuning);
  }

  get isCalibrated(): boolean {
    return this.calibration !== null;
  }

  /** The latest orientation, for the calibration screen's steadiness check. */
  get rawOrientation(): Quat | null {
    return this.orientation;
  }

  /**
   * How far the phone is from lying level with its top edge forward:
   * the top edge's rise (pitch) and the right edge's rise (roll), in
   * radians. The calibration screen shows it as a bubble level, so a
   * player can find the same guard every time. Null before any reading.
   */
  get level(): { pitch: number; roll: number } | null {
    if (!this.orientation) return null;
    const top = rotate(this.orientation, { x: 0, y: 1, z: 0 });
    const right = rotate(this.orientation, { x: 1, y: 0, z: 0 });
    return { pitch: Math.asin(Math.max(-1, Math.min(1, top.z))), roll: Math.asin(Math.max(-1, Math.min(1, right.z))) };
  }

  /** The live sword, relative to the calibrated guard. */
  get sword(): SwordPose {
    return this.pose;
  }

  /** The last strike and how hard it was, which the practice step learns from. */
  get lastStrike(): StrikeReport | null {
    return this.strikes.lastStrike;
  }

  configure(tuning: Tuning): void {
    this.strikes.configure(tuning);
  }

  /** How hard this player strikes, from the practice step. 1 is the host's setting. */
  setSensitivity(sensitivity: Sensitivity): void {
    this.strikes.setSensitivity(sensitivity);
  }

  /** Takes the current pose as guard and the current heading as forward. */
  calibrate(): boolean {
    if (!this.orientation) return false;
    this.calibration = calibrate(this.orientation);
    this.recenter();
    return true;
  }

  /** Called at every en garde, so a half finished strike never carries over. */
  recenter(): void {
    this.strikes.reset();
  }

  /** A finger went down or up on the screen: the jolt it gives the phone is not a strike. */
  noteTap(t: number): void {
    this.strikes.suppressUntil(t + TAP_QUIET_MS);
  }

  onOrientation(q: Quat, t = -Infinity): void {
    this.orientation = q;
    if (!this.calibration) return;
    this.pose = swordPose(q, this.calibration);
    const dt = (t - this.tip.t) / 1000;
    this.tip = { pitch: this.pose.pitch, t, rate: dt > 0.004 && dt < 0.1 ? (this.pose.pitch - this.tip.pitch) / dt : 0 };
  }

  onMotion(reading: MotionReading): void {
    if (!this.orientation || !this.calibration) return;
    const linear = this.linearAcceleration(reading);
    if (!linear) return;
    const { heading } = this.calibration;
    const action = this.strikes.update({
      t: reading.t,
      // Earth z points up, so a downward chop reads positive.
      down: -linear.z,
      forward: linear.x * Math.sin(heading) + linear.y * Math.cos(heading),
      pitchRate: this.pitchRate(reading.rotationRate ?? null),
    });
    if (action) this.onStrike(action);
  }

  /**
   * How fast the blade tip rises, in rad/s. The gyroscope turns the phone
   * around some axis. Carried into the earth frame, the tip's velocity is
   * that turn crossed with the blade, and its upward part is the rise.
   */
  private pitchRate(rate: Vec3 | null): number | null {
    if (!rate || !this.calibration) return null;
    const q = this.orientation!;
    const omega = rotate(q, vec(rate.x * DEG, rate.y * DEG, rate.z * DEG));
    const blade = rotate(q, this.calibration.blade);
    const rise = dot(omega, cross(blade, EARTH_UP));
    this.gyro.compare(this.tip.rate, rise);
    const sign = this.gyro.verdict;
    return sign === null ? null : rise * sign;
  }

  /**
   * Linear acceleration in the earth frame. Most browsers give it to us
   * directly. Where they only give acceleration with gravity, we rotate it
   * into the earth frame and subtract a slowly tracked gravity estimate.
   * Tracking it rather than assuming (0, 0, 9.81) also covers the older
   * iOS builds that report the gravity component with the opposite sign.
   */
  private linearAcceleration(reading: MotionReading): Vec3 | null {
    const q = this.orientation!;
    if (reading.acceleration) return rotate(q, reading.acceleration);
    if (!reading.accelerationIncludingGravity) return null;
    const total = rotate(q, reading.accelerationIncludingGravity);
    const g = this.gravity ?? total;
    this.gravity = {
      x: g.x + (total.x - g.x) * GRAVITY_SMOOTHING,
      y: g.y + (total.y - g.y) * GRAVITY_SMOOTHING,
      z: g.z + (total.z - g.z) * GRAVITY_SMOOTHING,
    };
    return sub(total, this.gravity);
  }
}
