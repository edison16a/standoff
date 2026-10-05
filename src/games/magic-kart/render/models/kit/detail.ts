/**
 * How finely curves are cut while a kart is being built. The same design
 * code runs twice: once in full for karts near the camera, once coarse
 * for karts far away, where nobody can see the difference but the
 * graphics card still pays for every triangle.
 */
let factor = 1;

/** Builds with every curve cut `f` times as finely, then puts the detail back. */
export function withDetail<T>(f: number, build: () => T): T {
  const before = factor;
  factor = f;
  try {
    return build();
  } finally {
    factor = before;
  }
}

/** A segment count scaled to the current detail, never below `min`. */
export const seg = (n: number, min = 3) => Math.max(min, Math.round(n * factor));
