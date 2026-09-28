/**
 * The physics of paper confetti, with no three.js in it so it can be
 * tested. Each piece is a small flat card. Gravity pulls it down and air
 * pushes back, much harder when the card lies flat to the fall than when
 * it slices edge first, so pieces tumble, skate sideways and drift down
 * at a walking pace instead of dropping like stones.
 */

/** Numbers per piece in the flat arrays below. */
const V = 3;

export interface ConfettiPhysics {
  /** Metres per second squared, downward. */
  gravity: number;
  /** Air drag per second when the card falls flat. Edge first it is a fifth of this. */
  drag: number;
  /** How hard a tilted card skates sideways as it falls, as a share of its fall speed. */
  glide: number;
  /** Where the floor is. Pieces that reach it lie flat and stop. */
  floorY: number;
  /** A steady breeze, metres per second. */
  wind: { x: number; z: number };
  /** Seconds a landed piece lies before it may be reused. */
  restS: number;
}

export const DEFAULT_PHYSICS: ConfettiPhysics = {
  gravity: 9.8,
  drag: 8,
  glide: 0.8,
  floorY: 0,
  wind: { x: 0.12, z: 0 },
  restS: 6,
};

export interface Vec {
  x: number;
  y: number;
  z: number;
}

/** Where new pieces come from. */
export type Emitter =
  /** A cannon: a spray from one point, up a cone of `spread` radians around `direction`. */
  | { kind: "burst"; at: Vec; direction: Vec; speed: number; spread: number }
  /** Rain: pieces appear anywhere over a disc high up, already drifting down. */
  | { kind: "rain"; at: Vec; radius: number };

/** Seconds for a cannon's clump to open out into single cards. */
const OPEN_S = 0.8;

/** A piece's state. */
export const FREE = 0;
export const FLYING = 1;
export const LANDED = 2;

export class ConfettiSim {
  readonly position: Float32Array;
  readonly velocity: Float32Array;
  /** Euler angles, x then y then z, in radians. */
  readonly rotation: Float32Array;
  readonly spin: Float32Array;
  readonly state: Uint8Array;
  /** Seconds since the piece was launched, or since it landed. */
  readonly age: Float32Array;
  physics: ConfettiPhysics;
  private next = 0;

  constructor(
    readonly count: number,
    private readonly random: () => number,
    physics: Partial<ConfettiPhysics> = {},
  ) {
    this.position = new Float32Array(count * V);
    this.velocity = new Float32Array(count * V);
    this.rotation = new Float32Array(count * V);
    this.spin = new Float32Array(count * V);
    this.state = new Uint8Array(count);
    this.age = new Float32Array(count);
    this.physics = { ...DEFAULT_PHYSICS, ...physics };
  }

  /** How many pieces are in the air right now. */
  get flying(): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (this.state[i] === FLYING) n++;
    return n;
  }

  /** Puts `n` pieces into the air. Free pieces go first, then ones that have lain long enough, so a long party never runs dry. */
  spawn(n: number, emitter: Emitter): void {
    for (let k = 0; k < n; k++) {
      const i = this.pick();
      if (i < 0) return;
      this.launch(i, emitter);
    }
  }

  clear(): void {
    this.state.fill(FREE);
  }

  step(dtS: number): void {
    // Long frames are cut up, so a stall never throws pieces through the floor.
    let left = Math.min(0.25, Math.max(0, dtS));
    while (left > 0) {
      const dt = Math.min(1 / 60, left);
      left -= dt;
      for (let i = 0; i < this.count; i++) {
        const s = this.state[i];
        if (s === FREE) continue;
        this.age[i]! += dt;
        if (s === FLYING) this.fly(i, dt);
      }
    }
  }

  private fly(i: number, dt: number): void {
    const p = this.physics;
    const o = i * V;
    const rx = this.rotation[o]!;
    const rz = this.rotation[o + 2]!;
    // How squarely the card faces the fall: 1 flat, 0 edge on.
    const flat = Math.abs(Math.cos(rx) * Math.cos(rz));
    // A cannon's load leaves as a tight clump that only opens out as it flies, so it carries high before the air takes it.
    const open = Math.min(1, 0.05 + (this.age[i]! / OPEN_S) ** 2);
    const drag = p.drag * (0.2 + 0.8 * flat) * open;
    // Linear drag pulls the velocity toward a terminal one: the breeze, the settled fall, and a skate along the tilt.
    const fall = p.gravity / drag;
    const tx = p.wind.x + Math.sin(rz) * fall * p.glide;
    const tz = p.wind.z - Math.sin(rx) * fall * p.glide;
    const keep = Math.exp(-drag * dt);
    this.velocity[o] = tx + (this.velocity[o]! - tx) * keep;
    this.velocity[o + 1] = -fall + (this.velocity[o + 1]! + fall) * keep;
    this.velocity[o + 2] = tz + (this.velocity[o + 2]! - tz) * keep;
    for (let a = 0; a < V; a++) {
      this.position[o + a]! += this.velocity[o + a]! * dt;
      this.rotation[o + a]! += this.spin[o + a]! * dt;
    }
    if (this.position[o + 1]! <= p.floorY) this.land(i);
  }

  private land(i: number): void {
    const o = i * V;
    this.state[i] = LANDED;
    this.age[i] = 0;
    // Stacked a hair apart, so pieces piled on the floor never flicker through each other.
    this.position[o + 1] = this.physics.floorY + 0.002 + (i % 7) * 0.0008;
    this.rotation[o] = 0;
    this.rotation[o + 2] = 0;
    this.velocity.fill(0, o, o + V);
    this.spin.fill(0, o, o + V);
  }

  private pick(): number {
    for (let tries = 0; tries < this.count; tries++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      if (this.state[i] === FREE) return i;
      if (this.state[i] === LANDED && this.age[i]! >= this.physics.restS) return i;
    }
    return -1;
  }

  private launch(i: number, e: Emitter): void {
    const r = this.random;
    const o = i * V;
    this.state[i] = FLYING;
    this.age[i] = 0;
    if (e.kind === "burst") {
      const dir = coneDirection(e.direction, e.spread, r(), r());
      const speed = e.speed * (0.55 + 0.45 * r());
      set(this.position, o, e.at.x, e.at.y, e.at.z);
      set(this.velocity, o, dir.x * speed, dir.y * speed, dir.z * speed);
    } else {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * e.radius;
      set(this.position, o, e.at.x + Math.cos(a) * d, e.at.y + r() * 1.5, e.at.z + Math.sin(a) * d);
      set(this.velocity, o, 0, -0.4 - r() * 0.6, 0);
      // Rain starts as single cards, already open to the air.
      this.age[i] = OPEN_S;
    }
    set(this.rotation, o, r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2);
    // Every card tumbles at its own pace, some fast, some lazily.
    set(this.spin, o, (r() - 0.5) * 16, (r() - 0.5) * 6, (r() - 0.5) * 12);
  }
}

/** A direction inside the cone of `spread` radians around `axis`, from two random numbers. */
export function coneDirection(axis: Vec, spread: number, u: number, v: number): Vec {
  const d = unit(axis);
  const side = unit(Math.abs(d.y) < 0.9 ? cross(d, { x: 0, y: 1, z: 0 }) : cross(d, { x: 1, y: 0, z: 0 }));
  const up = cross(side, d);
  const a = u * Math.PI * 2;
  const t = Math.tan(Math.min(1.4, spread)) * Math.sqrt(v);
  const c = Math.cos(a) * t;
  const s = Math.sin(a) * t;
  return unit({ x: d.x + side.x * c + up.x * s, y: d.y + side.y * c + up.y * s, z: d.z + side.z * c + up.z * s });
}

function set(array: Float32Array, o: number, x: number, y: number, z: number): void {
  array[o] = x;
  array[o + 1] = y;
  array[o + 2] = z;
}

function cross(a: Vec, b: Vec): Vec {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function unit(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
