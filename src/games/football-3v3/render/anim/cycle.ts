/**
 * Periodic curves for the legs: a value given at a few points round a
 * cycle from 0 to 1, joined by a smooth curve that wraps from the last
 * key back to the first, so a stride repeats with no kink.
 */
export type CycleKeys = readonly (readonly [number, number])[];

const wrap = (v: number) => ((v % 1) + 1) % 1;

/** The value at `phase` on a closed Catmull-Rom curve through the keys, which must be in order within [0, 1). */
export function cycle(keys: CycleKeys, phase: number): number {
  const n = keys.length;
  const t = wrap(phase);
  let i = n - 1;
  for (let k = 0; k < n; k++) if (keys[k]![0] <= t) i = k;
  const at = (k: number) => keys[((k % n) + n) % n]!;
  // Key times either side, unwrapped so they run in order through the seam.
  const span = (from: number, to: number) => wrap(at(to)[0] - at(from)[0]) || 1;
  const t1 = at(i)[0];
  const d12 = span(i, i + 1);
  const d01 = span(i - 1, i);
  const d23 = span(i + 1, i + 2);
  const u = wrap(t - t1) / d12;
  const [p0, p1, p2, p3] = [at(i - 1)[1], at(i)[1], at(i + 1)[1], at(i + 2)[1]];
  // Tangents scaled for uneven key spacing, so the curve keeps its pace through every key.
  const m1 = ((p2 - p0) / (d01 + d12)) * d12;
  const m2 = ((p3 - p1) / (d12 + d23)) * d12;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
}
