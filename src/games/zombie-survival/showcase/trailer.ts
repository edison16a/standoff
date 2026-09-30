import type { CameraShot } from "./cinema/cinema-set";

type Point = { x: number; y: number; z: number };

/** The clip's length in seconds. The capture films exactly this much, so the edit repeats on it. */
export const PERIOD = 10;
/** The capture films from this many seconds after the first frame. The edit starts there. */
export const LEAD = 3;

/**
 * A playback speed curve: speeds at moments `u` seconds into a shot,
 * straight lines between them. Returns the story time at `u`, starting
 * from `start`, so a shot can slow to a crawl on its big moment and
 * pick up again without a jump.
 */
export function ramp(start: number, keys: readonly (readonly [u: number, speed: number])[]): (u: number) => number {
  return (u) => {
    let s = start;
    for (let i = 0; i < keys.length; i++) {
      const [u0, v0] = keys[i]!;
      const [u1, v1] = keys[i + 1] ?? [Infinity, v0];
      if (u <= u0) break;
      const end = Math.min(u, u1);
      const k = (end - u0) / (u1 === Infinity ? 1 : u1 - u0);
      // The area under the speed line between u0 and end.
      const vEnd = u1 === Infinity ? v0 : v0 + (v1 - v0) * k;
      s += ((v0 + vEnd) / 2) * (end - u0);
    }
    return s;
  };
}

interface Base {
  /** Edit time the shot starts and ends, in seconds. It may run past PERIOD, and so around the loop. */
  from: number;
  to: number;
  /** Seeds the shot's sprays, so the same shot always plays the same. */
  seed: number;
}

export interface ChaseCut extends Base {
  kind: "chase";
  story: (u: number) => number;
  camera: (u: number, truck: Point) => CameraShot;
}

export interface PlayCut extends Base {
  kind: "play";
  /** Game seconds into the fight at `u`. */
  clock: (u: number) => number;
}

export type Cut = ChaseCut | PlayCut;

/** A slow handheld drift, the same every take. */
const shake = (u: number, amount: number) => [Math.sin(u * 7.1) * amount, Math.sin(u * 5.3 + 1) * amount * 0.7, 0] as const;

/**
 * The edit: out on the road with the truck, doorways spilling runners
 * after it, over the team's shoulders in the bed, a runner flying at
 * the tailgate shot down in slow motion, then into the game itself. The
 * first shot runs across the loop, so the clip joins mid shot.
 */
export const CUTS: readonly Cut[] = [
  {
    // Low and wide, swinging from the headlights round to the team firing back.
    kind: "chase", from: 8.8, to: 11.3, seed: 11, story: ramp(0.2, [[0, 1]]),
    camera: (u, t) => {
      const a = -0.45 - u * 0.26;
      const r = 7.6 - u * 0.4;
      return { position: [t.x + Math.sin(a) * r, 0.62 + u * 0.08, t.z + 1.2 - Math.cos(a) * r], lookAt: [t.x, 1.55, t.z + 2.2], fov: 44, roll: -0.04 };
    },
  },
  {
    // At the curb as the truck roars past, and the doorways behind it burst open.
    kind: "chase", from: 1.3, to: 2.7, seed: 12, story: ramp(4.1, [[0, 1], [0.35, 0.5], [1.0, 0.55], [1.4, 1.1]]),
    camera: (u) => ({ position: [4.3 + u * 0.1, 0.42, -46.5], lookAt: [3.4 - u * 0.4, 1.25, -38], fov: 48, roll: 0.05 }),
  },
  {
    // Over the team's shoulders from beside the bed, the pack filling the road behind.
    kind: "chase", from: 2.7, to: 3.9, seed: 13, story: ramp(4.85, [[0, 1]]),
    camera: (u, t) => {
      const [sx, sy] = shake(u, 0.04);
      return { position: [t.x + 1.35 + sx, 2.45 + sy, t.z + 0.9], lookAt: [t.x - 0.5, 1.2, t.z + 14], fov: 48 };
    },
  },
  {
    // Low on the road behind a runner as it leaps for the tailgate, and the shotgun meets it in the air.
    kind: "chase", from: 3.9, to: 5.1, seed: 14, story: ramp(5.72, [[0, 1], [0.45, 0.2], [0.8, 0.2], [1.0, 0.9]]),
    camera: (u, t) => ({ position: [t.x + 1.1, 0.7 + u * 0.1, t.z + 8.6 - u * 0.3], lookAt: [t.x - 0.1, 1.9, t.z + 3.2], fov: 44, roll: -0.03 }),
  },
  // Then the game itself: the team's guns, the lasers and the Butcher in his alley.
  { kind: "play", from: 5.1, to: 8.8, seed: 15, clock: ramp(0, [[0, 1]]) },
];

/** The shot at edit time `t`, and how far into it. */
export function cutAt(t: number): { cut: Cut; u: number } {
  const time = ((t % PERIOD) + PERIOD) % PERIOD;
  for (const cut of CUTS) {
    for (const at of [time, time + PERIOD]) if (at >= cut.from && at < cut.to) return { cut, u: at - cut.from };
  }
  throw new Error(`No shot covers ${time}`);
}
