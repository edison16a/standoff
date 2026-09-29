import { seededRandom, type Random } from "../random";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Confetti coming down from above over a round area, as from nets in the roof. */
export interface ShowerOptions {
  centre: Vec3;
  /** Spread across the floor, in metres. */
  radius: number;
  /** How far above `centre.y` the pieces start, spread over `depth` more. */
  height: number;
  depth?: number;
  count: number;
}

/** Confetti fired out of a cannon: a fast cone that slows in the air and then flutters down. */
export interface CannonOptions {
  from: Vec3;
  /** Which way the barrel points. It need not be of unit length. */
  direction: Vec3;
  /** Half the cone's angle, in radians. */
  spread: number;
  /** Launch speed in metres per second. */
  speed: number;
  count: number;
}

export interface ConfettiTuning {
  gravity: number;
  /** How fast paper falls once the air has slowed it, in metres per second. */
  terminal: number;
  /** How hard pieces sway from side to side as they fall, in metres per second. */
  flutter: number;
  /** A steady breeze across the scene. */
  wind: Vec3;
  /** The floor the pieces settle on. */
  floor: number;
}

/** How much of the usual drag a cannon's clump feels. */
const CLUMP_DRAG = 0.1;

export const DEFAULT_TUNING: ConfettiTuning = { gravity: 9.8, terminal: 0.9, flutter: 0.55, wind: { x: 0.08, y: 0, z: 0.03 }, floor: 0 };

/**
 * The physics of many confetti pieces, kept in flat arrays so thousands
 * step cheaply with no garbage. Paper is light: air drag pulls every
 * piece toward a slow terminal speed, so a cannon blast bursts out fast
 * and then hangs and drifts. Each piece sways on its own rhythm and
 * tumbles, and lies flat once it reaches the floor. No three.js here,
 * so it is tested on its own.
 */
export class ConfettiSim {
  readonly capacity: number;
  readonly position: Float32Array;
  readonly velocity: Float32Array;
  /** Euler angles, and how fast each turns, in radians per second. */
  readonly rotation: Float32Array;
  readonly spin: Float32Array;
  /** 0 unused, 1 in the air, 2 lying on the floor. */
  readonly state: Uint8Array;
  /** Each piece's own sway rhythm and phase. */
  readonly sway: Float32Array;
  /**
   * Seconds each piece still flies as part of the cannon's tight clump.
   * A clump cuts through the air far better than a lone piece, so a
   * blast carries metres up before it opens out and drifts.
   */
  readonly clump: Float32Array;
  tuning: ConfettiTuning;
  private next = 0;
  private readonly random: Random;

  constructor(capacity: number, seed = 1, tuning: Partial<ConfettiTuning> = {}) {
    this.capacity = capacity;
    this.position = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.rotation = new Float32Array(capacity * 3);
    this.spin = new Float32Array(capacity * 3);
    this.state = new Uint8Array(capacity);
    this.sway = new Float32Array(capacity * 2);
    this.clump = new Float32Array(capacity);
    this.random = seededRandom(seed);
    this.tuning = { ...DEFAULT_TUNING, ...tuning };
  }

  /** How many pieces are in the air or on the floor. */
  get live(): number {
    let n = 0;
    for (let i = 0; i < this.capacity; i++) if (this.state[i]) n++;
    return n;
  }

  shower(options: ShowerOptions): void {
    const r = this.random;
    const depth = options.depth ?? options.height * 0.5;
    for (let n = 0; n < options.count; n++) {
      // Even over the disc, not bunched in the middle.
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * options.radius;
      const i = this.take();
      this.place(i, options.centre.x + Math.cos(a) * d, options.centre.y + options.height + r() * depth, options.centre.z + Math.sin(a) * d);
      this.launch(i, (r() - 0.5) * 0.6, -this.tuning.terminal * (0.5 + r()), (r() - 0.5) * 0.6);
    }
  }

  cannon(options: CannonOptions): void {
    const r = this.random;
    const { x: dx, y: dy, z: dz } = options.direction;
    const length = Math.hypot(dx, dy, dz) || 1;
    const ax = dx / length;
    const ay = dy / length;
    const az = dz / length;
    // Two directions square to the barrel, to spread the cone around it.
    const [hx, hy, hz] = Math.abs(ay) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let px = ay * hz - az * hy;
    let py = az * hx - ax * hz;
    let pz = ax * hy - ay * hx;
    const pl = Math.hypot(px, py, pz);
    px /= pl;
    py /= pl;
    pz /= pl;
    const qx = ay * pz - az * py;
    const qy = az * px - ax * pz;
    const qz = ax * py - ay * px;
    for (let n = 0; n < options.count; n++) {
      const angle = r() * Math.PI * 2;
      const off = Math.tan(options.spread) * Math.sqrt(r());
      const vx = ax + (px * Math.cos(angle) + qx * Math.sin(angle)) * off;
      const vy = ay + (py * Math.cos(angle) + qy * Math.sin(angle)) * off;
      const vz = az + (pz * Math.cos(angle) + qz * Math.sin(angle)) * off;
      const vl = Math.hypot(vx, vy, vz) || 1;
      const speed = options.speed * (0.6 + 0.4 * r());
      const i = this.take();
      this.place(i, options.from.x, options.from.y, options.from.z);
      this.launch(i, (vx / vl) * speed, (vy / vl) * speed, (vz / vl) * speed);
      this.clump[i] = 0.3 + 0.35 * r();
    }
  }

  step(dt: number, time: number): void {
    const t = this.tuning;
    // Linear drag sized so gravity and drag balance at the terminal speed.
    const drag = t.gravity / t.terminal;
    const loose = Math.exp(-drag * dt);
    const tight = Math.exp(-drag * CLUMP_DRAG * dt);
    const p = this.position;
    const v = this.velocity;
    for (let i = 0; i < this.capacity; i++) {
      if (this.state[i] !== 1) continue;
      const k = i * 3;
      const clumped = this.clump[i]! > 0;
      const keep = clumped ? tight : loose;
      if (clumped) this.clump[i] = this.clump[i]! - dt;
      const rate = this.sway[i * 2]!;
      const phase = this.sway[i * 2 + 1]!;
      // The air the piece moves through: the breeze plus its own sway, which swings as it tumbles.
      const airX = t.wind.x + Math.cos(time * rate + phase) * t.flutter;
      const airZ = t.wind.z + Math.sin(time * rate * 0.8 + phase) * t.flutter;
      // Exact for linear drag over the step, so a big dt never overshoots.
      v[k] = airX + (v[k]! - airX) * keep;
      // In the clump gravity pulls at the full rate; alone, drag holds a piece near its terminal speed.
      v[k + 1] = clumped ? v[k + 1]! * keep - t.gravity * dt : -t.terminal + (v[k + 1]! + t.terminal) * keep;
      v[k + 2] = airZ + (v[k + 2]! - airZ) * keep;
      p[k] = p[k]! + v[k]! * dt;
      p[k + 1] = p[k + 1]! + v[k + 1]! * dt;
      p[k + 2] = p[k + 2]! + v[k + 2]! * dt;
      this.rotation[k] = this.rotation[k]! + this.spin[k]! * dt;
      this.rotation[k + 1] = this.rotation[k + 1]! + this.spin[k + 1]! * dt;
      this.rotation[k + 2] = this.rotation[k + 2]! + this.spin[k + 2]! * dt;
      if (p[k + 1]! <= t.floor) this.land(i);
    }
  }

  clear(): void {
    this.state.fill(0);
    this.next = 0;
  }

  /** The next slot, reusing the oldest piece once every slot is taken. */
  private take(): number {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    return i;
  }

  private place(i: number, x: number, y: number, z: number): void {
    const k = i * 3;
    this.position[k] = x;
    this.position[k + 1] = y;
    this.position[k + 2] = z;
  }

  private launch(i: number, vx: number, vy: number, vz: number): void {
    const r = this.random;
    const k = i * 3;
    this.velocity[k] = vx;
    this.velocity[k + 1] = vy;
    this.velocity[k + 2] = vz;
    for (let a = 0; a < 3; a++) {
      this.rotation[k + a] = r() * Math.PI * 2;
      this.spin[k + a] = (r() - 0.5) * 14;
    }
    this.sway[i * 2] = 2 + r() * 3;
    this.sway[i * 2 + 1] = r() * Math.PI * 2;
    this.clump[i] = 0;
    this.state[i] = 1;
  }

  private land(i: number): void {
    const k = i * 3;
    this.position[k + 1] = this.tuning.floor + 0.002 + (i % 7) * 0.0004;
    // Flat on the floor, turned any way, so settled pieces never flicker into each other.
    this.rotation[k] = -Math.PI / 2;
    this.rotation[k + 1] = 0;
    this.state[i] = 2;
  }
}
