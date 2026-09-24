/**
 * A small seeded random source (mulberry32). The match draws every roll
 * from one of these, so a seed replays the same game exactly. That keeps
 * the tests honest and the showcase identical on every capture.
 */
export type Rng = () => number;

export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number between `min` and `max`. */
export function between(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Picks a key with probability in proportion to its weight. */
export function weighted<K extends string>(rng: Rng, weights: Partial<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= Math.max(0, w);
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1]![0];
}

/** A roughly bell shaped number around zero with the given spread. */
export function gaussian(rng: Rng, spread: number): number {
  return (rng() + rng() + rng() - 1.5) * spread * 1.4;
}
