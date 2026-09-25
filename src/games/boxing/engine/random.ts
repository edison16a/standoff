/**
 * A small seeded random source, so a fight with the same seed plays out
 * the same way. The showcase depends on that, since the capture tool
 * steps time frame by frame and a clip must look the same every run.
 */
export type Random = () => number;

export function seeded(seed: number): Random {
  let state = seed >>> 0 || 1;
  return () => {
    // mulberry32: fast, and good enough for choosing punches.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number between two values. */
export function between(random: Random, low: number, high: number): number {
  return low + (high - low) * random();
}

/** Picks from weighted choices. */
export function pick<T>(random: Random, choices: readonly (readonly [T, number])[]): T {
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of choices) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return choices[choices.length - 1]![0];
}
