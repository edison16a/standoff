/**
 * Small easing helpers the animations are written with. Keyframe tracks
 * ease in and out between keys, so every motion starts and stops softly.
 */

export type P3 = readonly [number, number, number];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0 to 1 with soft ends. */
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Up and back down over 0 to 1, peaking in the middle. */
export const bump = (v: number) => (v <= 0 || v >= 1 ? 0 : Math.sin(Math.PI * v));

/** A sharp rise and an exponential settle: a kick that lands at once and eases back. */
export function kick(t: number, rise: number, settle: number): number {
  if (t < 0 || !Number.isFinite(t)) return 0;
  if (t < rise) return smooth(t / rise);
  return Math.exp(-(t - rise) / settle);
}

/** A number eased between keys `[at, value]`, which must be in order of `at`. */
export function track(p: number, keys: readonly (readonly [number, number])[]): number {
  const first = keys[0]!;
  if (p <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [at, v] = keys[i]!;
    if (p <= at) {
      const [at0, v0] = keys[i - 1]!;
      return v0 + (v - v0) * smooth((p - at0) / Math.max(1e-6, at - at0));
    }
  }
  return keys[keys.length - 1]![1];
}

/** A point eased between keys `[at, [x, y, z]]`. */
export function track3(p: number, keys: readonly (readonly [number, P3])[]): [number, number, number] {
  const first = keys[0]!;
  if (p <= first[0]) return [...first[1]];
  for (let i = 1; i < keys.length; i++) {
    const [at, v] = keys[i]!;
    if (p <= at) {
      const [at0, v0] = keys[i - 1]!;
      const k = smooth((p - at0) / Math.max(1e-6, at - at0));
      return [v0[0] + (v[0] - v0[0]) * k, v0[1] + (v[1] - v0[1]) * k, v0[2] + (v[2] - v0[2]) * k];
    }
  }
  return [...keys[keys.length - 1]![1]];
}

/** Moves `current` toward `target` at `rate` per second, the same whatever the frame rate. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
