import type { Body } from "../body";
import { ramp } from "../geometry";
import { hysteresis, type Reading } from "./reading";
import { SIZE_SHIFT, type StandingReference } from "./reference";

export interface JumpOptions {
  /** How far the hips and shoulders must both rise, in torso lengths. */
  rise: number;
  /** A fast start counts sooner: this upward speed, in torso lengths per second, with half the rise. */
  speed: number;
  /** The jump ends once the rise falls under this share of `rise`. */
  release: number;
  /** A player this much smaller than their reference has stepped back, which can look like rising. */
  shrink: number;
}

export const DEFAULT_JUMP: JumpOptions = { rise: 0.18, speed: 1.4, release: 0.5, shrink: 0.1 };

export interface JumpReading extends Reading {
  /** True on the one frame the jump begins. */
  started: boolean;
  /** True on the one frame the player lands. */
  landed: boolean;
}

/**
 * A jump is the hips and the shoulders rising together. Taking the smaller
 * of the two rises means raising the arms, or the head alone, never counts.
 */
export class JumpDetector {
  private active = false;

  constructor(private options: JumpOptions = DEFAULT_JUMP) {}

  configure(options: JumpOptions): void {
    this.options = options;
  }

  reset(): void {
    this.active = false;
  }

  update(body: Body, reference: StandingReference): JumpReading {
    const { rise: need, speed, release, shrink } = this.options;
    const shrinking = Math.max(0, 1 - body.scale / reference.scale);
    const lifted = Math.min(reference.hipY - body.hips.y, reference.shoulderY - body.shoulders.y) / reference.scale;
    const rise = lifted - shrinking * SIZE_SHIFT;
    const upward = -body.velocity.torso.y;
    const steady = shrinking < shrink;
    const quick = upward >= speed && rise >= need / 2;
    const was = this.active;
    this.active = steady || was ? hysteresis(was, quick ? need : rise, need, need * release) : false;
    const byHeight = ramp(rise, need / 2, need * 1.5);
    const bySpeed = quick ? ramp(upward, speed / 2, speed * 1.5) : 0;
    return {
      active: this.active,
      amount: rise,
      confidence: Math.max(byHeight, bySpeed) * ramp(body.confidence, 0.4, 0.8),
      started: this.active && !was,
      landed: was && !this.active,
    };
  }
}
