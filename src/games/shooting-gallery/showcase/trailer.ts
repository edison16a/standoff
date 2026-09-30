import type { TargetKind } from "../engine/kinds";
import { goldenX, plateX, type CameraShot } from "./shots";

/** The clip's length in seconds. The capture films exactly this much, so the edit repeats on it. */
export const PERIOD = 9;
/** The capture films from this many seconds after the first frame. The edit starts there. */
export const LEAD = 3;

/**
 * A playback speed curve: speeds at moments `u` seconds into a shot,
 * straight lines between them. Returns the round time at `u` from
 * `start`, so a shot can slow to a crawl on its hit and pick up again
 * without a jump.
 */
export function ramp(start: number, keys: readonly (readonly [u: number, speed: number])[]): (u: number) => number {
  return (u) => {
    let time = start;
    for (let i = 0; i < keys.length; i++) {
      const [u0, v0] = keys[i]!;
      const [u1, v1] = keys[i + 1] ?? [Infinity, v0];
      if (u <= u0) break;
      const end = Math.min(u, u1);
      const vEnd = u1 === Infinity ? v0 : v0 + ((v1 - v0) * (end - u0)) / (u1 - u0);
      // The area under the speed line between u0 and end.
      time += ((v0 + vEnd) / 2) * (end - u0);
    }
    return time;
  };
}

/** One shot of the edit. */
export interface Cut {
  /** Edit time the shot starts and ends, in seconds. It may run past PERIOD, and so around the loop. */
  from: number;
  to: number;
  /** Round seconds at `u` seconds into the shot. */
  clock: (u: number) => number;
  camera: (u: number, time: number) => CameraShot;
  /** The hit the shot is built around, which a test holds to its moment. */
  moment: { kind: TargetKind; at: number };
}

const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/**
 * The edit: a plate picked off the top rail, a bull seen from right
 * beside it, the whole booth firing, the view down a barrel as it drops
 * a bullseye, and the golden duck taken in slow motion. The first
 * shot runs across the loop, so the clip joins mid shot.
 */
export const CUTS: readonly Cut[] = [
  {
    // Low under the top rail, panning with a plate as it races into the shot.
    from: 7.9, to: 9.5, moment: { kind: "plate", at: 33.16 },
    clock: ramp(32.69, [[0, 1], [0.5, 0.25], [1.3, 0.25], [1.6, 1]]),
    camera: (u, t) => ({ position: [plateX(t) - 1.2 + u * 0.2, 2.35, 0.2], lookAt: [plateX(t) - 0.1, 3.2, -2.75], fov: 34 }),
  },
  {
    // Between the waves, right beside a bullseye as a BB finds the red.
    from: 0.5, to: 1.8, moment: { kind: "bullseye", at: 42.77 },
    clock: ramp(42.39, [[0, 1], [0.4, 0.3], [1.0, 0.3], [1.3, 1]]),
    camera: (u) => ({ position: [1.55 - u * 0.12, 2.25, -1.3], lookAt: [0.84, 2.38, -2.55], fov: 42 }),
  },
  {
    // Low behind the guns, pushing in as all four lasers work the booth.
    from: 1.8, to: 3.3, moment: { kind: "bullseye", at: 37.49 },
    clock: ramp(36.1, [[0, 1]]),
    camera: (u) => ({ position: [-1.7 + u * 0.5, 1.3 + u * 0.08, 5.3 - u * 0.7], lookAt: [0.2, 1.85, -2], fov: 46 }),
  },
  {
    // Along the second gun's barrel as it kicks and drops a bull.
    from: 3.3, to: 4.6, moment: { kind: "bullseye", at: 38.58 },
    clock: ramp(38.18, [[0, 1], [0.45, 0.3], [0.95, 0.3], [1.3, 1]]),
    camera: (u) => ({ position: [-0.16 - u * 0.04, 1.36, 4.8], lookAt: [0.0, 2.2, -2.55], fov: 30 }),
  },
  {
    // Riding along with the golden duck as every laser closes in, the hit in slow motion, then pulling back.
    from: 4.6, to: 7.9, moment: { kind: "golden", at: 39.23 },
    clock: ramp(38.05, [[0, 1], [1.0, 1], [1.2, 0.15], [2.4, 0.15], [2.8, 1]]),
    camera: (u, t) => {
      const back = ease((u - 2.3) / 1.0);
      const x = goldenX(t);
      const look = x + (goldenX(39.23) - x) * back;
      return { position: [x - 0.7 + back * 0.4, 1.08 + back * 0.7, -0.55 + back * 3.2], lookAt: [look + 0.1, 1.12 + back * 0.35, -1.62], fov: 44 + back * 8 };
    },
  },
];

/** The shot at edit time `t`, and how far into it. */
export function cutAt(t: number): { cut: Cut; u: number } {
  const time = ((t % PERIOD) + PERIOD) % PERIOD;
  for (const cut of CUTS) {
    for (const at of [time, time + PERIOD]) if (at >= cut.from && at < cut.to) return { cut, u: at - cut.from };
  }
  throw new Error(`No shot covers ${time}`);
}
