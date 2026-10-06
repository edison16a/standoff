import { cycleLength } from "../engine/stride";
import type { MatchView } from "../engine/view";

/**
 * A development view of the gaits: the six builds run laps of their own
 * circles round the centre spot, one walking, one jogging, two running,
 * one sprinting, and one that sprints, brakes to a stop, stands and goes
 * again. The circles bank the runners into the turn; the stops show the
 * braking. It drives the drawn view directly, as the match would.
 */

/** Each runner's circle radius and speed in metres a second; a negative speed is the stop and go. */
const LAPS: readonly (readonly [number, number])[] = [
  [3, 1.3],
  [5, 3],
  [7, 5],
  [9, 6.5],
  [11, 8.4],
  [13, -1],
];

/** The stop and go runner's speed `t` seconds in: four seconds round the loop. */
function stopAndGo(t: number): number {
  const u = t % 4;
  if (u < 1.6) return Math.min(8, 1 + u * 5);
  if (u < 2.3) return Math.max(0, 8 - (u - 1.6) * 12);
  if (u < 3.2) return 0;
  return (u - 3.2) * 4;
}

/** How far a runner has gone round `t` seconds in, integrated finely so the stride matches the ground covered. */
function travelled(speed: number, t: number): { dist: number; stride: number; v: number } {
  if (speed >= 0) return { dist: speed * t, stride: (speed * t) / cycleLength(speed), v: speed };
  let dist = 0;
  let stride = 0;
  const h = 1 / 240;
  for (let s = 0; s < t; s += h) {
    const v = stopAndGo(s);
    dist += v * h;
    stride += (v * h) / cycleLength(v);
  }
  return { dist, stride, v: stopAndGo(t) };
}

/** The view `t` seconds into the laps, built over `base`. */
export function runView(base: MatchView, t: number): MatchView {
  const athletes = base.athletes.map((a, i) => {
    const [r, speed] = LAPS[i % LAPS.length]!;
    const { dist, stride, v } = travelled(speed, t);
    // Anticlockwise from the top: the centre is on each runner's left.
    const angle = dist / r + i;
    const x = r * Math.cos(angle);
    const z = -r * Math.sin(angle);
    const facing = Math.atan2(-Math.cos(angle), -Math.sin(angle));
    return { ...a, x, z, facing, speed: v, stride, action: "free" as const, hasBall: false };
  });
  return { ...base, time: t, athletes };
}
