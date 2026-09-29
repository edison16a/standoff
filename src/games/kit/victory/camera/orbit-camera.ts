import type * as THREE from "three";
import { DEFAULT_ORBIT, orbitPose, type OrbitShot } from "./orbit";

/**
 * Drives a three.js camera round a winner with `orbitPose`. Start a shot
 * with `play`, then call `update` every frame. Time only moves by the
 * frames' dt, so a capture that steps frames gets the same shot.
 */
export class OrbitCamera {
  shot: OrbitShot;
  private t = 0;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    shot: Partial<OrbitShot> = {},
  ) {
    this.shot = { ...DEFAULT_ORBIT, ...shot };
  }

  /** Starts a new shot from its opening. */
  play(shot: Partial<OrbitShot> = {}): void {
    this.shot = { ...this.shot, ...shot };
    this.t = 0;
    this.apply();
  }

  /** Seconds into the current shot. */
  get time(): number {
    return this.t;
  }

  update(dt: number): void {
    this.t += Math.min(0.1, Math.max(0, dt));
    this.apply();
  }

  private apply(): void {
    const pose = orbitPose(this.shot, this.t);
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  }
}
