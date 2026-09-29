import type * as THREE from "three";
import { orbitPose, type OrbitShot } from "./orbit";

/**
 * Drives a three.js camera round an orbit shot. Change the shot any time,
 * as when the winner walks to the middle; the clock keeps running.
 *
 *   const orbit = new OrbitCamera(camera, { centre: { x: 0, z: 0 }, radius: 4, height: 1.6, lookHeight: 1.3 });
 *   orbit.update(dt);   // every frame
 */
export class OrbitCamera {
  time = 0;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    public shot: OrbitShot,
  ) {
    this.update(0);
  }

  /** Starts the opening move again. */
  restart(): void {
    this.time = 0;
  }

  update(dt: number): void {
    this.time += dt;
    const pose = orbitPose(this.shot, this.time);
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  }
}
