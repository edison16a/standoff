import * as THREE from "three";
import type { Fighter } from "../../engine/fighter";
import { approach } from "../anim/curves";

/**
 * The television camera: a high, slow drifting shot that keeps every
 * fighter still standing in frame. It fills the spare quarter of a three
 * way split, the lobby and the showcase.
 */
export class ShowCamera {
  readonly camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 900);
  private readonly target = new THREE.Vector3();
  private radius = 30;
  private started = false;
  /** A fixed shot for stills: where the camera sits and what it looks at. */
  fixed: { from: THREE.Vector3; at: THREE.Vector3 } | null = null;

  setAspect(aspect: number): void {
    if (Math.abs(this.camera.aspect - aspect) < 1e-4) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  snap(): void {
    this.started = false;
  }

  update(fighters: readonly Fighter[], time: number, dt: number): void {
    if (this.fixed) {
      this.camera.position.copy(this.fixed.from);
      this.camera.lookAt(this.fixed.at);
      return;
    }
    const alive = fighters.filter((f) => f.alive);
    const list = alive.length > 0 ? alive : fighters;
    let cx = 0;
    let cz = 0;
    for (const f of list) {
      cx += f.pos.x / list.length;
      cz += f.pos.z / list.length;
    }
    // Far enough back to hold the two fighters furthest apart.
    let spread = 6;
    for (const a of list) for (const b of list) spread = Math.max(spread, Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z));
    const want = 10 + spread * 0.9;
    if (!this.started) {
      this.target.set(cx, 1, cz);
      this.radius = want;
      this.started = true;
    }
    this.target.x = approach(this.target.x, cx, 1.5, dt);
    this.target.z = approach(this.target.z, cz, 1.5, dt);
    this.radius = approach(this.radius, want, 1, dt);
    // The shot swings slowly from one side of the field to the other.
    const a = Math.PI / 2 + Math.sin(time * 0.07) * 0.9;
    this.camera.position.set(this.target.x + Math.cos(a) * this.radius, 4 + this.radius * 0.42, this.target.z + Math.sin(a) * this.radius * 0.6);
    this.camera.lookAt(this.target);
  }
}
