import * as THREE from "three";
import { SpringVector } from "../anim/springs";
import { Shake } from "./shake";

/** Where the camera sits from its boxer, in the boxer's own frame: behind, over the right shoulder and up. */
const BEHIND = 1.5;
const SIDE = -0.68;
const HEIGHT = 1.86;
const LOOK_HEIGHT = 1.3;
/** How far from the middle the camera may go, inside the ropes. */
const INSIDE = 2.55;

/**
 * The console boxing view for one player: behind and above their own
 * boxer's shoulder, looking past them at the opponent. It follows the
 * boxers as they circle, leans in a little when they close, and shakes
 * when its boxer lands or takes a big punch.
 */
export class ShoulderCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly shake = new Shake();
  private readonly eye = new SpringVector();
  private readonly look = new SpringVector();
  private readonly wantEye = new THREE.Vector3();
  private readonly wantLook = new THREE.Vector3();

  constructor(fov: number) {
    this.camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 120);
  }

  /** `me` and `them` are the boxers' spots on the canvas; `down` lifts the camera during a knockdown. */
  update(me: { x: number; z: number }, them: { x: number; z: number }, dt: number, down: number): void {
    const dx = them.x - me.x;
    const dz = them.z - me.z;
    const gap = Math.max(0.3, Math.hypot(dx, dz));
    const fx = dx / gap;
    const fz = dz / gap;
    // The boxer's right is the forward direction turned a quarter to the right.
    const rx = -fz;
    const rz = fx;
    const back = BEHIND + 0.35 * Math.max(0, gap - 1.1) + 0.9 * down;
    this.wantEye.set(me.x - fx * back - rx * SIDE, HEIGHT + 0.6 * down, me.z - fz * back - rz * SIDE);
    // Aimed a little to the right of the opponent, so our own boxer sits to the left of the picture.
    this.wantLook.set(me.x + fx * gap * 0.75 + rx * 0.12, LOOK_HEIGHT - 0.5 * down, me.z + fz * gap * 0.75 + rz * 0.12);
    // Never outside the ropes: a rope right in front of the lens fills the picture.
    this.wantEye.x = Math.max(-INSIDE, Math.min(INSIDE, this.wantEye.x));
    this.wantEye.z = Math.max(-INSIDE, Math.min(INSIDE, this.wantEye.z));
    const eye = this.eye.update(this.wantEye, dt, 2.2);
    const look = this.look.update(this.wantLook, dt, 3);
    this.camera.position.copy(eye);
    this.camera.lookAt(look);
    this.shake.apply(this.camera, dt);
  }

  /** Jumps straight to the right place, as when a fight starts. */
  snap(): void {
    this.eye.snap(this.wantEye);
    this.look.snap(this.wantLook);
  }

  setAspect(aspect: number): void {
    if (this.camera.aspect === aspect) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
