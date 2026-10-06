import * as THREE from "three";
import { BALL } from "../../engine/tuning";
import type { BallView } from "../../engine/view";
import { panelTexture } from "./ball-texture";

/** How the drawn ball gives when something changes its course. */
const SQUASH = {
  /** Squash for each m/s the velocity jumps by in one frame, and the most it ever squashes. */
  perSpeed: 0.008,
  max: 0.2,
  /** Seconds to spring back, and how fast it wobbles as it does. */
  decay: 0.05,
  ring: 55,
  /** A jump smaller than this between frames is just gravity and the air. */
  threshold: 3,
} as const;

let sharedTexture: THREE.CanvasTexture | null = null;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The match ball. It turns by the spin the simulation gives it, so a
 * rolling pass rolls, a driven shot spins backward, a curler turns on
 * its side and a knuckleball barely turns at all. A kick, a bounce or a
 * post squashes it along the blow for a moment. It throws a soft blob of
 * shadow on the turf that shrinks as it rises.
 */
export class BallModel {
  readonly group = new THREE.Group();
  /** Turned so its up runs along the last blow, then squashed along it. */
  private readonly body = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly last = new THREE.Vector3();
  private readonly lastVel = new THREE.Vector3();
  /** The ball's own turn in the world, kept apart from the squash's frame. */
  private readonly turn = new THREE.Quaternion();
  private readonly step = new THREE.Quaternion();
  private readonly axis = new THREE.Vector3();
  private readonly blow = new THREE.Vector3(0, 1, 0);
  private readonly unturn = new THREE.Quaternion();
  private squash = 0;
  private squashT = 1;
  private fresh = true;

  constructor(shadowTexture: THREE.Texture) {
    sharedTexture ??= panelTexture();
    const material = new THREE.MeshStandardMaterial({ map: sharedTexture, roughness: 0.38, metalness: 0.02 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 32, 20), material);
    this.mesh.castShadow = true;
    this.body.add(this.mesh);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.55, color: "#000000" }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 2;
    this.group.add(this.body, this.shadow);
  }

  update(ball: BallView, dt: number): void {
    const pos = new THREE.Vector3(ball.x, ball.y, ball.z);
    const vel = new THREE.Vector3(ball.vx, ball.vy, ball.vz);
    const moved = pos.distanceTo(this.last);
    // A cut in a replay or a reset: nothing to turn or squash across it.
    const jump = this.fresh || moved > 3;
    this.fresh = false;
    // The ball's own clock: the way it moved over its speed, so slow motion turns it slowly too.
    const speed = vel.length();
    const tau = jump ? 0 : speed > 0.5 ? Math.min(0.1, moved / speed) : dt;
    const w = Math.hypot(ball.sx, ball.sy, ball.sz);
    if (w > 1e-3 && tau > 0) {
      this.axis.set(ball.sx / w, ball.sy / w, ball.sz / w);
      this.step.setFromAxisAngle(this.axis, w * tau);
      this.turn.premultiply(this.step).normalize();
    }
    this.hit(vel, jump, dt);
    this.last.copy(pos);
    this.body.position.copy(pos);
    const size = 0.34 + ball.y * 0.12;
    this.shadow.position.set(ball.x, 0.012, ball.z);
    this.shadow.scale.setScalar(size);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.6 - ball.y * 0.12);
  }

  /** A sudden change of velocity is a blow: squash along it, then spring back with a little wobble. */
  private hit(vel: THREE.Vector3, jump: boolean, dt: number): void {
    const change = vel.clone().sub(this.lastVel);
    const kick = change.length();
    this.lastVel.copy(vel);
    this.squashT += dt;
    const now = this.squash * Math.exp(-this.squashT / SQUASH.decay);
    if (!jump && kick > SQUASH.threshold && kick * SQUASH.perSpeed > Math.abs(now)) {
      this.blow.copy(change).normalize();
      this.squash = Math.min(SQUASH.max, kick * SQUASH.perSpeed);
      this.squashT = 0;
    }
    const a = this.squash * Math.exp(-this.squashT / SQUASH.decay) * Math.cos(SQUASH.ring * this.squashT);
    this.body.quaternion.setFromUnitVectors(UP, this.blow);
    // Same volume: shorter along the blow, fatter across it.
    this.body.scale.set(1 + a / 2, 1 - a, 1 + a / 2);
    this.unturn.copy(this.body.quaternion).invert();
    this.mesh.quaternion.copy(this.unturn).multiply(this.turn);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
