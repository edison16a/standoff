import type { Body } from "../body";
import type { Baseline } from "../calibration";

/**
 * How far a player's shoulders seem to move up or down, in torso lengths,
 * per unit of size change when they step nearer or further from a camera
 * mounted high or low. Jumps and ducks take it off, so a step is not a move.
 */
export const SIZE_SHIFT = 1.5;

/**
 * Where the player stands right now when they are doing nothing. It
 * starts at the calibrated baseline and drifts after the player slowly
 * while they stand neutral, so shifting weight or stepping a little
 * nearer the camera never reads as a jump or a duck. During a move it
 * holds still, so the move is measured against how they stood before it.
 */
export class StandingReference {
  headY: number;
  shoulderY: number;
  hipY: number;
  scale: number;

  constructor(readonly baseline: Baseline) {
    this.headY = baseline.headY;
    this.shoulderY = baseline.shoulderY;
    this.hipY = baseline.hipY;
    this.scale = baseline.scale;
  }

  /** The player's size now over their size at calibration. Above 1 means they came nearer. */
  get nearness(): number {
    return this.scale / this.baseline.scale;
  }

  /**
   * Follows the body while it is neutral. `followMs` is the time constant.
   * A clear change of size means the player stepped nearer or further
   * away, which it catches up with four times faster.
   */
  follow(body: Body, neutral: boolean, stepMs: number, followMs: number, resizeAt: number): void {
    if (!neutral || stepMs <= 0) return;
    const resized = Math.abs(body.scale / this.scale - 1) > resizeAt;
    const k = 1 - Math.exp(-stepMs / (resized ? followMs / 4 : followMs));
    this.headY += (body.head.y - this.headY) * k;
    this.shoulderY += (body.shoulders.y - this.shoulderY) * k;
    this.hipY += (body.hips.y - this.hipY) * k;
    this.scale += (body.scale - this.scale) * k;
  }
}
