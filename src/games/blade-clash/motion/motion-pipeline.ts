import { GUARD, type SwordControl } from "@/games/blade-clash/engine/sword";
import type { Quat } from "@/games/kit/motion/math3d";
import { aimOf, controlFromAim, type AimPoint, type SwordCalibration } from "./sword-aim";

/**
 * Everything the phone does with its sensors, with no browser APIs in
 * sight so it can be tested with made up readings. The orientation goes
 * straight to the sword: no integration and no drift, just where the
 * calibrated blade points right now. Phones without sensors feed a
 * dragged point instead, through the same mapping.
 */
export class MotionPipeline {
  private orientation: Quat | null = null;
  private calibration: SwordCalibration | null = null;
  private dragged: AimPoint | null = null;

  get isCalibrated(): boolean {
    return this.calibration !== null;
  }

  /** The latest orientation, for the calibration steps. */
  get rawOrientation(): Quat | null {
    return this.orientation;
  }

  get guard(): AimPoint | null {
    return this.calibration?.guard ?? null;
  }

  /** Where the blade points on the player's view right now, or null before calibration. */
  get aim(): AimPoint | null {
    if (this.dragged) return this.dragged;
    if (!this.orientation || !this.calibration) return null;
    return aimOf(this.orientation, this.calibration);
  }

  /** The sword as it should be held right now. The guard until there is anything to go on. */
  get control(): SwordControl {
    if (this.dragged) return controlFromAim(this.dragged, 0);
    if (!this.orientation || !this.calibration) return { ...GUARD };
    const aim = aimOf(this.orientation, this.calibration);
    return controlFromAim(aim, aim.roll, this.calibration.guard);
  }

  setCalibration(calibration: SwordCalibration): void {
    this.calibration = calibration;
  }

  onOrientation(q: Quat): void {
    this.orientation = q;
  }

  /** The drag pad's point, for phones without sensors. Null when the finger lifts, which rests the sword in guard. */
  drag(point: AimPoint | null): void {
    this.dragged = point;
  }
}
