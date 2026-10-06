import * as THREE from "three";
import type { Athlete, Ball } from "../engine/types";

/** Within this much of full stretch past the arm's reach, a jumping defender's hand goes for the ball. */
const SEEK = 0.7;
/** A touch is shown this long: the hand through the ball, then easing back into the jump. */
const SHOW = 0.34;

const shoulder = new THREE.Vector3();
const toBall = new THREE.Vector3();

export interface BlockTouch {
  at: { x: number; y: number; z: number };
  tip: boolean;
}

/**
 * A shot blocker's hand on the real ball. Up in the air with a shot or
 * a pass coming by, the nearer hand reaches for the ball, so it is there
 * when the engine says it touched. A swat then follows through the
 * ball, down and away the way it was sent; a fingertip only flicks up
 * and lets it go. Weighs nothing outside a block jump.
 */
export class BlockReach {
  /** Where the reaching palm should be, the arm doing it, and how much (0 to 1). */
  readonly target = new THREE.Vector3();
  side: "L" | "R" = "R";
  weight = 0;
  private touch: (BlockTouch & { age: number; dir: THREE.Vector3 }) | null = null;

  /** The engine's block: where the hand met the ball, and which way the ball went off. */
  hit(a: Athlete, t: BlockTouch, ballVel: { x: number; y: number; z: number }): void {
    const dir = new THREE.Vector3(ballVel.x, 0, ballVel.z);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    this.touch = { ...t, age: 0, dir };
    // A touch nobody saw coming (a pass knocked away) uses the hand on the ball's side.
    if (this.weight < 0.3) this.side = (t.at.x - a.x) * Math.cos(a.yaw) - (t.at.z - a.z) * Math.sin(a.yaw) >= 0 ? "L" : "R";
  }

  update(a: Athlete, ball: Ball | null, chest: THREE.Vector3, reach: number, dt: number): void {
    let want = 0;
    if (this.touch) {
      const k = (this.touch.age += dt) / SHOW;
      if (k >= 1) this.touch = null;
      else {
        // The swat carries on down and through; a fingertip flicks a little up and away.
        const through = this.touch.tip ? 0.12 : 0.45;
        const drop = this.touch.tip ? -0.08 : 0.35;
        const go = Math.sin(Math.min(1, k * 2) * Math.PI * 0.5);
        this.target.set(this.touch.at.x, this.touch.at.y, this.touch.at.z).addScaledVector(this.touch.dir, through * go);
        this.target.y -= drop * go;
        want = 1 - Math.max(0, (k - 0.5) / 0.5);
      }
    } else if (ball && a.action.kind === "block" && a.y > 0.05 && ball.mode === "flight") {
      shoulder.copy(chest);
      toBall.set(ball.pos.x, ball.pos.y, ball.pos.z).sub(shoulder);
      const gap = toBall.length() - reach;
      if (gap < SEEK && ball.pos.y > shoulder.y) {
        this.target.set(ball.pos.x, ball.pos.y, ball.pos.z);
        // The hand on the ball's side of him goes; his left is (cos yaw, -sin yaw).
        this.side = toBall.x * Math.cos(a.yaw) - toBall.z * Math.sin(a.yaw) >= 0 ? "L" : "R";
        want = Math.min(1, Math.max(0, 1 - gap / SEEK)) ** 0.7;
      }
    }
    this.weight += (want - this.weight) * (1 - Math.exp(-dt * (want > this.weight ? 30 : 10)));
  }
}
