import * as THREE from "three";
import type { Ball } from "../engine/types";
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
    const act = holder?.athlete.action;
    const inHands = !!holder && !!act && (chest || act.kind === "shoot" || act.kind === "drive");
    const target = new THREE.Vector3(ball.pos.x, ball.pos.y, ball.pos.z);
    if (inHands && holder) {
      holder.hand("L", left);
      holder.hand("R", right);
      // Two hands close together hold it between them; otherwise it sits in the right palm.
      if (left.distanceTo(right) < 0.42) target.copy(left).add(right).multiplyScalar(0.5);
      else target.copy(right);
      target.y += 0.02;
    } else if (holder && act?.kind === "none") this.onDribble(holder, target);
    const travel = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z) * dt * 1.5;
    if (inHands !== this.wasInHands || target.distanceTo(this.lastTarget) > JUMP + travel) {
      // Let go, caught, or passed to another hand: start from where the ball was drawn and blend onto the new path.
      this.offset.copy(this.mesh.position).sub(target);
    }
    this.wasInHands = inHands;
    this.lastTarget.copy(target);
    this.offset.multiplyScalar(Math.exp(-dt * 14));
    this.mesh.position.copy(target).add(this.offset);

    // Roll with the motion: spin about the axis across the direction of travel.
    const speed = Math.hypot(ball.vel.x, ball.vel.z);
    if (speed > 0.05 || Math.abs(ball.spin) > 0.1) {
      axis.set(ball.vel.z, 0, -ball.vel.x).normalize();
      if (axis.lengthSq() < 0.5) axis.copy(up);
      const rate = ball.mode === "flight" ? ball.spin : speed / BALL.radius;
      spinQ.setFromAxisAngle(axis, rate * dt);
      this.mesh.quaternion.premultiply(spinQ);
    }
  }

  /**
   * The engine bounces the ball between the floor and hip height. Near
   * the top of the bounce the ball is drawn up into the dribbling palm,
   * wherever the animation has put it, so the hand really pushes it.
   */
  private onDribble(holder: AthleteView, target: THREE.Vector3): void {
    const a = holder.athlete;
    holder.hand("L", left);
    holder.hand("R", right);
    const k = Math.min(1, Math.max(0, (a.dribbleSide + 1) / 2));
    palm.copy(left).lerp(right, k);
    palm.y -= BALL.radius * 0.9;
    const drop = 1 - Math.abs(1 - 2 * a.dribble);
    const w = Math.pow(1 - drop, 3);
    target.lerp(palm, w);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const m = this.mesh.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
