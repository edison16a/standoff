/** An angle away from the aim, in radians: x to the right, y up. */
export interface Offset {
  x: number;
  y: number;
}

/** How one gun kicks. Angles are in radians. */
export interface RecoilSpec {
  /** How far each shot throws the muzzle up. */
  up: number;
  /** The most each shot throws it left or right, picked at random. */
  side: number;
  /** How quickly it springs back, per second. Higher settles sooner. */
  settle: number;
  /** The furthest the kicks can stack, so a held trigger climbs and then holds. */
  max: number;
}

/** Most of a kick lands at once. The rest carries the muzzle on a moment longer. */
const SNAP = 0.7;

/**
 * Where a player's gun points, relative to where their phone points. Each
 * shot kicks it, and a spring pulls it back to zero. The phone's aim is
 * never touched: this offset only rides on top of it, so the gun always
 * returns to the point the player holds.
 *
 * The spring is critically damped and solved exactly, so it never
 * overshoots and stays stable however long a frame is.
 */
export class Recoil {
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;

  constructor(private readonly spec: RecoilSpec) {}

  get offset(): Offset {
    return { x: this.x, y: this.y };
  }

  /** How far off the gun is right now, in radians. */
  get size(): number {
    return Math.hypot(this.x, this.y);
  }

  /** One shot's kick. `random` picks the sideways jolt, so a seeded game replays exactly. */
  kick(random: () => number): void {
    const { up, side, settle, max } = this.spec;
    const dy = up * (0.85 + random() * 0.3);
    const dx = side * (random() * 2 - 1);
    this.x += dx * SNAP;
    this.y += dy * SNAP;
    // A push of v rises v / (settle * e) before the spring wins, so this adds the rest of the kick.
    this.vx += dx * (1 - SNAP) * settle * Math.E;
    this.vy += dy * (1 - SNAP) * settle * Math.E;
    const size = this.size;
    if (size > max) {
      const k = max / size;
      this.x *= k;
      this.y *= k;
      this.vx *= k;
      this.vy *= k;
    }
  }

  update(dt: number): void {
    if (dt <= 0) return;
    [this.x, this.vx] = spring(this.x, this.vx, this.spec.settle, dt);
    [this.y, this.vy] = spring(this.y, this.vy, this.spec.settle, dt);
  }

  reset(): void {
    this.x = this.y = this.vx = this.vy = 0;
  }
}

/** A critically damped spring toward zero, stepped exactly by `dt`. */
function spring(x: number, v: number, w: number, dt: number): [number, number] {
  const decay = Math.exp(-w * dt);
  const c = v + w * x;
  return [(x + c * dt) * decay, (v - w * c * dt) * decay];
}
