import type { StrikeAction } from "@/shared/protocol";
import type { Tuning } from "@/shared/tuning";
import { rotate, sub, type Quat, type Vec3 } from "./math3d";
import { StrikeDetector } from "./strike-detector";
import { calibrate, swordPose, type Calibration, type SwordPose } from "./sword-pose";

/** A `devicemotion` reading, in the device frame. */
export interface MotionReading {
  t: number;
  /** Linear acceleration with gravity removed, when the browser provides it. */
  acceleration: Vec3 | null;
  /** Raw acceleration including gravity, the fallback when it does not. */
  accelerationIncludingGravity: Vec3 | null;
}

/** What the phone sends to the host every frame: the sword, plus footwork from the buttons. */
export interface ControllerFrame extends SwordPose {
  move: number;
}

/** Smoothing for the gravity estimate used by the fallback path. */
const GRAVITY_SMOOTHING = 0.08;

/**
 * Everything the phone does with its sensors, with no browser APIs in
 * sight so the whole thing can be unit tested with synthetic readings.
 *
 * Orientation drives the sword directly. Motion is rotated into the earth
 * frame and only its vertical part goes to the strike detector: a sharp
 * chop down is a jab, a sharp lift up is a parry. Up and down is the one
 * direction every grip and every arm does cleanly, where a thrust toward
 * the screen got lost in the arm's swing. Footwork is two buttons.
 */
export class MotionPipeline {
  private orientation: Quat | null = null;
  private calibration: Calibration | null = null;
  private gravity: Vec3 | null = null;
  private readonly strikes: StrikeDetector;
  private pose: SwordPose = { pitch: 0, yaw: 0, roll: 0 };

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

  /** The live sword, relative to the calibrated guard. */
  get sword(): SwordPose {
    return this.pose;
  }

  configure(tuning: Tuning): void {
    this.strikes.configure(tuning);
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

  onOrientation(q: Quat): void {
    this.orientation = q;
    if (this.calibration) this.pose = swordPose(q, this.calibration);
  }

  onMotion(reading: MotionReading): void {
    if (!this.orientation || !this.calibration) return;
    const linear = this.linearAcceleration(reading);
    if (!linear) return;

    // Earth z points up, so a downward chop reads positive.
    const action = this.strikes.update(-linear.z, reading.t);
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
