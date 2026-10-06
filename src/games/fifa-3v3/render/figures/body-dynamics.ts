import type * as THREE from "three";
import type { Pose } from "../anim/pose";

/**
 * What the body's own momentum does to its pose. A player speeding up
 * leans into the run; one braking hard sits back on the heels with the
 * arms out front; one cutting banks into the turn like a bike, the feet
 * staying planted under the lean. Running hard also leaves them
 * blowing, so the chest heaves faster and deeper for a while after.
 */

const G = 9.81;
/** How quickly the felt velocity and acceleration follow the real ones, in seconds. */
const SMOOTH_V = 0.06;
const SMOOTH_A = 0.14;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class BodyDynamics {
  private x = 0;
  private z = 0;
  private vx = 0;
  private vz = 0;
  private ax = 0;
  private az = 0;
  private seen = false;
  /** 0 fresh to 1 blowing hard. */
  private exertion = 0;
  private breathPhase: number;
  /** The acceleration along and across the body, metres a second squared. */
  forward = 0;
  left = 0;

  /** `phase` sets where in its breath the player starts, so a row of players never breathes in step. */
  constructor(phase: number) {
    this.breathPhase = phase;
  }

  /** Follows the body through the world. A jump of more than a couple of metres (a reset for kick off) starts afresh. */
  track(x: number, z: number, facing: number, dt: number): void {
    if (!this.seen || dt <= 0 || Math.hypot(x - this.x, z - this.z) > 2) {
      this.seen = true;
      this.x = x;
      this.z = z;
      this.vx = this.vz = this.ax = this.az = 0;
      return;
    }
    const vx = (x - this.x) / dt;
    const vz = (z - this.z) / dt;
    this.x = x;
    this.z = z;
    const kv = 1 - Math.exp(-dt / SMOOTH_V);
    const lastX = this.vx;
    const lastZ = this.vz;
    this.vx += (vx - this.vx) * kv;
    this.vz += (vz - this.vz) * kv;
    const ka = 1 - Math.exp(-dt / SMOOTH_A);
    this.ax += (clamp((this.vx - lastX) / dt, -14, 14) - this.ax) * ka;
    this.az += (clamp((this.vz - lastZ) / dt, -14, 14) - this.az) * ka;
    const c = Math.cos(facing);
    const s = Math.sin(facing);
    this.forward = this.ax * c + this.az * s;
    this.left = this.ax * s - this.az * c;
    const speed = Math.hypot(this.vx, this.vz);
    const effort = clamp((speed - 3) / 5, 0, 1);
    this.exertion += (effort - this.exertion) * (1 - Math.exp(-dt / (effort > this.exertion ? 4 : 12)));
    this.breathPhase += dt * Math.PI * 2 * (0.25 + 0.5 * this.exertion);
  }

  /** Leans the pose with the body's acceleration. `weight` fades it out for moves that set their own balance. */
  lean(p: Pose, weight: number): void {
    if (weight <= 0) return;
    const brake = clamp(-this.forward / 7, 0, 1);
    const push = clamp(this.forward / 6, 0, 1);
    p.pitch += clamp(this.forward * 0.028, -0.2, 0.18) * weight;
    // Into the turn: acceleration to the left tips the top of the body left, which is a negative roll.
    p.roll += clamp(-Math.atan(this.left / G) * 0.85, -0.38, 0.38) * weight;
    p.spineZ += clamp(-this.left * 0.012, -0.08, 0.08) * weight;
    // Braking: sit down into it, arms reaching forward for balance. Driving away: a crouch and harder arms.
    p.lift -= (0.05 * brake + 0.025 * push) * weight;
    p.shLX -= 0.45 * brake * weight;
    p.shRX -= 0.45 * brake * weight;
    p.shLZ += 0.25 * brake * weight;
    p.shRZ += 0.25 * brake * weight;
    p.shLX *= 1 + 0.3 * push * weight;
    p.shRX *= 1 + 0.3 * push * weight;
  }

  /** The breath in the pose: the shoulders rise a touch with each breath in, more when blowing. */
  breathe(p: Pose): void {
    const b = Math.sin(this.breathPhase);
    p.shLZ += 0.02 * this.exertion * b;
    p.shRZ += 0.02 * this.exertion * b;
    p.spineX -= 0.012 * this.exertion * b;
  }

  /** The rib cage swelling with the breath, faster and deeper after running. */
  swell(chest: THREE.Object3D): void {
    const b = Math.sin(this.breathPhase);
    const depth = 0.012 + 0.03 * this.exertion;
    chest.scale.set(1 + depth * 0.8 * b, 1 + depth * 0.35 * b, 1 + depth * b);
  }
}
