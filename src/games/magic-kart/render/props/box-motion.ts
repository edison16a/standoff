/**
 * How the item boxes move, kept apart from the drawing so it can be
 * tested: the spin and bob, the pop back in after a box was taken, and
 * the wobble when a kart with full hands barges through one.
 */

/** Edge of a single cube, metres. */
export const BOX_SIZE = 1.5;
/** Each cube of a double box is a little smaller, so the stack stands no taller than it must. */
export const STACK_SCALE = 0.82;
/** How far a single cube leans as it turns, and a stacked one, which must clear its neighbour. */
export const SINGLE_TILT = 0.5;
export const STACK_TILT = 0.1;
/** Seconds a returning box takes to swell back in. */
export const POP_IN = 0.45;

export interface CubeTurn {
  /** Metres above the box's resting height. */
  lift: number;
  /** Turn about the upright, then the lean, radians. */
  yaw: number;
  tilt: number;
}

/**
 * One cube's turn and bob. A single cube tumbles on a lean like a die on
 * a string. The two cubes of a double box turn upright, the other way to
 * each other, and bob together so the stack reads as one thing.
 */
export function cubeTurn(index: number, level: number, count: 1 | 2, time: number): CubeTurn {
  if (count === 1) return { lift: Math.sin(time * 2.4 + index) * 0.15, yaw: time * 1.4 + index * 0.7, tilt: SINGLE_TILT };
  const dir = level === 0 ? 1 : -1;
  return { lift: Math.sin(time * 2.1 + index) * 0.12, yaw: dir * (time * 1.15 + index * 0.7) + level * 0.4, tilt: STACK_TILT };
}

/** Half the height a cube of edge `size` reaches when leaned by `tilt`, at its worst turn. */
export function reach(size: number, tilt: number): number {
  const half = size / 2;
  // A cube turned about the upright reaches out by half its diagonal; the lean tips that up.
  return half * Math.cos(tilt) + half * Math.SQRT2 * Math.sin(tilt);
}

/** Scale of a box that came back `since` seconds ago: it swells a little past full size and settles. */
export function popScale(since: number): number {
  if (since <= 0) return 0;
  if (since >= POP_IN) return 1;
  const t = since / POP_IN - 1;
  const back = 2.2;
  return 1 + (back + 1) * t * t * t + back * t * t;
}

/** A box knocked aside, on a spring that swings it back. */
export interface Wobble {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

const STIFF = 95;
const DAMP = 6.5;
/** Metres a second of shove per metre a second of kart speed. */
const SHOVE = 0.16;

export function stillWobble(): Wobble {
  return { x: 0, z: 0, vx: 0, vz: 0 };
}

/** A kart passing through shoves the box along its way and out to the side it was not on. */
export function shove(w: Wobble, kartVx: number, kartVz: number, awayX: number, awayZ: number): void {
  const len = Math.hypot(awayX, awayZ) || 1;
  const speed = Math.hypot(kartVx, kartVz);
  w.vx += kartVx * SHOVE + (awayX / len) * speed * SHOVE * 0.6;
  w.vz += kartVz * SHOVE + (awayZ / len) * speed * SHOVE * 0.6;
}

/** Steps the spring. Sub steps keep it steady on a slow frame. */
export function stepWobble(w: Wobble, dt: number): void {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    w.vx += (-STIFF * w.x - DAMP * w.vx) * h;
    w.vz += (-STIFF * w.z - DAMP * w.vz) * h;
    w.x += w.vx * h;
    w.z += w.vz * h;
  }
}
