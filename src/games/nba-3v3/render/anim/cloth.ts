import type { Extras, Joints } from "../models/rig";

/** How stiffly the shorts' legs chase the thighs, and how quickly their swing dies away. */
const STIFF = 170;
const DAMP = 13;
/** How much of the thigh's swing the loose cloth takes. */
const FOLLOW = 0.9;

interface Swing {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

/**
 * The parts of the body that move on their own: the shorts' legs swing
 * after the thighs on a spring, overshooting a quick step and settling
 * after a stop, and the rib cage breathes, slow and shallow at rest,
 * deep and quick after a sprint.
 */
export class ClothAndBreath {
  private readonly legs: Record<"L" | "R", Swing> = { L: { x: 0, z: 0, vx: 0, vz: 0 }, R: { x: 0, z: 0, vx: 0, vz: 0 } };
  private breath: number;
  /** 0 rested to 1 blown, rising quickly on a sprint and falling slowly. */
  private effort = 0;

  /** `seed` staggers the breathing, so no two players breathe in step. */
  constructor(seed: number) {
    this.breath = seed * 2.3;
  }

  update(j: Joints, e: Extras, speed: number, dt: number): void {
    if (dt <= 0) return;
    // Small steps keep the spring steady through a slow frame.
    const steps = Math.min(8, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (const [k, hip, cloth] of [["L", j.hipL, e.clothL], ["R", j.hipR, e.clothR]] as const) {
      const s = this.legs[k];
      for (let i = 0; i < steps; i++) {
        s.vx += (STIFF * (hip.rotation.x * FOLLOW - s.x) - DAMP * s.vx) * h;
        s.vz += (STIFF * (hip.rotation.z * FOLLOW - s.z) - DAMP * s.vz) * h;
        s.x += s.vx * h;
        s.z += s.vz * h;
      }
      cloth.rotation.set(s.x, hip.rotation.y * FOLLOW, s.z);
    }
    const working = speed > 4.5 ? 1 : 0;
    this.effort += (working - this.effort) * (1 - Math.exp(-dt * (working ? 0.6 : 0.12)));
    const rate = 0.24 + 0.4 * this.effort;
    const depth = 0.012 + 0.03 * this.effort;
    this.breath += dt * rate * Math.PI * 2;
    const b = (0.5 + 0.5 * Math.sin(this.breath)) * depth;
    e.chest.scale.set(1 + b * 0.55, 1 + b * 0.3, 1 + b);
  }

  /** A new game: everything at rest. */
  reset(): void {
    for (const s of Object.values(this.legs)) Object.assign(s, { x: 0, z: 0, vx: 0, vz: 0 });
    this.effort = 0;
  }
}
