import * as THREE from "three";
import type { BallView } from "../../engine/view";
import { footballGeometry, orientBall } from "../models/football";
import type { Figure } from "./figure";

const pos = new THREE.Vector3();
const axis = new THREE.Vector3();

/**
 * The football on screen. In the air it follows the engine's flight
 * exactly: its long axis, the wobble, and the spiral spin (or the end
 * over end tumble of a kick). Held, it sits in the carrier's hands as
 * the body animates. A spiked ball is thrown down out of the hand and
 * bounces away on its own, since the engine keeps it with the scorer.
 */
export class BallModel {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly shadow: THREE.Mesh;
  /** The spiked ball's own little flight: position, velocity and tumble. */
  private spike: { p: THREE.Vector3; v: THREE.Vector3; roll: number; spin: number; dir: THREE.Vector3 } | null = null;

  constructor() {
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02 });
    this.mesh = new THREE.Mesh(footballGeometry(), this.material);
    this.mesh.castShadow = true;
    // A soft dark spot under the ball keeps its height readable high in the air.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.group.add(this.mesh, this.shadow);
  }

  /** `spiking` is true once the holder has let go of a spike. */
  update(ball: BallView, holder: Figure | null, spiking: boolean, dt: number): void {
    if (spiking && holder) return this.spiked(holder, dt);
    this.spike = null;
    if (holder) {
      holder.grip(pos, axis);
      this.mesh.position.copy(pos);
      orientBall(this.mesh.quaternion, axis, 0);
    } else {
      this.mesh.position.set(ball.x, Math.max(ball.y, 0.1), ball.z);
      axis.set(ball.axis.x, ball.axis.y, ball.axis.z);
      // A dead ball lies on its side; in the air it rolls about its axis, a tumbling kick already turns its axis.
      if (ball.state === "dead") axis.set(1, 0, 0);
      orientBall(this.mesh.quaternion, axis, ball.style === "spiral" ? ball.roll : 0);
    }
    this.placeShadow();
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
    this.mesh.position.copy(s.p);
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(s.dir, up);
    axis.copy(up).applyAxisAngle(side, s.roll);
    orientBall(this.mesh.quaternion, axis, 0);
    this.placeShadow();
  }

  private placeShadow(): void {
    const h = this.mesh.position.y;
    this.shadow.position.set(this.mesh.position.x, 0.015, this.mesh.position.z);
    const k = 1 / (1 + h * 0.15);
    this.shadow.scale.setScalar(k);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * k;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
