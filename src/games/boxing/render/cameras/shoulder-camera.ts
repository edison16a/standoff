import * as THREE from "three";
import { SpringVector } from "../anim/springs";
import { Shake } from "./shake";

/**
 * Where the camera sits from its boxer, in the boxer's own frame: behind,
 * out past the right shoulder and up. It sits far enough out that the
 * player's own boxer stands to the left of the picture and the opponent
 * is seen whole in the middle, gloves and all, so every wind up can be
 * read. A narrow split screen view sits a little closer in.
 */
const BEHIND = 1.35;
const SIDE = { wide: -0.95, narrow: -0.8 };
const HEIGHT = 1.95;
const LOOK_HEIGHT = 1.3;
/** The aim sits this far to the right of the opponent, so they fill the middle of the picture. */
const LOOK_RIGHT = { wide: 0.15, narrow: 0.12 };
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
    const shape = this.camera.aspect > 1.2 ? "wide" : "narrow";
    const back = BEHIND + 0.35 * Math.max(0, gap - 1.1) + 0.9 * down;
    const side = SIDE[shape];
    this.wantEye.set(me.x - fx * back - rx * side, HEIGHT + 0.6 * down, me.z - fz * back - rz * side);
    const right = LOOK_RIGHT[shape];
    this.wantLook.set(them.x + rx * right, LOOK_HEIGHT - 0.5 * down, them.z + rz * right);
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
