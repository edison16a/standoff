/** A point on the floor plan with height, as the camera reads it. */
export interface P3 {
  x: number;
  y: number;
  z: number;
}

/**
 * A critically damped spring toward a moving target: it eases in and
 * out without overshoot, and a target that jumps never makes the camera
 * jerk, because the change goes into velocity rather than position.
 * `time` is roughly how long it takes to cover most of the gap.
 */
export class Spring3 {
  readonly at: P3 = { x: 0, y: 0, z: 0 };
  private readonly v: P3 = { x: 0, y: 0, z: 0 };

  snap(to: P3): void {
    this.at.x = to.x;
    this.at.y = to.y;
    this.at.z = to.z;
    this.v.x = this.v.y = this.v.z = 0;
  }

  step(to: P3, time: number, dt: number): P3 {
    const omega = 2 / Math.max(1e-3, time);
    const x = omega * dt;
    // The usual rational fit to exp(-x), stable for any frame time.
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    for (const k of ["x", "y", "z"] as const) {
      const change = this.at[k] - to[k];
      const temp = (this.v[k] + omega * change) * dt;
      this.v[k] = (this.v[k] - omega * temp) * decay;
      this.at[k] = to[k] + (change + temp) * decay;
    }
    return this.at;
  }
}

/** How far ahead of the play the camera looks, in seconds of its motion, and the most it ever leads by. */
export const LEAD_SECONDS = 0.5;
export const MAX_LEAD = 2.2;

/**
 * Where a broadcast operator points the camera: a little ahead of the
 * play in the way it is moving, so a fast break has room to run into,
 * and a lens that tightens when the players bunch up and widens when
 * the floor spreads out. The play's speed is smoothed so a crossover or
 * a pass does not snap the lead from side to side.
 */
export class BroadcastFraming {
  private last: P3 | null = null;
  private vx = 0;
  private vz = 0;

  reset(): void {
    this.last = null;
    this.vx = this.vz = 0;
  }

  /** The focus moved on by the lead. */
  lead(focus: P3, dt: number): P3 {
    if (this.last && dt > 0) {
      // Over about 0.4 s the lead follows the play's speed; a teleport (a cut, a reset) is ignored.
      const jx = (focus.x - this.last.x) / dt;
      const jz = (focus.z - this.last.z) / dt;
      if (Math.hypot(jx, jz) < 14) {
        const k = 1 - Math.exp(-dt / 0.4);
        this.vx += (jx - this.vx) * k;
        this.vz += (jz - this.vz) * k;
      }
    }
    this.last = { x: focus.x, y: focus.y, z: focus.z };
    let lx = this.vx * LEAD_SECONDS;
    let lz = this.vz * LEAD_SECONDS;
    const len = Math.hypot(lx, lz);
    if (len > MAX_LEAD) {
      lx *= MAX_LEAD / len;
      lz *= MAX_LEAD / len;
    }
    return { x: focus.x + lx, y: focus.y, z: focus.z + lz };
  }
}

/**
 * The lens for how spread the players are: `spread` is their typical
 * distance from the play in metres. Bunched (2 m) gives a tighter lens,
 * spread (6 m and up) the wide one, a few degrees either side of `base`.
 */
export function zoomFor(spread: number, base: number): number {
  const t = Math.max(0, Math.min(1, (spread - 2) / 4));
  return base - 3 + t * 6;
}

/** The players' typical distance from the play, the root mean square on the floor. */
export function spreadOf(players: readonly { x: number; z: number }[], focus: { x: number; z: number }): number {
  if (!players.length) return 4;
  let sum = 0;
  for (const p of players) sum += (p.x - focus.x) ** 2 + (p.z - focus.z) ** 2;
  return Math.sqrt(sum / players.length);
}
