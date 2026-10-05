import { RIM } from "../../engine/tuning";

/** A breakaway rim rings at about six and a half beats a second and settles in under a second. */
const HZ = 6.5;
const DAMPING = 0.14;
/** A dunker's weight bends the front of the ring down about five centimetres. */
const HANG_PITCH = -0.11;
/** Radians a second of kick for a full power hit at the front of the ring. */
const KICK = 1.7;

/**
 * The ring on its spring loaded hinge: pitch dips the front down, roll
 * tips it to a side. A ball hitting the iron kicks it more the further
 * out along the ring it lands, and a player hanging on it holds it bent
 * until he lets go, then it springs back and rings.
 */
export class RimSpring {
  pitch = 0;
  roll = 0;
  private pitchV = 0;
  private rollV = 0;
  private target = 0;

  /** `side` is across the ring from its middle, `out` how far out from the hinge the ball hit, in metres. */
  knock(power: number, side: number, out: number): void {
    const reach = Math.min(1, Math.max(0.2, out / (RIM.radius * 2 + 0.15)));
    this.pitchV -= power * KICK * reach;
    this.rollV -= power * KICK * 0.6 * Math.max(-1, Math.min(1, side / RIM.radius));
  }

  hold(on: boolean): void {
    this.target = on ? HANG_PITCH : 0;
  }

  step(dt: number): void {
    const h = Math.min(dt, 1 / 30);
    const w = Math.PI * 2 * HZ;
    // Semi implicit Euler: stable for a stiff spring at the frame rate.
    this.pitchV += (-w * w * (this.pitch - this.target) - 2 * DAMPING * w * this.pitchV) * h;
    this.rollV += (-w * w * this.roll - 2 * DAMPING * w * this.rollV) * h;
    this.pitch += this.pitchV * h;
    this.roll += this.rollV * h;
    // The hinge has stops: it never folds further than a hard dunk can bend it.
    this.pitch = Math.max(-0.2, Math.min(0.08, this.pitch));
    this.roll = Math.max(-0.08, Math.min(0.08, this.roll));
  }
}

/**
 * The whole basket on its stanchion, rocking about its foot: a dunk or a
 * hard shot off the glass sets it swaying a centimetre or so at the top,
 * slower and longer than the ring, the way a real one shudders.
 */
export class StandSway {
  angle = 0;
  private v = 0;

  /** Soft touches barely register; a full power slam rocks it. */
  knock(power: number): void {
    this.v -= power * power * 0.09;
  }

  step(dt: number): void {
    const h = Math.min(dt, 1 / 30);
    const w = Math.PI * 2 * 2.6;
    this.v += (-w * w * this.angle - 2 * 0.06 * w * this.v) * h;
    this.angle += this.v * h;
  }
}
