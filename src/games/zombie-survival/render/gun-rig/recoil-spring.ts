import type { WeaponId } from "../../engine/weapons";

/**
 * How one gun moves in the hands when it fires. Distances are in metres
 * and angles in radians, each the peak of a single shot's kick.
 */
export interface KickSpec {
  /** Shove straight back into the shoulder. */
  back: number;
  /** Muzzle climb. */
  rise: number;
  /** Roll, always the same way, as a right handed hold twists the gun. */
  roll: number;
  /** Most sideways swing, either way at random. */
  twist: number;
  /** Natural frequency in radians per second. Higher snaps back sooner. */
  omega: number;
  /** Damping ratio. 1 settles without overshoot, a little under wobbles once. */
  zeta: number;
}

/**
 * The shotgun is one big shove that takes a moment to settle, the AK
 * climbs hard and comes back slowly enough to stack in a burst, the rifle
 * is a crisp small kick, and the SMG a fast buzz that barely moves.
 */
export const KICKS: Record<WeaponId, KickSpec> = {
  shotgun: { back: 0.07, rise: 0.2, roll: 0.06, twist: 0.05, omega: 14, zeta: 0.8 },
  ak47: { back: 0.032, rise: 0.1, roll: 0.035, twist: 0.03, omega: 17, zeta: 0.72 },
  rifle: { back: 0.016, rise: 0.035, roll: 0.008, twist: 0.01, omega: 32, zeta: 0.9 },
  smg: { back: 0.011, rise: 0.022, roll: 0.01, twist: 0.018, omega: 44, zeta: 0.55 },
};

/** The held gun's offset from rest, in the same units as KickSpec. */
export interface Kick {
  back: number;
  rise: number;
  roll: number;
  twist: number;
}

const AXES = ["back", "rise", "roll", "twist"] as const;
/** Small fixed steps keep the stiff SMG spring stable on a long frame. */
const STEP = 1 / 240;
/** However long a trigger is held, the gun never leaves the hands by more than this many kicks. */
const STACK = 2.5;

/**
 * A spring and damper per axis that the gun rides on. Each shot gives it
 * a push of speed rather than a jump in place, so the gun is thrown back
 * and up and swings home on its own, settling the way a held gun does.
 * It only moves the gun in the hands: the aim point is the engine's, and
 * this never touches it.
 */
export class RecoilSpring {
  private readonly x = [0, 0, 0, 0];
  private readonly v = [0, 0, 0, 0];
  private carry = 0;

  constructor(
    private readonly spec: KickSpec,
    private readonly random: () => number,
  ) {}

  /** One shot. The push is sized so a lone shot from rest peaks at the spec's numbers. */
  kick(): void {
    const { spec } = this;
    // A critically damped spring launched at speed v peaks at v / (omega e).
    const speed = spec.omega * Math.E;
    const side = (this.random() < 0.5 ? -1 : 1) * (0.4 + 0.6 * this.random());
    const peaks = [spec.back, spec.rise * (0.85 + 0.3 * this.random()), spec.roll, spec.twist * side];
    peaks.forEach((peak, i) => (this.v[i]! += peak * speed));
  }

  step(dt: number): void {
    const { omega, zeta } = this.spec;
    this.carry += Math.min(dt, 0.25);
    while (this.carry >= STEP) {
      this.carry -= STEP;
      for (let i = 0; i < 4; i++) {
        // Semi implicit Euler: speed first, then place, which keeps a spring stable.
        this.v[i]! += (-omega * omega * this.x[i]! - 2 * zeta * omega * this.v[i]!) * STEP;
        this.x[i]! += this.v[i]! * STEP;
        const limit = STACK * Math.abs(this.peak(i));
        if (Math.abs(this.x[i]!) > limit) this.x[i] = Math.sign(this.x[i]!) * limit;
      }
    }
  }

  get offset(): Kick {
    return { back: this.x[0]!, rise: this.x[1]!, roll: this.x[2]!, twist: this.x[3]! };
  }

  /** At rest to well under a tenth of a millimetre and a tenth of a milliradian. */
  get resting(): boolean {
    return this.x.every((x) => Math.abs(x) < 1e-4) && this.v.every((v) => Math.abs(v) < 1e-3);
  }

  private peak(i: number): number {
    const axis = AXES[i]!;
    return this.spec[axis] + 1e-6;
  }
}
