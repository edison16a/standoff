import * as THREE from "three";
import { wrapAngle } from "@/games/kit/motion/math3d";
import type { Kart } from "../engine/kart";
import { DRIVE } from "../engine/tuning";

const BEHIND = 6.2;
const ABOVE = 2.7;
const BASE_FOV = 68;

/**
 * The camera behind one player's kart. It follows a smoothed heading
 * rather than the kart itself, so a spin out whirls the kart in view
 * instead of whirling the camera, and it widens a little at speed and
 * while boosting, which is most of what makes speed feel fast.
 */
export class ChaseCamera {
  readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.3, 1400);
  private heading: number | null = null;
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private fov = BASE_FOV;
  private shake = 0;

  /** A jolt from a hit or a hard landing, fading away over a moment. */
  bump(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  follow(kart: Kart, dt: number, snap = false): void {
    const speed = Math.hypot(kart.vx, kart.vz);
    // Track the direction of travel while spinning, the nose otherwise.
    const target = kart.timers.stun > 0 && speed > 2 ? Math.atan2(kart.vx, kart.vz) : kart.heading;
    if (this.heading === null || snap) this.heading = target;
    this.heading += wrapAngle(target - this.heading) * ease(dt, kart.timers.stun > 0 ? 2 : 5);
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const back = BEHIND + Math.min(1.5, speed * 0.03);
    const wanted = new THREE.Vector3(kart.x - fx * back, kart.y + ABOVE, kart.z - fz * back);
    const ahead = new THREE.Vector3(kart.x + fx * 5, kart.y + 1.2, kart.z + fz * 5);
    if (snap || this.pos.lengthSq() === 0) {
      this.pos.copy(wanted);
      this.look.copy(ahead);
    } else {
      // Height follows more slowly, so jumps lift the kart in frame.
      const k = ease(dt, 9);
      this.pos.x += (wanted.x - this.pos.x) * k;
      this.pos.z += (wanted.z - this.pos.z) * k;
      this.pos.y += (wanted.y - this.pos.y) * ease(dt, 4);
      this.look.lerp(ahead, ease(dt, 12));
    }
    this.shake = Math.max(0, this.shake - Math.min(0.05, dt) * 2.5);
    const jitter = this.shake * 0.25;
    this.camera.position.set(this.pos.x + (Math.random() - 0.5) * jitter, this.pos.y + (Math.random() - 0.5) * jitter, this.pos.z);
    this.camera.lookAt(this.look);
    const fov = BASE_FOV + Math.min(1.3, speed / DRIVE.topSpeed) * 6 + (kart.timers.boost > 0 ? 8 : 0);
    this.fov += (fov - this.fov) * ease(dt, 3);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  setAspect(aspect: number): void {
    if (Math.abs(this.camera.aspect - aspect) < 1e-3) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

/** How far to close a gap this frame, the same over time whatever the frame rate. */
function ease(dt: number, rate: number): number {
  return 1 - Math.exp(-rate * dt);
}
