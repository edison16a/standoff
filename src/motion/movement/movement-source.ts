import type { Tuning } from "@/shared/tuning";

/** One controller frame, already reduced to what footwork cares about. */
export interface MovementSample {
  /** Milliseconds, from the sensor event clock. */
  t: number;
  /** Linear acceleration along the strip, m/s², gravity removed. */
  forwardAccel: number;
  /** Size of the whole linear acceleration vector, m/s². */
  accelMagnitude: number;
  /** Wrist twist relative to the calibrated guard, radians. */
  roll: number;
}

/**
 * Anything that turns controller frames into footwork. The value it
 * returns runs from -1 (full retreat) to 1 (full advance).
 *
 * Movement is kept behind this interface on purpose. If double integrated
 * position feels unreliable in playtesting, the tilt source slots in
 * without touching the strike detector, the sword or the rig.
 */
export interface MovementSource {
  update(sample: MovementSample): number;
  /** Zeroes the tracked offset. Called at every en garde. */
  recenter(): void;
  /**
   * Stops tracking while a jab or parry plays out. `fromMs` is when the
   * strike started building, `untilMs` when its recovery is over.
   */
  hold(fromMs: number, untilMs: number): void;
  configure(tuning: Tuning): void;
}

/**
 * Maps a signed amount onto -1..1 with a deadzone around zero, so a
 * slight offset reads as slight movement and resting reads as none.
 */
export function shapeIntent(amount: number, deadzone: number, fullScale: number): number {
  const magnitude = Math.abs(amount);
  if (magnitude <= deadzone) return 0;
  const span = Math.max(1e-6, fullScale - deadzone);
  return Math.sign(amount) * Math.min(1, (magnitude - deadzone) / span);
}
