import * as THREE from "three";
import { RIM } from "../engine/tuning";
import { clamp, lerp } from "../engine/vec";

export interface Shot {
  /** Where the play is: the ball, or the player with it. */
  focus: { x: number; y: number; z: number };
  /** A player flying at the rim, for the close up, or null. */
  dunker: { x: number; z: number } | null;
  /** The middle of the winning team once the game is over, or null. */
  winners: { x: number; z: number } | null;
  /** Seconds into the opening sweep, or null once it is done. */
  intro: number | null;
}

const BROADCAST = { y: 6.4, z: 17.6, fov: 36 };

// Scratch vectors, reused every frame so the camera makes no garbage.
const wantPos = new THREE.Vector3();
const wantLook = new THREE.Vector3();
const scratch = new THREE.Vector3();
const INTRO_POS = new THREE.Vector3(-14, 15, 2);
const INTRO_LOOK = new THREE.Vector3(0, 2.2, 1.6);

/**
 * The broadcast camera. It sits high behind the top of the key like a
 * TV end camera, pans with the ball and leans in as play gets near the
 * rim. It swoops in for dunks, shakes on big slams, opens each game with
 * a sweep over the arena, and circles the winners at the end.
 */
export class TvCamera {
  readonly camera = new THREE.PerspectiveCamera(BROADCAST.fov, 16 / 9, 0.1, 160);
  private readonly pos = new THREE.Vector3(0, BROADCAST.y, BROADCAST.z);
  private readonly look = new THREE.Vector3(0, 1.6, 4.5);
  private close = 0;
  private closeSide = 1;
  private shakeLeft = 0;
  private shakePower = 0;
  private orbit = 0;
  private aspect = 16 / 9;
  /** A locked framing, for the showcase's hero shots. */
  fixed: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } | null = null;

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  shake(power: number, seconds = 0.45): void {
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeLeft = Math.max(this.shakeLeft, seconds);
  }

  /** Jumps straight to the framing, for the first frame or after a cut. */
  snap(shot: Shot): void {
    this.update(shot, 10, 0);
  }

  update(shot: Shot, dt: number, time: number): void {
    if (this.fixed) {
      this.camera.position.copy(this.fixed.pos);
      this.camera.lookAt(this.fixed.look);
      this.camera.fov = this.fixed.fov;
      this.camera.updateProjectionMatrix();
      return;
    }
    const k = (rate: number) => 1 - Math.exp(-rate * Math.min(dt, 0.25));
    // Narrow screens need to see the corners, so they pull back a little.
    const wide = clamp((16 / 9) / this.aspect, 1, 1.6);
    const fx = clamp(shot.focus.x * 0.5, -3, 3);
    const fz = clamp(shot.focus.z, 1.2, 10);
    const near = clamp((fz - 1.5) / 7.5, 0, 1);
    wantPos.set(fx * 0.75, BROADCAST.y * wide - (1 - near) * 0.6, BROADCAST.z * wide - (1 - near) * 1.2);
    wantLook.set(fx * 0.85, 1.9, lerp(3.4, 5.4, near));

    this.close += ((shot.dunker ? 1 : 0) - this.close) * k(shot.dunker ? 5 : 2.2);
    if (shot.dunker) this.closeSide = shot.dunker.x >= 0 ? 1 : -1;
    if (this.close > 0.01) {
      wantPos.lerp(scratch.set(this.closeSide * 3.4, 3.4, 7.4), this.close);
      wantLook.lerp(scratch.set(RIM.x + this.closeSide * 0.3, 2.7, RIM.z + 0.6), this.close);
    }
    if (shot.winners) {
      this.orbit += dt * 0.22;
      const cx = shot.winners.x;
      const cz = shot.winners.z;
      wantPos.set(cx + Math.sin(this.orbit) * 7.5, 3.6, cz + Math.cos(this.orbit) * 7.5 + 1);
      wantLook.set(cx, 1.4, cz);
    }
    if (shot.intro !== null) {
      // Open high over the far stands and swing down to the broadcast spot.
      const u = clamp(shot.intro / 2.8, 0, 1);
      const e = u * u * (3 - 2 * u);
      wantPos.lerpVectors(INTRO_POS, scratch.copy(wantPos), e);
      wantLook.lerpVectors(INTRO_LOOK, scratch.copy(wantLook), e);
    }
    const rate = shot.winners ? 1.5 : shot.intro !== null ? 20 : 3;
    this.pos.lerp(wantPos, k(rate));
    this.look.lerp(wantLook, k(rate * 1.3));
    this.camera.position.copy(this.pos);
    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    if (this.shakeLeft > 0) {
      const a = this.shakePower * (this.shakeLeft / 0.45) * 0.12;
      this.camera.position.x += Math.sin(time * 71) * a;
      this.camera.position.y += Math.cos(time * 57) * a;
    } else this.shakePower = 0;
    this.camera.lookAt(this.look);
    const fov = lerp(BROADCAST.fov, 44, this.close) + (shot.winners ? 6 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * k(4);
      this.camera.updateProjectionMatrix();
    }
  }
}
