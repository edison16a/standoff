/**
 * The net as cloth: knots joined by cords in the diamond mesh of a real
 * twelve loop net, hanging from the hooks under the ring. Each knot is
 * a point with weight, stepped by Verlet integration, and each cord is
 * a length the knots are pulled back to, a few times a step, so the net
 * stretches a little and swings. A ball pushes the knots and the cords
 * out of its way and drags the ones it rubs along with it, so a swish
 * pulls the net down and snaps it out, and a ball on the iron sets it
 * swaying. It is only drawn; the game's own net is in the engine.
 */

export const LOOPS = 12;
export const ROWS = 6;
const G = 9.81;
/** Air and the cords rubbing soak up the swing within a second or two. */
const DAMP = 2.2;
const ITERATIONS = 6;
/** Nylon gives a little: each pass closes this share of the stretch. */
const STIFF = 0.85;
/** Cords the ball rubs against are dragged along with it by this share of its movement. */
const RUB = 0.55;

export interface NetShape {
  /** The middle of the ring of hooks. */
  origin: { x: number; y: number; z: number };
  /** Radius the hooks sit at, and the depth of the net. */
  radius: number;
  depth: number;
  /** How narrow the bottom is, as a share of the top. */
  taper: number;
}

export class NetSim {
  /** x, y, z of every knot, row by row; row 0 is on the hooks. */
  readonly pos: Float32Array;
  private readonly prev: Float32Array;
  /** Pairs of knot indices, one per cord: what is drawn. */
  readonly cords: Uint16Array;
  /** The cords and the unseen ties, all pulled to length. */
  private readonly links: Uint16Array;
  private readonly rest: Float32Array;
  /** Where the ball was last step, for the rub of the leather on the cords. */
  private readonly ball = { x: 0, y: -99, z: 0 };

  constructor(shape: NetShape) {
    const n = (ROWS + 1) * LOOPS;
    this.pos = new Float32Array(n * 3);
    for (let j = 0; j <= ROWS; j++) {
      const k = j / ROWS;
      const r = shape.radius * (1 - (1 - shape.taper) * Math.pow(k, 0.85));
      for (let i = 0; i < LOOPS; i++) {
        const a = angle(j, i);
        const o = shape.origin;
        this.pos.set([o.x + Math.cos(a) * r, o.y - shape.depth * k, o.z + Math.sin(a) * r], (j * LOOPS + i) * 3);
      }
    }
    this.prev = Float32Array.from(this.pos);
    const cords: number[] = [];
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < LOOPS; i++) {
        // Each knot below hangs from the two knots either side of it above: the diamonds.
        const below = (j + 1) * LOOPS + i;
        const up = j % 2 === 0 ? [i, (i + 1) % LOOPS] : [(i + LOOPS - 1) % LOOPS, i];
        for (const u of up) cords.push(j * LOOPS + u, below);
      }
    }
    this.cords = Uint16Array.from(cords);
    // The knitting tightens toward the bottom: unseen ties round each lower row hold the net narrower than the ball.
    const ties: number[] = [];
    for (let j = 3; j <= ROWS; j++) for (let i = 0; i < LOOPS; i++) ties.push(j * LOOPS + i, j * LOOPS + ((i + 1) % LOOPS));
    this.links = Uint16Array.from([...cords, ...ties]);
    this.rest = new Float32Array(this.links.length / 2);
    for (let c = 0; c < this.rest.length; c++) this.rest[c] = this.dist(this.links[c * 2]!, this.links[c * 2 + 1]!);
  }

  /** Moves the hooks (row 0) to where the ring has them. */
  hook(i: number, x: number, y: number, z: number): void {
    const k = i * 3;
    this.pos[k] = this.prev[k] = x;
    this.pos[k + 1] = this.prev[k + 1] = y;
    this.pos[k + 2] = this.prev[k + 2] = z;
  }

  /** Adds a velocity to every knot, more the lower it hangs: a knock from the ring or a ball snapping through. */
  kick(vx: number, vy: number, vz: number, open: number, h: number): void {
    for (let j = 1; j <= ROWS; j++) {
      const k = j / ROWS;
      for (let i = 0; i < LOOPS; i++) {
        const p = (j * LOOPS + i) * 3;
        const a = angle(j, i);
        nudge(this.prev, p, -(vx + Math.cos(a) * open) * k * h, -vy * k * h, -(vz + Math.sin(a) * open) * k * h);
      }
    }
  }

  /** One step of `h` seconds, with the ball at (bx, by, bz) of radius `br` pushing through. */
  step(h: number, bx: number, by: number, bz: number, br: number): void {
    const keep = 1 - DAMP * h;
    const p = this.pos;
    for (let k = LOOPS * 3; k < p.length; k += 3) {
      for (let c = 0; c < 3; c++) {
        const now = p[k + c]!;
        const v = (now - this.prev[k + c]!) * keep;
        this.prev[k + c] = now;
        p[k + c] = now + v - (c === 1 ? G * h * h : 0);
      }
    }
    const moved = Math.hypot(bx - this.ball.x, by - this.ball.y, bz - this.ball.z);
    const rub = moved < 0.5 ? RUB : 0;
    for (let it = 0; it < ITERATIONS; it++) {
      this.relax();
      // The rub is felt once a step; the shove is repeated so the ball ends clear of the cords.
      this.push(bx, by, bz, br, it === 0 ? rub : 0);
    }
    this.ball.x = bx;
    this.ball.y = by;
    this.ball.z = bz;
  }

  private relax(): void {
    const p = this.pos;
    for (let c = 0; c < this.rest.length; c++) {
      const a = this.links[c * 2]! * 3;
      const b = this.links[c * 2 + 1]! * 3;
      const dx = p[b]! - p[a]!;
      const dy = p[b + 1]! - p[a + 1]!;
      const dz = p[b + 2]! - p[a + 2]!;
      const d = Math.hypot(dx, dy, dz);
      // Cords pull but never push: a slack cord just hangs.
      if (d <= this.rest[c]! || d < 1e-9) continue;
      const pinned = a < LOOPS * 3;
      const f = ((d - this.rest[c]!) / d) * STIFF * (pinned ? 1 : 0.5);
      if (!pinned) nudge(p, a, dx * f, dy * f, dz * f);
      nudge(p, b, -dx * f, -dy * f, -dz * f);
    }
  }

  /** The ball shoves knots, and the middles of cords, out to its skin. */
  private push(bx: number, by: number, bz: number, br: number, rub: number): void {
    const mx = (bx - this.ball.x) * rub;
    const my = (by - this.ball.y) * rub;
    const mz = (bz - this.ball.z) * rub;
    const p = this.pos;
    for (let c = 0; c < this.cords.length / 2; c++) {
      const a = this.cords[c * 2]! * 3;
      const b = this.cords[c * 2 + 1]! * 3;
      const ex = p[b]! - p[a]!;
      const ey = p[b + 1]! - p[a + 1]!;
      const ez = p[b + 2]! - p[a + 2]!;
      const len2 = ex * ex + ey * ey + ez * ez || 1e-9;
      const t = Math.max(0, Math.min(1, ((bx - p[a]!) * ex + (by - p[a + 1]!) * ey + (bz - p[a + 2]!) * ez) / len2));
      const qx = p[a]! + ex * t - bx;
      const qy = p[a + 1]! + ey * t - by;
      const qz = p[a + 2]! + ez * t - bz;
      const d = Math.hypot(qx, qy, qz);
      if (d >= br || d < 1e-9) continue;
      const s = (br - d) / d;
      const pinned = a < LOOPS * 3;
      // The push is shared by the two ends by how near the touch is to each.
      const wa = pinned ? 0 : 1 - t;
      const wb = pinned ? 1 : t;
      const norm = 1 / Math.max(1e-6, wa * wa + wb * wb);
      nudge(p, a, (qx * s + mx) * wa * norm, (qy * s + my) * wa * norm, (qz * s + mz) * wa * norm);
      nudge(p, b, (qx * s + mx) * wb * norm, (qy * s + my) * wb * norm, (qz * s + mz) * wb * norm);
    }
  }

  private dist(i: number, j: number): number {
    const p = this.pos;
    return Math.hypot(p[j * 3]! - p[i * 3]!, p[j * 3 + 1]! - p[i * 3 + 1]!, p[j * 3 + 2]! - p[i * 3 + 2]!);
  }
}

/** Every other row of knots sits halfway between the ones above. */
export function angle(row: number, i: number): number {
  return ((i + (row % 2) * 0.5) / LOOPS) * Math.PI * 2;
}

function nudge(arr: Float32Array, i: number, x: number, y: number, z: number): void {
  arr[i] = arr[i]! + x;
  arr[i + 1] = arr[i + 1]! + y;
  arr[i + 2] = arr[i + 2]! + z;
}
