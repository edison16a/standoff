import type { StrikeAction } from "@/shared/protocol";
import type { Tuning } from "@/shared/tuning";
import { dot, length, rotate, sub, vec, type Quat, type Vec3 } from "./math3d";
import type { MovementSource } from "./movement/movement-source";
import { PositionTracker } from "./movement/position-tracker";
import { TiltTracker } from "./movement/tilt-tracker";
import { RISE_WINDOW_MS, StrikeDetector } from "./strike-detector";
import { calibrate, stripAxis, swordPose, type Calibration, type SwordPose } from "./sword-pose";

/** A `devicemotion` reading, in the device frame. */
export interface MotionReading {
  t: number;
  /** Linear acceleration with gravity removed, when the browser provides it. */
  acceleration: Vec3 | null;
  /** Raw acceleration including gravity, the fallback when it does not. */
  accelerationIncludingGravity: Vec3 | null;
}

/** What the phone sends to the host every frame. */
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
 * frame, projected onto the strip line, and handed to the strike detector
 * and the movement source side by side.
 */
export class MotionPipeline {
  private orientation: Quat | null = null;
  private calibration: Calibration | null = null;
  private axis: Vec3 = vec(0, 1, 0);
  private gravity: Vec3 | null = null;
  private readonly strikes: StrikeDetector;
  private movement: MovementSource;
  private tuning: Tuning;
  private pose: SwordPose = { pitch: 0, yaw: 0, roll: 0 };
  private move = 0;

  constructor(
    tuning: Tuning,
    /** Called the instant a jab or parry is detected. */
    private readonly onStrike: (action: StrikeAction) => void,
  ) {
    this.tuning = tuning;
    this.strikes = new StrikeDetector(tuning);
    this.movement = makeMovement(tuning);
  }

  get isCalibrated(): boolean {
    return this.calibration !== null;
  }

  get frame(): ControllerFrame {
    return { ...this.pose, move: this.move };
  }

  configure(tuning: Tuning): void {
    const modeChanged = tuning.movementMode !== this.tuning.movementMode;
    this.tuning = tuning;
    this.strikes.configure(tuning);
    if (modeChanged) this.movement = makeMovement(tuning);
    else this.movement.configure(tuning);
  }

  /** Takes the current pose as guard and the current heading as forward. */
  calibrate(): boolean {
    if (!this.orientation) return false;
    this.calibration = calibrate(this.orientation);
    this.axis = stripAxis(this.calibration);
    this.recenter();
    return true;
  }

  recenter(): void {
    this.movement.recenter();
    this.strikes.reset();
    this.move = 0;
  }

  onOrientation(q: Quat): void {
    this.orientation = q;
    if (this.calibration) this.pose = swordPose(q, this.calibration);
  }

  onMotion(reading: MotionReading): void {
    if (!this.orientation || !this.calibration) return;
    const linear = this.linearAcceleration(reading);
    if (!linear) return;

    const forward = dot(linear, this.axis);
    const action = this.strikes.update(forward, reading.t);
    if (action) {
      this.movement.hold(reading.t - RISE_WINDOW_MS, reading.t + this.tuning.refractoryMs);
      this.onStrike(action);
    }
    this.move = this.movement.update({
      t: reading.t,
      forwardAccel: forward,
      accelMagnitude: length(linear),
      roll: this.pose.roll,
    });
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

function makeMovement(tuning: Tuning): MovementSource {
  return tuning.movementMode === "tilt" ? new TiltTracker(tuning) : new PositionTracker(tuning);
}
