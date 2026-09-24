import type { Arm, Body, Hand } from "../body";
import { ramp } from "../geometry";
import { hysteresis, type Reading } from "./reading";

export interface GuardOptions {
  /** How far each wrist may be from the head sideways, in torso lengths. */
  across: number;
  /** How far above the nose a wrist may be, in torso lengths. */
  above: number;
  /** How far below the nose a wrist may be, in torso lengths. */
  below: number;
  /** How far in front of its shoulder each wrist must be, in metres. */
  forward: number;
  /** The guard is up at this confidence and down again under `off`. */
  on: number;
  off: number;
}

export const DEFAULT_GUARD: GuardOptions = { across: 0.75, above: 0.45, below: 0.7, forward: 0.08, on: 0.6, off: 0.4 };

export interface GuardReading extends Reading {
  /** How well each hand is placed, 0 to 1. */
  hands: Record<Hand, number>;
  changed: boolean;
}

/**
 * Both fists up by the face and in front of it, as a boxer covers up.
 * Each wrist scores 0 to 1 on being near the face and in front of the
 * body, and the guard is only as good as the weaker hand.
 */
export class GuardDetector {
  private active = false;

  constructor(private options: GuardOptions = DEFAULT_GUARD) {}

  configure(options: GuardOptions): void {
    this.options = options;
  }

  reset(): void {
    this.active = false;
  }

  update(body: Body, scale: number): GuardReading {
    const left = this.hand(body, body.arms.left, scale);
    const right = this.hand(body, body.arms.right, scale);
    const confidence = Math.min(left, right);
    const was = this.active;
    this.active = hysteresis(was, confidence, this.options.on, this.options.off);
    return { active: this.active, amount: confidence, confidence, hands: { left, right }, changed: was !== this.active };
  }

  private hand(body: Body, arm: Arm, scale: number): number {
    const { across, above, below, forward } = this.options;
    const dx = (Math.abs(arm.wrist.x - body.head.x) * body.aspect) / scale;
    const dy = (arm.wrist.y - body.head.y) / scale;
    const sideways = ramp(dx, across, across * 0.6);
    const height = dy < 0 ? ramp(-dy, above, above * 0.6) : ramp(dy, below, below * 0.6);
    const front = ramp(arm.forward, 0, forward);
    // A guard keeps the elbows bent. Straight arms in front of the face are a punch.
    const bent = ramp(arm.extension, 0.95, 0.82);
    return Math.min(sideways, height, front, bent) * (arm.visible ? 1 : 0.3);
  }
}
