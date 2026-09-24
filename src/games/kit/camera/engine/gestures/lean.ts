import type { Body } from "../body";
import { ramp } from "../geometry";
import { LM } from "../landmarks";
import type { Reading } from "./reading";

export interface LeanOptions {
  /** How far the head must move sideways from over the hips, in torso lengths. */
  offset: number;
  /** The lean ends once the offset falls under this share of `offset`. */
  release: number;
}

export const DEFAULT_LEAN: LeanOptions = { offset: 0.3, release: 0.6 };

/** -1 leaning to the left of the picture, which is the player's own left, 1 to the right, 0 upright. */
export type Side = -1 | 0 | 1;

export interface LeanReading extends Reading {
  side: Side;
  changed: boolean;
}

/**
 * Leaning or dodging: the head moves sideways from over the hips.
 * Stepping sideways moves both together, so a step is never a lean.
 */
export class LeanDetector {
  private side: Side = 0;

  constructor(private options: LeanOptions = DEFAULT_LEAN) {}

  configure(options: LeanOptions): void {
    this.options = options;
  }

  reset(): void {
    this.side = 0;
  }

  /** `restOffset` is how far right of the hips this player's head sits when upright, from calibration. */
  update(body: Body, scale: number, restOffset = 0): LeanReading {
    const { offset: need, release } = this.options;
    const amount = ((body.head.x - body.hips.x) * body.aspect) / scale - restOffset;
    const size = Math.abs(amount);
    const toward: Side = amount < 0 ? -1 : 1;
    const before = this.side;
    if (size >= need) this.side = toward;
    else if (this.side !== 0 && (size < need * release || toward !== this.side)) this.side = 0;
    const seen = body.landmarks[LM.nose]!.visibility;
    return {
      active: this.side !== 0,
      amount,
      confidence: ramp(size, need / 2, need * 1.5) * ramp(Math.min(seen, body.confidence), 0.4, 0.8),
      side: this.side,
      changed: this.side !== before,
    };
  }
}
