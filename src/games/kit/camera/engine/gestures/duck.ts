import type { Body } from "../body";
import { ramp } from "../geometry";
import { hysteresis, type Reading } from "./reading";
import { SIZE_SHIFT, type StandingReference } from "./reference";

export interface DuckOptions {
  /** How far the head and shoulders must drop, on average, in torso lengths. */
  drop: number;
  /** A fast drop counts sooner: this downward head speed, in torso lengths per second, with half the drop. */
  speed: number;
  /** The duck ends once the drop falls under this share of `drop`. */
  release: number;
  /** A player this much bigger than their reference has stepped nearer, which can look like dropping. */
  grow: number;
}

export const DEFAULT_DUCK: DuckOptions = { drop: 0.28, speed: 1.6, release: 0.6, grow: 0.1 };

export interface DuckReading extends Reading {
  started: boolean;
  ended: boolean;
}

/**
 * Ducking, crouching or rolling under something: the head and the
 * shoulders drop together, whether the player bends their knees or bows
 * forward. Both must drop at least half the way, so a nod never counts.
 */
export class DuckDetector {
  private active = false;

  constructor(private options: DuckOptions = DEFAULT_DUCK) {}

  configure(options: DuckOptions): void {
    this.options = options;
  }

  reset(): void {
    this.active = false;
  }

  update(body: Body, reference: StandingReference): DuckReading {
    const { drop: need, speed, release, grow } = this.options;
    const head = (body.head.y - reference.headY) / reference.scale;
    const shoulders = (body.shoulders.y - reference.shoulderY) / reference.scale;
    const growth = Math.max(0, body.scale / reference.scale - 1);
    const both = Math.min(head, shoulders) >= need / 2;
    const drop = (both ? (head + shoulders) / 2 : Math.min(head, shoulders)) - growth * SIZE_SHIFT;
    const quick = body.velocity.head.y >= speed && drop >= need / 2;
    const steady = growth < grow;
    const was = this.active;
    this.active = steady || was ? hysteresis(was, quick ? need : drop, need, need * release) : false;
    const byDepth = ramp(drop, need / 2, need * 1.5);
    const bySpeed = quick ? ramp(body.velocity.head.y, speed / 2, speed * 1.5) : 0;
    return {
      active: this.active,
      amount: drop,
      confidence: Math.max(byDepth, bySpeed) * ramp(body.confidence, 0.4, 0.8),
      started: this.active && !was,
      ended: was && !this.active,
    };
  }
}
