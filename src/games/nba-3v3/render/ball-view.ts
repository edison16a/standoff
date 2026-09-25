import * as THREE from "three";
import type { Ball } from "../engine/types";
import { BALL } from "../engine/tuning";
import type { AthleteView } from "./athlete-view";
import { ballTexture } from "./textures";

const up = new THREE.Vector3(0, 1, 0);
const left = new THREE.Vector3();
const right = new THREE.Vector3();
const axis = new THREE.Vector3();
const spinQ = new THREE.Quaternion();

/**
 * The ball: pebbled leather with black seams, spinning with its flight.
 * While a player gathers it for a shot or rises for a dunk it sits in
 * their hands; when it leaves them it eases from the hands onto its
 * flight path, so the handoff never jumps.
 */
export class BallView {
  readonly mesh: THREE.Mesh;
  private readonly offset = new THREE.Vector3();
  private wasInHands = false;

  constructor() {
    const map = ballTexture();
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 32, 20), new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 }));
    this.mesh.castShadow = true;
  }

  update(ball: Ball, holder: AthleteView | null, dt: number): void {
    const act = holder?.athlete.action;
    const inHands = !!holder && !!act && (act.kind === "shoot" || act.kind === "drive");
    const target = new THREE.Vector3(ball.pos.x, ball.pos.y, ball.pos.z);
    if (inHands && holder) {
      holder.hand("L", left);
      holder.hand("R", right);
      // Two hands close together hold it between them; otherwise it sits in the right palm.
      if (left.distanceTo(right) < 0.42) target.copy(left).add(right).multiplyScalar(0.5);
      else target.copy(right);
      target.y += 0.02;
      this.offset.set(0, 0, 0);
    } else if (this.wasInHands) {
      // Just let go: start from where the hands were and blend onto the engine's path.
      this.offset.copy(this.mesh.position).sub(target);
    }
    this.wasInHands = inHands;
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

  dispose(): void {
    this.mesh.geometry.dispose();
    const m = this.mesh.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
