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
const FOV = 52;
/** The final hit's slow motion closes in this far. */
const ZOOM_FOV = 36;
/** The winner's own camera swings round in front of them to watch them celebrate. */
const CELEBRATE = { ahead: 2.6, side: 1.5, height: 1.75, look: 1.35 };

/**
 * One player's view: over the shoulder of their own fighter, looking at
 * the opponent. The sword arm is the right one, so the camera sits past
 * the left shoulder and the player's own blade is always in the picture.
 * It shakes when its fighter lands or takes a hit, closes in on the final
 * hit, and for the winner swings round to face them as they celebrate.
 */
export class ShoulderCamera {
  readonly camera = new THREE.PerspectiveCamera(FOV, 8 / 9, 0.1, 150);
  private readonly eye = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly wantEye = new THREE.Vector3();
  private readonly wantLook = new THREE.Vector3();
  private readonly swing = new THREE.Vector3();
  private shakeUntil = 0;
  private shakeSize = 0;
  private snapped = false;
  private zoom = 0;
  private zoomTarget = 0;
  private celebrate = 0;
  private celebrateTarget = 0;
  /** Where the final hit landed, which the zoom closes in on. */
  private readonly focus = new THREE.Vector3();

  /** `me` and `them` are the two fighters' places on the line; `floor` is how high they stand. */
  update(me: { x: number; facing: 1 | -1 }, themX: number, floor: number, dtMs: number, wallNow: number): void {
    const gap = Math.abs(themX - me.x);
    const back = (BEHIND + BACK_PER_METRE * Math.max(0, gap - 1.6)) * (1 - 0.3 * this.zoom);
    this.wantEye.set(me.x - me.facing * back, floor + HEIGHT - 0.25 * this.zoom, -me.facing * LEFT);
    this.wantLook.set(themX, floor + LOOK_HEIGHT, 0).lerp(this.focus, this.zoom * 0.7);
    if (this.celebrate > 0.001) {
      // Round in front of our own fighter, a little to their left, looking back at them.
      const k = this.celebrate * this.celebrate * (3 - 2 * this.celebrate);
      this.swing.set(me.x + me.facing * CELEBRATE.ahead, floor + CELEBRATE.height, -me.facing * CELEBRATE.side);
      this.wantEye.lerp(this.swing, k);
      this.wantLook.lerp(this.swing.set(me.x, floor + CELEBRATE.look, 0), k);
    }
    const dt = dtMs / 1000;
    const k = this.snapped ? 1 - Math.exp(-FOLLOW_PER_S * dt) : 1;
    this.snapped = true;
    this.eye.lerp(this.wantEye, k);
    this.look.lerp(this.wantLook, k);
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-dt * (this.zoomTarget > this.zoom ? 7 : 2.5)));
    this.celebrate += (this.celebrateTarget - this.celebrate) * (1 - Math.exp(-dt * 1.4));
    const fov = FOV + (ZOOM_FOV - FOV) * this.zoom;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
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

  /** Closes in on `at` for the final hit, or backs out again with null. */
  closeIn(at: THREE.Vector3 | null): void {
    if (at) this.focus.copy(at);
    this.zoomTarget = at ? 1 : 0;
  }

  /** Swings round to watch our own fighter celebrate, or back behind them. */
  setCelebrating(on: boolean): void {
    this.celebrateTarget = on ? 1 : 0;
  }

  /** Jumps straight to place, as when a fight starts. */
  snap(): void {
    this.snapped = false;
    this.zoom = this.zoomTarget = 0;
    this.celebrate = this.celebrateTarget = 0;
  }
}
