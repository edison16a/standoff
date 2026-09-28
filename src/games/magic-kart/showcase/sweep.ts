/** Where a chase camera sits behind the pack. Distances are metres, the field of view degrees. */
export interface Framing {
  back: number;
  side: number;
  height: number;
  fov: number;
}

/** A framing the sweep passes through at a race time, in seconds after the start signal. */
export interface SweepKey extends Framing {
  at: number;
}

const out: Framing = { back: 0, side: 0, height: 0, fov: 0 };

/** Eases in and out of every key, so the camera never starts or stops with a jolt. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * The framing a sweep holds at a race time. Before the first key and
 * after the last it holds still. Keys are read in order of time. The
 * returned object is reused, so read it before the next call.
 */
export function framingAt(keys: readonly SweepKey[], time: number): Framing {
  const first = keys[0]!;
  let a = first;
  let b = first;
  for (const key of keys) {
    b = key;
    if (key.at >= time) break;
    a = key;
  }
  const span = b.at - a.at;
  const t = span > 0 ? smooth(Math.min(1, Math.max(0, (time - a.at) / span))) : 0;
  out.back = a.back + (b.back - a.back) * t;
  out.side = a.side + (b.side - a.side) * t;
  out.height = a.height + (b.height - a.height) * t;
  out.fov = a.fov + (b.fov - a.fov) * t;
  return out;
}
