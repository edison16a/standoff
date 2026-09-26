import * as THREE from "three";

/** Where the camera sits from its own fighter: behind, out past the left shoulder, and up. */
const BEHIND = 1.8;
const LEFT = 0.95;
const HEIGHT = 2.2;
/** It looks at the opponent's chest, so they stand in the middle of the view where the phone points at the start. */
const LOOK_HEIGHT = 1.3;
/** Pulls back as the fighters part, so both stay in the picture. */
const BACK_PER_METRE = 0.25;
const FOLLOW_PER_S = 6;

/**
 * One player's view: over the shoulder of their own fighter, looking at
 * the opponent. The sword arm is the right one, so the camera sits past
 * the left shoulder and the player's own blade is always in the picture.
 * It shakes when its fighter lands or takes a hit.
 */
export class ShoulderCamera {
  readonly camera = new THREE.PerspectiveCamera(52, 8 / 9, 0.1, 150);
  private readonly eye = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly wantEye = new THREE.Vector3();
  private readonly wantLook = new THREE.Vector3();
  private shakeUntil = 0;
  private shakeSize = 0;
  private snapped = false;

  /** `me` and `them` are the two fighters' places on the line; `floor` is how high they stand. */
  update(me: { x: number; facing: 1 | -1 }, themX: number, floor: number, dtMs: number, wallNow: number): void {
    const gap = Math.abs(themX - me.x);
    const back = BEHIND + BACK_PER_METRE * Math.max(0, gap - 1.6);
    this.wantEye.set(me.x - me.facing * back, floor + HEIGHT, -me.facing * LEFT);
    this.wantLook.set(themX, floor + LOOK_HEIGHT, 0);
    const k = this.snapped ? 1 - Math.exp((-FOLLOW_PER_S * dtMs) / 1000) : 1;
    this.snapped = true;
    this.eye.lerp(this.wantEye, k);
    this.look.lerp(this.wantLook, k);
    this.camera.position.copy(this.eye);
    if (wallNow < this.shakeUntil) {
      const left = (this.shakeUntil - wallNow) / 300;
      this.camera.position.x += Math.sin(wallNow / 17) * this.shakeSize * left;
      this.camera.position.y += Math.cos(wallNow / 23) * this.shakeSize * left;
    }
    this.camera.lookAt(this.look);
  }

  shake(size: number, wallNow: number): void {
    this.shakeSize = size;
    this.shakeUntil = wallNow + 300;
  }

  /** Jumps straight to place, as when a fight starts. */
  snap(): void {
    this.snapped = false;
  }
}
