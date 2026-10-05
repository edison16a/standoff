import { buildOf } from "./athlete";
import { hangTime } from "./body/jump";
import { isThree } from "./court";
import type { Match } from "./match";
import { launchShot } from "./shot-launch";
import { gradeRelease } from "./shot-model";
import { stepbackFor } from "./stepback";
import { SHOT } from "./tuning";
import type { Athlete } from "./types";
import { clamp, type V3 } from "./vec";

export { launchShot, slam } from "./shot-launch";

/** The air time follows from the jump's height under real gravity. */
export const JUMPER = { takeoff: (SHOT.takeoff * SHOT.meterMs) / 1000, air: hangTime(0.42), peak: 0.42 } as const;

/** Where the ball leaves the hand on a jumper: above the forehead, a little in front. */
export function releasePoint(a: Athlete): V3 {
  const h = buildOf(a).body.height;
  return { x: a.x + Math.sin(a.yaw) * 0.22, y: a.y + h * 1.17, z: a.z + Math.cos(a.yaw) * 0.22 };
}

/** Starts a jumper and its meter, or at the line a free throw, which is the same meter with no jump. */
export function startJumper(m: Match, a: Athlete, free = false): void {
  // With a defender in the chest the shooter steps back off him first (see `stepback.ts`).
  const step = free ? null : stepbackFor(m, a);
  a.action = { kind: "shoot", t: 0, three: !free && isThree(a), released: false, free, step };
  if (step) {
    a.vx = step.x;
    a.vz = step.z;
    m.emit({ type: "squeak", id: a.id });
  }
  m.emit({ type: "gather", id: a.id, kind: free ? "free" : "jumper" });
}

/** Lets go of a jumper. The phone's hold time is trusted within reason, so lag never costs a green. */
export function releaseJumper(m: Match, a: Athlete, heldMs?: number): void {
  if (a.action.kind !== "shoot" || a.action.released) return;
  a.action.released = true;
  // The whistle can go mid motion (a shot clock violation), and then there is no ball to let go of.
  const free = a.action.free;
  if (m.ball.holder !== a.id || m.phase !== (free ? "freeThrow" : "live")) return;
  const hostMs = a.action.t * 1000;
  const ms = heldMs === undefined ? hostMs : clamp(heldMs, hostMs - 260, hostMs + 60);
  const { grade } = gradeRelease(ms, buildOf(a).stats.shooting, a.onFire, free);
  launchShot(m, a, free ? "free" : "jumper", grade, releasePoint(a));
}

