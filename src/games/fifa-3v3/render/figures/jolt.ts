import type { Pose } from "../anim/pose";

/**
 * A body knocked by contact: a shoulder charge, a tackle, the ball
 * smacking into it. Each knock kicks a damped spring, so the trunk
 * rocks away from the hit, overshoots a little and settles, the head
 * whipping a beat behind and the arms flung out for balance.
 */

/** How stiff the spring is (radians a second) and how quickly it settles. */
const OMEGA = 13;
const DAMPING = 0.38;

export class Jolt {
  /** Lean forward (+) or back, and to the left (+) or right, in radians. */
  private pitch = 0;
  private side = 0;
  private vPitch = 0;
  private vSide = 0;

  /**
   * A knock pushing the body toward `x` (its left) and `z` (its front),
   * a unit direction in its own frame, `strength` from a nudge (0.3) to
   * a heavy hit (1.5).
   */
  hit(x: number, z: number, strength: number): void {
    const k = Math.min(1.6, strength) * 2.6;
    this.vPitch += z * k;
    this.vSide += x * k;
  }

  /** Moves the spring on; it is critically light, so a hit rocks and settles within half a second. */
  step(dt: number): void {
    for (let t = dt; t > 0; t -= 1 / 120) {
      const h = Math.min(t, 1 / 120);
      this.vPitch += (-OMEGA * OMEGA * this.pitch - 2 * DAMPING * OMEGA * this.vPitch) * h;
      this.vSide += (-OMEGA * OMEGA * this.side - 2 * DAMPING * OMEGA * this.vSide) * h;
      this.pitch += this.vPitch * h;
      this.side += this.vSide * h;
    }
  }

  /** Adds the rock to a pose: the trunk most, the whole body a little, the head lagging, the arms out. */
  apply(p: Pose): void {
    const size = Math.hypot(this.pitch, this.side);
    if (size < 1e-4) return;
    p.spineX += this.pitch * 0.8;
    p.pitch += this.pitch * 0.3;
    p.spineZ -= this.side * 0.8;
    p.roll -= this.side * 0.25;
    p.neckX -= this.vPitch * 0.025;
    p.shLZ += size * 1.6;
    p.shRZ += size * 1.6;
    p.elL -= size * 0.8;
    p.elR -= size * 0.8;
  }
}
