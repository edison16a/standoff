/** One damped spring: where it is and how fast it moves. Rest is 0. */
export interface Spring {
  x: number;
  v: number;
}

/** How a spring pulls back (stiffness, per second squared) and how fast it settles (damping, per second). */
export interface SpringTune {
  stiffness: number;
  damping: number;
}

/** The longest step taken at once. Longer frames are cut up, so a stiff spring never blows up on a slow frame. */
const MAX_STEP = 1 / 120;

/**
 * Moves a spring on by `dt` seconds, pulled back to rest and slowed by
 * damping. Semi implicit Euler in small steps: stable and cheap enough to
 * run a dozen springs on every zombie.
 */
export function stepSpring(s: Spring, tune: SpringTune, dt: number): void {
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(MAX_STEP, left);
    s.v += (-tune.stiffness * s.x - tune.damping * s.v) * h;
    s.x += s.v * h;
    left -= h;
  }
}

/**
 * Keeps a big reaction within `limit` while leaving small ones as they
 * are. A burst of buckshot stacks many blows at once; this bends the sum
 * smoothly toward the limit instead of folding the body in half.
 */
export function soften(x: number, limit: number): number {
  return limit * Math.tanh(x / limit);
}
