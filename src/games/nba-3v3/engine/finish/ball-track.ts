import { buildOf } from "../athlete";
import type { Athlete } from "../types";
import type { V3 } from "../vec";
import { DUNK_SPEC } from "./dunks";
import { LAYUP_SPEC } from "./layups";
import { ARM_USE, armLength, shoulderAt, withinReach } from "./reach";
import type { FinishSpec, TrackKey } from "./spec";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/** The preset a drive is playing. */
export function specOf(act: Drive): FinishSpec {
  if (act.dunk) return DUNK_SPEC[act.style ?? "flush"];
  return LAYUP_SPEC[act.layup ?? "finger"];
}

/** Where a drive is on its own scale: 0 to 1 through the gather, 1 to 2 through the flight to the release. */
export function phaseOf(act: Pick<Drive, "takeoff" | "finish">, t: number): number {
  if (t < act.takeoff) return t / Math.max(1e-3, act.takeoff);
  return 1 + Math.min(1, (t - act.takeoff) / Math.max(1e-3, act.finish - act.takeoff));
}

const smooth = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};

type Axis = "f" | "x" | "y";

/** A smooth curve through the keys (cubic Hermite with averaged slopes), so the ball never stops dead at a key. */
function along(keys: readonly TrackKey[], s: number, c: Axis): number {
  const n = keys.length;
  if (s <= keys[0]!.s) return keys[0]![c];
  if (s >= keys[n - 1]!.s) return keys[n - 1]![c];
  let i = 0;
  while (keys[i + 1]!.s < s) i++;
  const p0 = keys[i]!;
  const p1 = keys[i + 1]!;
  const h = p1.s - p0.s;
  const slope = (j: number) => {
    if (j <= 0 || j >= n - 1) return 0;
    return (keys[j + 1]![c] - keys[j - 1]![c]) / (keys[j + 1]!.s - keys[j - 1]!.s);
  };
  const u = (s - p0.s) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0[c] + (u3 - 2 * u2 + u) * h * slope(i) + (-2 * u3 + 3 * u2) * p1[c] + (u3 - u2) * h * slope(i + 1);
}

/** Body frame (ahead, toward the hand, height share) to the world, for a body at `at` facing `yaw`. */
function toWorld(a: Athlete, at: V3, yaw: number, hand: number, f: number, x: number, y: number, out: V3): V3 {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  out.x = at.x + fx * f - fz * x * hand;
  out.z = at.z + fz * f + fx * x * hand;
  out.y = at.y + y * buildOf(a).body.height;
  return out;
}

const body: V3 = { x: 0, y: 0, z: 0 };
const shoulder: V3 = { x: 0, y: 0, z: 0 };
const start: V3 = { x: 0, y: 0, z: 0 };

/**
 * Where the ball is in the hands at this moment of a drive: eased from
 * where the last dribble left it onto the preset's path, along the
 * path, then into the release point at the rim. It never leaves the
 * arm's reach, so a drawn hand can always be on it.
 */
export function ballInHands(a: Athlete, act: Drive, out: V3): V3 {
  const spec = specOf(act);
  const s = phaseOf(act, act.t);
  const keys = spec.track;
  body.x = a.x;
  body.y = a.y;
  body.z = a.z;
  toWorld(a, body, a.yaw, act.hand, along(keys, s, "f"), along(keys, s, "x"), along(keys, s, "y"), out);
  // From where the ball was as the gather began, carried along with the body.
  // A sixth of a second at least to get the ball up off the bounce, however quick the gather.
  const first = Math.max(keys[0]!.s, Math.min(0.9, 0.16 / Math.max(1e-3, act.takeoff)));
  if (s < first) {
    const k = smooth(s / first);
    start.x = act.pick.x + (a.x - act.from.x);
    start.y = act.pick.y + a.y;
    start.z = act.pick.z + (a.z - act.from.z);
    out.x = start.x + (out.x - start.x) * k;
    out.y = start.y + (out.y - start.y) * k;
    out.z = start.z + (out.z - start.z) * k;
  }
  if (s > spec.blendFrom) {
    const k = smooth((s - spec.blendFrom) / (2 - spec.blendFrom));
    out.x += (act.release.x - out.x) * k;
    out.y += (act.release.y - out.y) * k;
    out.z += (act.release.z - out.z) * k;
  }
  shoulderAt(a, body, a.yaw, act.hand, shoulder);
  return withinReach(out, shoulder, armLength(a) * ARM_USE);
}

/**
 * How much each hand is on the ball now, 0 to 1, for the drawn arms:
 * the finishing hand all the way to the release, the other while the
 * track says two hands, and both on a two hand dunk.
 */
export function handsOn(act: Drive): { main: number; off: number } {
  const spec = specOf(act);
  const keys = spec.track;
  const s = phaseOf(act, act.t);
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1]!.s <= s) i++;
  const now = keys[i]!;
  const next = keys[i + 1];
  let off = now.two ? 1 : 0;
  // Eased away (or back on) across the segment, so the hand never snaps.
  if (next && next.two !== now.two) {
    const u = smooth((s - now.s) / Math.max(1e-3, next.s - now.s));
    off = now.two ? 1 - u : u;
  }
  // Before the first key the ball is still coming up off the bounce into both hands.
  if (s < keys[0]!.s) off = smooth(s / keys[0]!.s);
  // A two hand dunk takes the second hand back to the ball for the slam.
  if (act.dunk && DUNK_SPEC[act.style ?? "flush"].hands === 2 && s > spec.blendFrom) off = Math.max(off, smooth((s - spec.blendFrom) / 0.15));
  return { main: 1, off };
}
