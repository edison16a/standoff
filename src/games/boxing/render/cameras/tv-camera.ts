import * as THREE from "three";
import { Shake } from "./shake";

export interface Spot {
  x: number;
  z: number;
}

/**
 * The broadcast camera, for everything that is not a player's own view:
 * the walk out before the first bell, the knockout replay, the winner and
 * the showcase. Each shot is placed fresh every frame from the boxers'
 * spots, so it never needs smoothing and replays the same every time.
 */
export class TvCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly shake = new Shake();
  private readonly target = new THREE.Vector3();

  constructor(fov = 38) {
    // A near plane well out from the lens clips away a rope passing just in front of it,
    // as a broadcast camera shooting between the ropes would.
    this.camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.4, 140);
  }

  setAspect(aspect: number): void {
    if (this.camera.aspect === aspect) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setFov(fov: number): void {
    if (this.camera.fov === fov) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Side on to the line between the boxers, swung round by `swing`
   * radians, `distance` metres out and `height` up, aimed between them.
   * `bias` slides the aim toward boxer b (1) or a (0).
   */
  sideOn(a: Spot, b: Spot, swing: number, distance: number, height: number, lookY = 1.3, bias = 0.5): void {
    const mx = a.x + (b.x - a.x) * bias;
    const mz = a.z + (b.z - a.z) * bias;
    const along = Math.atan2(b.x - a.x, b.z - a.z);
    const angle = along + Math.PI / 2 + swing;
    this.camera.position.set(mx + Math.sin(angle) * distance, height, mz + Math.cos(angle) * distance);
    this.target.set(mx, lookY, mz);
    this.camera.lookAt(this.target);
  }

  /** Circles a point, as for the winner's celebration or the icon. */
  orbit(centre: Spot, angle: number, distance: number, height: number, lookY: number): void {
    this.camera.position.set(centre.x + Math.sin(angle) * distance, height, centre.z + Math.cos(angle) * distance);
    this.target.set(centre.x, lookY, centre.z);
    this.camera.lookAt(this.target);
  }

  finish(dt: number): void {
    this.shake.apply(this.camera, dt);
  }
}
