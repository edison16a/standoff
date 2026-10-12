import type { WeaponId } from "../engine/weapons";

/** The empty case each gun throws out, and how it throws it. */
export interface CasingSpec {
  /** Length and diameter of the case in metres. */
  length: number;
  diameter: number;
  /** Brass for the metal cases, a red plastic hull with a brass head for the shotgun. */
  material: "brass" | "steel" | "hull";
  /** Ejection speed range, metres per second, mostly out to the right. */
  speed: [number, number];
  /** How far the ejection leans forward (positive) or back toward the shooter. */
  forward: number;
  /** Tumble rate range, turns per second. */
  spin: [number, number];
  /** Share of speed kept off the ground on each bounce. Plastic hulls barely bounce. */
  restitution: number;
}

export const CASINGS: Record<WeaponId, CasingSpec> = {
  // The hull comes out on the pump stroke, lazily, and thuds rather than rings.
  shotgun: { length: 0.07, diameter: 0.021, material: "hull", speed: [1.8, 2.6], forward: -0.1, spin: [4, 8], restitution: 0.22 },
  // A blowback SMG flicks its little cases out hard to the right.
  smg: { length: 0.019, diameter: 0.0099, material: "brass", speed: [3.5, 5], forward: 0.1, spin: [18, 30], restitution: 0.42 },
  // The AR throws right and a little forward, at about four o'clock.
  rifle: { length: 0.045, diameter: 0.0096, material: "brass", speed: [3, 4.5], forward: 0.3, spin: [15, 28], restitution: 0.4 },
  // The AK flings its lacquered steel cases far, well forward of the shooter.
  ak47: { length: 0.039, diameter: 0.0113, material: "steel", speed: [5, 7], forward: 0.55, spin: [14, 24], restitution: 0.38 },
};

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One time a case strikes the ground: when, how hard, and where. */
export interface Bounce {
  time: number;
  /** Speed into the ground, metres per second. The sound's loudness follows it. */
  speed: number;
  at: Vec3;
}

const GRAVITY = 9.81;
/** Fixed time step, so the picture and the sound replay the same case exactly. */
export const CASING_STEP = 1 / 240;
/**
 * How high above the street a spent case leaves the gun, in metres. The
 * team holds its guns a little under the eye (1.65 m), at about chest
 * height. The picture and the sound both start every case from here, so
 * each clink is heard as the case is seen to land.
 */
export const EJECT_HEIGHT = 1.3;
/** Below this speed into the ground a bounce becomes a roll. */
const SETTLE = 0.35;
/** Rolling friction on asphalt, metres per second lost per second. */
const ROLL_DRAG = 2.2;

/**
 * A spent case in flight, in a frame where the ground is y = 0, x points
 * out of the ejection port (the shooter's right) and z points back toward
 * the shooter. It tumbles end over end in the air and rolls once it lands.
 * Everything comes from the random source given, so the renderer and the
 * sound can each build the same case from the same seed.
 */
export class CasingBody {
  readonly pos: Vec3;
  readonly vel: Vec3;
  /** Tumble angle about the case's own short axis, radians. */
  angle = 0;
  /** Heading of the case on the ground, radians. */
  heading: number;
  spinRate: number;
  resting = false;
  age = 0;
  private rolling = false;

  constructor(
    readonly spec: CasingSpec,
    height: number,
    random: () => number,
  ) {
    const speed = spec.speed[0] + (spec.speed[1] - spec.speed[0]) * random();
    const up = 0.35 + random() * 0.25;
    const side = Math.sqrt(Math.max(0, 1 - up * up - spec.forward * spec.forward));
    this.pos = { x: 0, y: height, z: 0 };
    this.vel = { x: side * speed, y: up * speed, z: -spec.forward * speed + (random() - 0.5) * 0.6 };
    this.spinRate = (spec.spin[0] + (spec.spin[1] - spec.spin[0]) * random()) * Math.PI * 2;
    this.heading = random() * Math.PI * 2;
  }

  /** Steps the case by exactly one fixed step. Returns the bounce if it hit the ground this step. */
  step(random: () => number): Bounce | null {
    if (this.resting) return null;
    const dt = CASING_STEP;
    this.age += dt;
    if (this.rolling) return this.roll(dt);
    this.vel.y -= GRAVITY * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;
    this.angle += this.spinRate * dt;
    if (this.pos.y > 0) return null;
    const into = -this.vel.y;
    this.pos.y = 0;
    const bounce = { time: this.age, speed: into, at: { ...this.pos } };
    if (into < SETTLE) {
      this.rolling = true;
      this.vel.y = 0;
      // It lands on its side, so it rolls across its own length.
      this.angle = Math.round(this.angle / Math.PI) * Math.PI + Math.PI / 2;
      return bounce;
    }
    // A case lands on a corner or its side, so each bounce kicks it off at a new angle.
    const e = this.spec.restitution * (0.75 + random() * 0.5);
    this.vel.y = into * e;
    const scuff = 0.55 + random() * 0.25;
    const turn = (random() - 0.5) * 1.2;
    const vx = this.vel.x * scuff;
    const vz = this.vel.z * scuff;
    this.vel.x = vx * Math.cos(turn) - vz * Math.sin(turn);
    this.vel.z = vx * Math.sin(turn) + vz * Math.cos(turn);
    this.spinRate = -this.spinRate * (0.4 + random() * 0.5) + (random() - 0.5) * 20;
    return bounce;
  }

  private roll(dt: number): null {
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed < 0.02) {
      this.resting = true;
      return null;
    }
    const left = Math.max(0, speed - ROLL_DRAG * dt) / speed;
    this.vel.x *= left;
    this.vel.z *= left;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // A rolling cylinder turns by distance over its radius.
    this.spinRate = speed / (this.spec.diameter / 2);
    this.angle += this.spinRate * dt;
    this.heading = Math.atan2(this.vel.z, this.vel.x) + Math.PI / 2;
    return null;
  }
}

/**
 * Plays a case out to rest and lists its bounces, for the sound. The same
 * seed through the renderer's CasingBody lands the same bounces at the
 * same moments, so each clink is heard as it is seen.
 */
export function bounces(spec: CasingSpec, height: number, random: () => number, limit = 3): Bounce[] {
  const body = new CasingBody(spec, height, random);
  const out: Bounce[] = [];
  while (!body.resting && body.age < limit) {
    const hit = body.step(random);
    if (hit) out.push(hit);
  }
  return out;
}

/** A seed for one shot's case, the same on every part of the host that sees the shot. */
export function casingSeed(seat: number, shotId: number): number {
  return (Math.imul(seat + 1, 0x9e3779b1) ^ Math.imul(shotId + 1, 0x85ebca6b)) >>> 0 || 1;
}
