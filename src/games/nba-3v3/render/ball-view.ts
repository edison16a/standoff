import * as THREE from "three";
import type { Ball } from "../engine/types";
import { palmHold, spinCarry } from "../engine/dribble-ball";
import { BALL } from "../engine/tuning";
import type { AthleteView } from "./athlete-view";
import { ballTexture } from "./textures";

const up = new THREE.Vector3(0, 1, 0);
const left = new THREE.Vector3();
const right = new THREE.Vector3();
const palm = new THREE.Vector3();
const axis = new THREE.Vector3();
const spinQ = new THREE.Quaternion();

/** A jump in the engine's ball bigger than this in one frame is a change of hands, eased rather than shown. */
const JUMP = 0.35;

/**
 * The ball: pebbled leather with black seams, spinning with its flight.
 * In a shot, a dunk or a check it sits between the hands. On the
 * dribble it meets the dribbling palm at the top of every bounce. When
 * it leaves the hands, or changes hands, it eases from where it was
 * onto the engine's path, so a handoff never jumps.
 */
export class BallView {
  readonly mesh: THREE.Mesh;
  private readonly offset = new THREE.Vector3();
  private readonly lastTarget = new THREE.Vector3();
  private wasInHands = false;

  constructor() {
    const map = ballTexture();
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 32, 20), new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 }));
    this.mesh.castShadow = true;
  }

  /** `chest` is true while the holder has it in both hands at the chest, as in a check. */
  update(ball: Ball, holder: AthleteView | null, chest: boolean, dt: number): void {
    const a = holder?.athlete;
    const act = a?.action;
    const carry = !!a && spinCarry(a);
    const inHands = !!holder && !!act && !carry && (chest || act.kind === "shoot" || act.kind === "drive" || palmHold(holder.athlete));
    const target = new THREE.Vector3(ball.pos.x, ball.pos.y, ball.pos.z);
    if (carry && holder && a) {
      // Pulled round through a spin, the ball rides in the dribbling palm.
      holder.hand(a.dribbleHand === 1 ? "R" : "L", palm);
      target.copy(palm);
      target.y -= BALL.radius * 0.8;
    } else if (inHands && holder) {
      holder.hand("L", left);
      holder.hand("R", right);
      // Two hands close together hold it between them; otherwise it sits in the right palm.
      if (left.distanceTo(right) < 0.42) target.copy(left).add(right).multiplyScalar(0.5);
      else target.copy(right);
      target.y += 0.02;
    } else if (holder && (act?.kind === "none" || act?.kind === "move")) this.onDribble(holder, target);
    const travel = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z) * dt * 1.5;
    const held = inHands || carry;
    if (held !== this.wasInHands || target.distanceTo(this.lastTarget) > JUMP + travel) {
      // Let go, caught, or passed to another hand: start from where the ball was drawn and blend onto the new path.
      this.offset.copy(this.mesh.position).sub(target);
    }
    this.wasInHands = held;
    this.lastTarget.copy(target);
    this.offset.multiplyScalar(Math.exp(-dt * 14));
    this.mesh.position.copy(target).add(this.offset);

    // Roll with the motion: spin about the axis across the direction of travel.
    const speed = Math.hypot(ball.vel.x, ball.vel.z);
    // Held, it turns with the hands rather than rolling.
    if (!held && (speed > 0.05 || Math.abs(ball.spin) > 0.1)) {
      axis.set(ball.vel.z, 0, -ball.vel.x).normalize();
      if (axis.lengthSq() < 0.5) axis.copy(up);
      const rate = ball.mode === "flight" ? ball.spin : speed / BALL.radius;
      spinQ.setFromAxisAngle(axis, rate * dt);
      this.mesh.quaternion.premultiply(spinQ);
    }
  }

  /**
   * The engine bounces the ball between the floor and hip height and
   * says where it meets the floor. The drawn ball runs in a straight
   * line from wherever the animation has put the dribbling palm down to
   * that spot and back up, and tops out right under the palm, so the
   * hand really pushes it and really catches it.
   */
  private onDribble(holder: AthleteView, target: THREE.Vector3): void {
    const a = holder.athlete;
    holder.hand("L", left);
    holder.hand("R", right);
    const k = Math.min(1, Math.max(0, (a.dribbleSide + 1) / 2));
    palm.copy(left).lerp(right, k);
    palm.y -= BALL.radius * 0.9;
    const drop = 1 - Math.abs(1 - 2 * a.dribble);
    const floor = BALL.radius;
    target.x = palm.x + (target.x - palm.x) * drop;
    target.z = palm.z + (target.z - palm.z) * drop;
    target.y = floor + (Math.max(floor, palm.y) - floor) * (1 - drop * drop);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const m = this.mesh.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
