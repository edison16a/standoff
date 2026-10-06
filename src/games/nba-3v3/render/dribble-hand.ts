import * as THREE from "three";
import { dribbleRate } from "../engine/dribble-ball";
import { CATCH, handSpot, phaseGap } from "../engine/dribble-path";
import { BALL } from "../engine/physics/ball-spec";
import type { Athlete, Ball } from "../engine/types";

/** How quickly the hand closes on where it should be: quick enough to ride the push, smooth enough to rise without a snap. */
const OMEGA = 34;

/**
 * Where the dribbling palm belongs, frame by frame, so the drawn hand
 * truly meets the ball. While the hand is on the ball it rides on top of
 * the ball the physics moves; once the ball is gone it rises to wait
 * where the engine will catch it next. A spring joins the two, so the
 * hand comes up off the push smoothly. Each hand fades in and out as the
 * ball moves between them.
 */
export class DribbleHand {
  /** The palm's goal in the world. */
  readonly target = new THREE.Vector3();
  /** How much each hand reaches for the ball rather than following the pose, 0 to 1. */
  weight = { L: 0, R: 0 };
  private readonly vel = new THREE.Vector3();
  private readonly goal = new THREE.Vector3();
  private fresh = true;

  update(a: Athlete, ball: Ball | null, active: boolean, dt: number): void {
    const k = 1 - Math.exp(-dt * 14);
    this.weight.R += ((active && a.dribbleHand === 1 ? 1 : 0) - this.weight.R) * k;
    this.weight.L += ((active && a.dribbleHand === -1 ? 1 : 0) - this.weight.L) * k;
    if (!active || !ball) {
      this.fresh = true;
      return;
    }
    const lift = BALL.radius * 0.85;
    if (ball.hand === "dribble") {
      this.goal.set(ball.pos.x, ball.pos.y + lift, ball.pos.z);
    } else {
      // The hand waits over where the ball will meet it, but only a moment ahead, so it stays with the body rather than reaching out.
      const gap = phaseGap(a.dribble, CATCH, dribbleRate(a, Math.hypot(a.vx, a.vz)));
      const spot = handSpot(a, a.dribbleSide, Math.min(gap, 0.06));
      this.goal.set(spot.x, spot.y + lift, spot.z);
    }
    if (this.fresh) {
      this.target.copy(this.goal);
      this.vel.set(0, 0, 0);
      this.fresh = false;
      return;
    }
    // A critically damped spring, stepped exactly so a slow frame never overshoots.
    const decay = Math.exp(-OMEGA * dt);
    for (const c of ["x", "y", "z"] as const) {
      const off = this.target[c] - this.goal[c];
      const push = (this.vel[c] + OMEGA * off) * dt;
      this.vel[c] = (this.vel[c] - OMEGA * push) * decay;
      this.target[c] = this.goal[c] + (off + push) * decay;
    }
  }
}
