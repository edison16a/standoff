import * as THREE from "three";
import type { BallView } from "../../engine/view";
import { footballGeometry, laceBlurGeometry, orientBall } from "../models/football";
import type { Figure } from "./figure";

const pos = new THREE.Vector3();
const axis = new THREE.Vector3();
const turn = new THREE.Quaternion();
const normal = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** A knock this hard (newton seconds) flattens the ball by the most it will go. */
const SQUASH = { impulse: 2.5, most: 0.16, lasts: 0.07 } as const;

/**
 * The football on screen. Free, it is exactly the engine's rigid body:
 * its orientation, the spiral's spin, a duck's wobble, a kick's tumble.
 * A fast spin smears the laces round the ball the way a camera sees it,
 * and a hard knock off the turf or the posts squashes it along the hit
 * for a moment. Held, it sits in the carrier's hands. A spiked ball is
 * thrown down out of the hand and bounces away on its own.
 */
export class BallModel {
  readonly group = new THREE.Group();
  /** Turned so its y is the squash direction; the ball inside is turned back. */
  private readonly squash = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly blur: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly blurMaterial: THREE.MeshBasicMaterial;
  private readonly shadow: THREE.Mesh;
  private readonly last = new THREE.Quaternion();
  /** The spiked ball's own little flight: position, velocity and tumble. */
  private spike: { p: THREE.Vector3; v: THREE.Vector3; roll: number; spin: number; dir: THREE.Vector3 } | null = null;

  constructor() {
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02 });
    this.mesh = new THREE.Mesh(footballGeometry(), this.material);
    this.mesh.castShadow = true;
    this.blurMaterial = new THREE.MeshBasicMaterial({ color: "#f4efe2", transparent: true, opacity: 0, depthWrite: false });
    this.blur = new THREE.Mesh(laceBlurGeometry(), this.blurMaterial);
    this.mesh.add(this.blur);
    // A soft dark spot under the ball keeps its height readable high in the air.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.squash.add(this.mesh);
    this.group.add(this.squash, this.shadow);
  }

  /** `spiking` is true once the holder has let go of a spike. */
  update(ball: BallView, holder: Figure | null, spiking: boolean, dt: number): void {
    if (spiking && holder) return this.spiked(holder, dt);
    this.spike = null;
    const target = new THREE.Quaternion();
    if (holder) {
      holder.grip(pos, axis);
      orientBall(target, axis, 0);
    } else {
      pos.set(ball.x, Math.max(ball.y, 0.1), ball.z);
      // A dead ball lies on its side; free, it is exactly as the physics has it.
      if (ball.state === "dead") orientBall(target, axis.set(1, 0, 0), 0);
      else target.set(ball.quat.x, ball.quat.y, ball.quat.z, ball.quat.w);
    }
    this.place(pos, target, holder ? null : ball, dt);
  }

  /** Puts the ball at `p` turned to `q`, with the spin blur and the squash of the last knock. */
  private place(p: THREE.Vector3, q: THREE.Quaternion, ball: BallView | null, dt: number): void {
    this.squash.position.copy(p);
    // How far it turned since the last frame: past a third of a turn a frame the eye sees a blur.
    const swept = 2 * Math.acos(Math.min(1, Math.abs(this.last.dot(q))));
    this.last.copy(q);
    const blur = dt > 0 ? THREE.MathUtils.clamp((swept - 0.35) / 0.8, 0, 1) : 0;
    this.blurMaterial.opacity = blur * 0.32;
    this.blur.visible = blur > 0.02;
    const k = ball?.knock;
    const s = k && k.age < SQUASH.lasts ? Math.min(1, k.power / SQUASH.impulse) * SQUASH.most * (1 - k.age / SQUASH.lasts) : 0;
    if (s > 0.005 && k) {
      normal.set(k.n.x, k.n.y, k.n.z).normalize();
      this.squash.quaternion.setFromUnitVectors(UP, normal);
      this.squash.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
      this.mesh.quaternion.copy(turn.copy(this.squash.quaternion).invert().multiply(q));
    } else {
      this.squash.quaternion.identity();
      this.squash.scale.setScalar(1);
      this.mesh.quaternion.copy(q);
    }
    this.placeShadow(p);
  }

  private spiked(holder: Figure, dt: number): void {
    if (!this.spike) {
      holder.grip(pos, axis);
      const facing = holder.root.rotation.y;
      const dir = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
      this.spike = { p: pos.clone(), v: dir.clone().multiplyScalar(2).setY(-14), roll: 0, spin: 18, dir };
    }
    const s = this.spike;
    const step = Math.min(dt, 0.05);
    s.v.y -= 9.81 * step;
    s.p.addScaledVector(s.v, step);
    if (s.p.y < 0.1) {
      // Off the turf it pops high and tumbles, losing a bit of life each bounce.
      s.p.y = 0.1;
      s.v.y = Math.abs(s.v.y) > 1.5 ? Math.abs(s.v.y) * 0.55 : 0;
      s.v.x *= 0.7;
      s.v.z *= 0.7;
      s.spin *= 0.7;
    }
    s.roll += s.spin * step;
    const side = new THREE.Vector3().crossVectors(s.dir, UP);
    axis.copy(UP).applyAxisAngle(side, s.roll);
    this.place(s.p, orientBall(new THREE.Quaternion(), axis, 0), null, dt);
  }

  private placeShadow(p: THREE.Vector3): void {
    this.shadow.position.set(p.x, 0.015, p.z);
    const k = 1 / (1 + p.y * 0.15);
    this.shadow.scale.setScalar(k);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * k;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.blur.geometry.dispose();
    this.material.dispose();
    this.blurMaterial.dispose();
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
