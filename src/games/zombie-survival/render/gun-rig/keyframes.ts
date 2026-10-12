import { mix, type Mixable } from "./pose";

/**
 * How a value travels into a key. Hands mostly move smoothly; a part let
 * go under a spring, like a bolt slamming home, speeds up all the way and
 * stops dead; a hand pulling something starts hard and eases off.
 */
export type Ease = "smooth" | "in" | "out" | "linear";

const EASES: Record<Ease, (t: number) => number> = {
  smooth: (t) => t * t * (3 - 2 * t),
  in: (t) => t * t * t,
  out: (t) => 1 - (1 - t) ** 3,
  linear: (t) => t,
};

const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

/** 0 before `a`, rising smoothly to 1 at `b`. A zero width span is a step. */
export function span(t: number, a: number, b: number, ease: Ease = "smooth"): number {
  if (b <= a) return t >= a ? 1 : 0;
  return EASES[ease](clamp01((t - a) / (b - a)));
}

/** One key: at this time the value is this, reached with this ease. */
export type Key<T> = readonly [at: number, value: T, ease?: Ease];

/**
 * The value at time `t` of a list of keys sorted by time. It holds the
 * first value before the first key and the last after the last, and eases
 * between neighbours. Numbers, tuples and poses all work, through `mix`.
 */
export function play<T extends Mixable>(keys: readonly Key<T>[], t: number): T {
  const first = keys[0];
  if (!first) throw new Error("play needs at least one key");
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [at, value, ease = "smooth"] = keys[i]!;
    if (t < at) {
      const [from, prev] = keys[i - 1]!;
      return mix(prev, value, span(t, from, at, ease));
    }
  }
  return keys[keys.length - 1]![1];
}

/**
 * A sharp hit that rings out, like a magazine slapped home or a bolt
 * slamming forward: nothing before `at`, a kick, then a quick wobble that
 * dies away. Peaks near 1 a few hundredths of a second after the hit.
 */
export function jolt(t: number, at: number, ring = 42, decay = 18): number {
  const d = t - at;
  if (d < 0) return 0;
  return Math.exp(-d * decay) * Math.sin(d * ring) * 1.6;
}
