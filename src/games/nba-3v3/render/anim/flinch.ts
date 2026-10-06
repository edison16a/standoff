import type { Pose } from "./pose";

/** How long a jolt takes to land and to wear off, seconds. */
const RISE = 0.05;
const FADE = 0.42;

/**
 * The body taking a hit: when two players collide each is jolted the
 * way he was pushed, the chest snapping with the push and the head
 * whipping after it, the arms flaring for balance and the knees giving,
 * then all of it settling. Harder hits jolt further.
 */
export class Flinch {
  private age = 9;
  private ahead = 0;
  private side = 0;
  private power = 0;

  /** A push `ahead` (+ forward) and `side` (+ to his left) in the player's own frame, unit length, of strength 0 to 1. */
  hit(ahead: number, side: number, power: number): void {
    // A second hit on top of one still showing takes over only if it is the harder.
    if (this.age < FADE && power < this.power * this.envelope()) return;
    this.age = 0;
    this.ahead = ahead;
    this.side = side;
    this.power = Math.min(1, power);
  }

  private envelope(): number {
    if (this.age < RISE) return this.age / RISE;
    return Math.max(0, 1 - (this.age - RISE) / FADE) ** 2;
  }

  apply(p: Pose, dt: number): Pose {
    this.age += dt;
    const k = this.envelope() * this.power;
    if (k <= 0) return p;
    // A shove from behind throws the chest forward; from the front, back. The head lags the chest.
    p.torsoX += this.ahead * 0.42 * k;
    p.neckX -= this.ahead * 0.3 * k;
    p.torsoZ -= this.side * 0.35 * k;
    p.neckZ += this.side * 0.22 * k;
    p.pelvisZ += this.side * 0.08 * k;
    p.armLRaise += 0.5 * k;
    p.armRRaise += 0.5 * k;
    p.armLSpread += 0.45 * k;
    p.armRSpread += 0.45 * k;
    p.kneeL += 0.3 * k;
    p.kneeR += 0.3 * k;
    p.legLLift += 0.15 * k;
    p.legRLift += 0.15 * k;
    return p;
  }
}
