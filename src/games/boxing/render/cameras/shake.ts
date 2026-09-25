import type * as THREE from "three";

/**
 * Camera shake that is struck and dies away: a big punch kicks it hard,
 * a jab barely. It wobbles the view's aim by a few small angles on smooth
 * sines rather than random jitter, so it reads as impact, not noise, and
 * plays back the same in the capture tool.
 */
export class Shake {
  private amount = 0;
  private time = 0;

  kick(strength: number): void {
    this.amount = Math.min(1.4, Math.max(this.amount, strength));
  }

  apply(camera: THREE.Camera, dt: number): void {
    this.time += dt;
    this.amount *= Math.exp(-dt * 7);
    if (this.amount < 0.002) return;
    const a = this.amount * 0.035;
    const t = this.time * 38;
    camera.rotateX(Math.sin(t) * a);
    camera.rotateY(Math.sin(t * 1.3 + 1.7) * a * 0.8);
    camera.rotateZ(Math.sin(t * 0.9 + 0.6) * a * 0.5);
  }
}
