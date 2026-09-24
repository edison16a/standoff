import type { Tuning } from "@/shared/tuning";
import { shapeIntent, type MovementSample, type MovementSource } from "./movement-source";

const DEG = Math.PI / 180;

/**
 * The fallback: footwork from how far the wrist is rolled. Twist the phone
 * clockwise to advance, counter clockwise to retreat. It reads an angle
 * directly instead of integrating anything, so it cannot drift, at the
 * cost of feeling less like real footwork.
 */
export class TiltTracker implements MovementSource {
  private deadzone: number;
  private fullScale: number;

  constructor(tuning: Tuning) {
    this.deadzone = tuning.tiltDeadzoneDeg * DEG;
    this.fullScale = tuning.tiltFullScaleDeg * DEG;
  }

  configure(tuning: Tuning): void {
    this.deadzone = tuning.tiltDeadzoneDeg * DEG;
    this.fullScale = tuning.tiltFullScaleDeg * DEG;
  }

  update(sample: MovementSample): number {
    return shapeIntent(sample.roll, this.deadzone, this.fullScale);
  }

  recenter(): void {}

  hold(): void {}
}
