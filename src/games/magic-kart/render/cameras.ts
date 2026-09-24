import * as THREE from "three";
import type { Kart } from "../engine/kart";

/**
 * The lobby's television camera. It follows the leader of the demo race,
 * swinging slowly from one side of the kart to the other behind it. It
 * stays over the road, so it never ends up inside a hill or a tower.
 */
export class ShowCamera {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1400);
  private readonly target = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private started = false;

  /** Jumps straight to the next shot instead of gliding there, for a new map. */
  reset(): void {
    this.started = false;
  }

  follow(kart: Kart, time: number, dt: number): void {
    const a = kart.heading + Math.PI + Math.sin(time * 0.15) * 1.1;
    const wanted = new THREE.Vector3(kart.x + Math.sin(a) * 11, kart.y + 4.5 + Math.sin(time * 0.3) * 1.5, kart.z + Math.cos(a) * 11);
    const look = new THREE.Vector3(kart.x, kart.y + 1, kart.z);
    if (!this.started) {
      this.pos.copy(wanted);
      this.target.copy(look);
      this.started = true;
    }
    this.pos.lerp(wanted, Math.min(1, dt * 1.5));
    this.target.lerp(look, Math.min(1, dt * 4));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.target);
  }

  setAspect(aspect: number): void {
    if (Math.abs(this.camera.aspect - aspect) < 1e-3) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
