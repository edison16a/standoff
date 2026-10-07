import { LOOSE, type BlockKind } from "./block-preset";
import { knockDown } from "./down";
import type { LinePair } from "./linemen";
import type { Match } from "./match";
import { moveAthlete } from "./motion";
import type { Athlete } from "./types";
import { dir2, type V2 } from "./vec";

/**
 * Two linemen no longer locked together. A pancake puts the rusher on
 * his back with the blocker standing over him; a shed has the rusher
 * rip past and go after the ball while the beaten blocker stumbles,
 * then turns and chases him. From then on each moves on his own legs
 * like any other player, and the rusher can still grab a carrier
 * going by (linemen.ts `lineContact`).
 */

/** Speed the rusher bursts past his man with on a shed, metres a second. */
const RIP = 3.2;

/** Breaks a pair up with the move that beat it. `o` is the blocker, `d` the rusher. */
export function breakPair(m: Match, p: LinePair, o: Athlete, d: Athlete, kind: BlockKind): void {
  p.engaged = false;
  p.loose = kind === "pancake" ? "pancake" : "shed";
  p.v = 0;
  m.emit({ type: "pads", a: o.id, b: d.id, power: 1 });
  if (kind === "pancake") {
    knockDown(d, LOOSE.pancakeDown, "pancaked");
    // Driven onto his back, he slides on a touch the way he was shoved.
    const back = dir2(o, d);
    d.vx = back.x * 1.5;
    d.vz = back.z * 1.5;
    return;
  }
  // Ripped past: the rusher turns the corner toward the ball, the blocker is spun off balance.
  const to = goalOf(m, d) ?? { x: o.x, z: o.z };
  const past = dir2(d, to);
  d.vx = past.x * RIP;
  d.vz = past.z * RIP;
  d.yaw = Math.atan2(past.x, past.z);
  const across = past.x * Math.cos(o.yaw) - past.z * Math.sin(o.yaw);
  o.stumble = { t: 0, dur: LOOSE.beaten, side: across >= 0 ? 1 : -1 };
  o.stagger = Math.max(o.stagger, LOOSE.beaten);
}

/** Where a loose rusher is going: the ball, while the offense has it. */
function goalOf(m: Match, a: Athlete): V2 | null {
  const c = m.carrier();
  return c && c.team !== a.team ? { x: c.x, z: c.z } : null;
}

/** One sub step of two loose linemen running on their own legs. */
export function moveLoose(m: Match, p: LinePair, o: Athlete, d: Athlete, since: number, dt: number): void {
  for (const a of [o, d]) {
    // The blocker stands over the man he flattened, or rights himself, before he goes after anyone.
    const waiting = a === o && since < (p.loose === "pancake" ? LOOSE.overHim : LOOSE.beaten);
    const goal = a === d ? goalOf(m, a) : waiting ? null : d.action.kind === "down" ? null : { x: d.x, z: d.z };
    a.move = goal ? dir2(a, goal) : { x: 0, z: 0 };
    moveAthlete(a, dt, false, goal, 1);
  }
}
