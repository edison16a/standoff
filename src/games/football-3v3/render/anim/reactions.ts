import type { Pose } from "./pose";

/**
 * How a body answers contact. A hit or a hard bump is a sudden change in
 * the body's speed far beyond what legs make; the torso, head and arms
 * carry on with their own momentum for a moment, whip and settle back on
 * a spring. Shaken footing after a jolt or a broken tackle makes the body
 * wobble with the arms out for balance.
 */
export class Jolt {
  private pitch = 0;
  private roll = 0;
  private vPitch = 0;
  private vRoll = 0;

  /**
   * `push` and `turn` are this frame's acceleration along the facing and
   * to the left, in m/s², and `pushSmooth`, `turnSmooth` the same eased
   * over a tenth of a second: what is left is the knock.
   */
  update(push: number, turn: number, pushSmooth: number, turnSmooth: number, dt: number): void {
    const knock = (raw: number, eased: number) => Math.max(-1, Math.min(1, (raw - eased) / 25));
    // A stiff, lightly damped spring: one quick whip and a small rebound.
    const stiff = 160;
    const damp = 2 * 0.35 * Math.sqrt(stiff);
    this.vPitch += (knock(push, pushSmooth) * 60 - stiff * this.pitch - damp * this.vPitch) * dt;
    this.vRoll += (knock(turn, turnSmooth) * 60 - stiff * this.roll - damp * this.vRoll) * dt;
    this.pitch += this.vPitch * dt;
    this.roll += this.vRoll * dt;
  }

  /** Adds the whip to a pose: the chest snaps with the knock and the head lags behind it. */
  apply(p: Pose): void {
    const pitch = Math.max(-0.5, Math.min(0.5, this.pitch));
    const roll = Math.max(-0.4, Math.min(0.4, this.roll));
    p.spineX += pitch * 0.8;
    p.pitch += pitch * 0.25;
    p.neckX -= pitch * 0.6;
    p.spineZ -= roll * 0.7;
    p.roll += roll * 0.25;
    const flail = Math.min(1, Math.hypot(pitch, roll) * 3);
    p.shLZ += flail * 0.5;
    p.shRZ += flail * 0.5;
  }
}

/** Shaken footing: a sway on loose knees with the arms thrown out. `shaken` is the seconds of it left. */
export function wobble(p: Pose, shaken: number, time: number, seed: number): void {
  if (shaken <= 0) return;
  const k = Math.min(1, shaken / 0.3);
  const t = time * 9 + seed;
  p.roll += Math.sin(t) * 0.14 * k;
  p.spineZ += Math.sin(t * 1.3 + 1) * 0.12 * k;
  p.pitch += (0.08 + Math.sin(t * 0.7) * 0.06) * k;
  p.kneeL += 0.2 * k;
  p.kneeR += 0.2 * k;
  p.shLZ += (0.6 + Math.sin(t * 1.1) * 0.25) * k;
  p.shRZ += (0.6 - Math.sin(t * 1.1) * 0.25) * k;
  p.elL -= 0.4 * k;
  p.elR -= 0.4 * k;
}
