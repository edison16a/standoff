import * as THREE from "three";
import type { Kart } from "../engine/kart";

/**
 * The lobby's television camera. It follows the race leader of the demo
 * race from the side, slowly circling, so the map picker has the chosen
 * map alive behind it.
 */
export class ShowCamera {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1400);
  private readonly target = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private started = false;

  follow(kart: Kart, time: number, dt: number): void {
    const a = time * 0.12;
    const wanted = new THREE.Vector3(kart.x + Math.cos(a) * 16, kart.y + 6 + Math.sin(time * 0.3) * 2, kart.z + Math.sin(a) * 16);
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
