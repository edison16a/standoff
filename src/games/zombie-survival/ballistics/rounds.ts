import type { WeaponId } from "../engine/weapons";

/**
 * What each gun actually fires, with real world numbers. The renderer
 * flies every round at its true muzzle speed, so a rifle round crosses
 * the street in a couple of frames and buckshot visibly lags behind it.
 */
export interface RoundSpec {
  /** The cartridge, as printed on the box. */
  cartridge: string;
  /** Metres per second as it leaves the barrel. */
  muzzleVelocity: number;
  /**
   * How hard the air slows it, as the share of speed lost per metre.
   * Round balls of buckshot shed speed far faster than a pointed bullet.
   */
  drag: number;
  /** Every nth round in the magazine is a tracer. Zero means none glow. */
  tracerEvery: number;
  /** Bullet diameter in metres, for the size of the streak and the hole. */
  calibre: number;
}

export const ROUNDS: Record<WeaponId, RoundSpec> = {
  // 00 buckshot leaves slow and its round pellets bleed speed fast.
  shotgun: { cartridge: "12 gauge 00 buckshot", muzzleVelocity: 400, drag: 0.012, tracerEvery: 0, calibre: 0.0084 },
  smg: { cartridge: "9x19mm Parabellum", muzzleVelocity: 400, drag: 0.004, tracerEvery: 4, calibre: 0.009 },
  rifle: { cartridge: "5.56x45mm NATO", muzzleVelocity: 940, drag: 0.0012, tracerEvery: 3, calibre: 0.0057 },
  ak47: { cartridge: "7.62x39mm", muzzleVelocity: 715, drag: 0.0016, tracerEvery: 3, calibre: 0.0079 },
};

/** Gravity, metres per second squared. */
export const GRAVITY = 9.81;

/** A round's path from the muzzle to a point, with drag and gravity. */
export interface Flight {
  /** Seconds from the muzzle to the target. */
  time: number;
  /** How far the round has fallen below the straight line by the target, in metres. */
  drop: number;
  /** Speed at the target, metres per second. */
  impactSpeed: number;
}

/**
 * Time to cover `metres` with speed decaying as v = v0 * exp(-k x). Solving
 * dx/dt = v0 * exp(-k x) gives t = (exp(k x) - 1) / (k v0). Gravity pulls
 * the round down for that whole time, so the drop is g t squared over 2.
 */
export function flight(spec: RoundSpec, metres: number): Flight {
  const k = spec.drag;
  const x = Math.max(0, metres);
  const time = k > 0 ? Math.expm1(k * x) / (k * spec.muzzleVelocity) : x / spec.muzzleVelocity;
  return { time, drop: 0.5 * GRAVITY * time * time, impactSpeed: spec.muzzleVelocity * Math.exp(-k * x) };
}

/**
 * How far along the line the round is after `seconds`, in metres. This is
 * the inverse of the flight time above: x = ln(1 + k v0 t) / k.
 */
export function distanceAt(spec: RoundSpec, seconds: number): number {
  const t = Math.max(0, seconds);
  const k = spec.drag;
  return k > 0 ? Math.log1p(k * spec.muzzleVelocity * t) / k : spec.muzzleVelocity * t;
}

/** True when round number `index` of a magazine (counting from 0) is loaded as a tracer. */
export function isTracer(spec: RoundSpec, index: number): boolean {
  return spec.tracerEvery > 0 && index % spec.tracerEvery === spec.tracerEvery - 1;
}
