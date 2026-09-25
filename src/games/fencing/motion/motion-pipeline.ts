import type { StrikeAction } from "@/games/fencing/protocol";
import type { Tuning } from "@/games/fencing/tuning";
import { DEG, length, rotate, sub, type Quat, type Vec3 } from "@/games/kit/motion/math3d";
import { GestureClassifier, gestureSettings, type Sensitivity, type StrikeReport } from "./gesture";
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
/** Orientation readings further apart than this are a gap, not a slow turn. */
const MAX_TURN_GAP_MS = 100;

/**
 * Everything the phone does with its sensors, with no browser APIs in
 * sight so the whole thing can be unit tested with synthetic readings.
 *
 * Orientation drives the sword directly, measured from the calibrated
 * guard. The gesture classifier gets that pose, which is where parries
 * are read, and how hard the phone is moving: the size of its
 * acceleration and of its turn, whichever way they go, which is where
 * jabs are read. Only sizes are used, so a gyroscope that signs its
 * rates the other way round reads the same.
 */
export class MotionPipeline {
  private orientation: Quat | null = null;
  private calibration: Calibration | null = null;
  private gravity: Vec3 | null = null;
  private readonly strikes: GestureClassifier;
  private pose: SwordPose = { pitch: 0, yaw: 0, roll: 0 };
  /** How fast the orientation is turning, rad/s, for phones with no gyroscope. */
  private turn = { t: -Infinity, rate: 0 };

  constructor(
    tuning: Tuning,
    /** Called the instant a jab or parry is detected. */
    private readonly onStrike: (action: StrikeAction) => void,
  ) {
    this.strikes = new GestureClassifier(gestureSettings(tuning));
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

  /** How hard the phone is moving, in thresholds, and how near the parry point it is, where 1 is there. */
  get strikeScores(): { jab: number; parry: number } {
    return this.strikes.scores;
  }

  configure(tuning: Tuning): void {
    this.strikes.configure(gestureSettings(tuning));
  }

  /** How hard this player strikes, from the practice step. 1 is the host's setting. */
  setSensitivity(sensitivity: Sensitivity): void {
    this.strikes.setSensitivity(sensitivity);
  }

  /** Takes the current pose as guard and the current heading as forward. */
  calibrate(): boolean {
    if (!this.orientation) return false;
    this.calibration = calibrate(this.orientation);
    this.pose = swordPose(this.orientation, this.calibration);
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
    const before = this.orientation;
    this.orientation = q;
    const dt = t - this.turn.t;
    const rate = before && dt > 4 && dt < MAX_TURN_GAP_MS ? turnBetween(before, q) / (dt / 1000) : 0;
    this.turn = { t, rate };
    if (this.calibration) this.pose = swordPose(q, this.calibration);
  }

  onMotion(reading: MotionReading): void {
    if (!this.orientation || !this.calibration) return;
    const linear = this.linearAcceleration(reading);
    if (!linear) return;
    const gyro = reading.rotationRate;
    const action = this.strikes.update({
      t: reading.t,
      pitch: this.pose.pitch,
      yaw: this.pose.yaw,
      accel: length(linear),
      spin: gyro ? length(gyro) * DEG : this.turn.rate,
    });
    if (action) this.onStrike(action);
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

/** The angle between two orientations, radians. */
function turnBetween(a: Quat, b: Quat): number {
  const d = Math.abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z);
  return 2 * Math.acos(Math.min(1, d));
}
