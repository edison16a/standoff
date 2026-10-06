import { readBall, withTrack } from "./catch/track";
import { separate } from "./collide";
import { holdOnside } from "./formation";
import { guardMove } from "./guard";
import { updateLinemen } from "./linemen";
import type { Match } from "./match";
import { moveAthlete } from "./motion";
import { paceOf } from "./qb-run";
import { MOVE } from "./tuning";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/**
 * Who may move now. The defence sets itself while the offense calls the
 * play and lines up; in the break between plays and during a kick
 * everyone waits.
 */
function frozen(m: Match, a: Athlete): boolean {
  if (m.phase === "live" || m.phase === "touchdown") return false;
  if (settingUp(m)) return a.team === m.offense;
  return true;
}

export const settingUp = (m: Match) => m.phase === "presnap" || m.phase === "choose" || m.phase === "convert";

/**
 * The stick a player runs on this step. Frozen players stand, Guard
 * tails the receiver, and a person whose pass is in the air reads it:
 * most of his run goes after the ball, as a real receiver tracks it.
 */
function legs(m: Match, a: Athlete, live: boolean): V2 {
  if (frozen(m, a)) return { x: 0, z: 0 };
  if (live && a.guard !== null) return guardMove(m, a, a.guard);
  const read = live && !a.auto ? readBall(m, a) : null;
  return read ? withTrack(a.move, read.stick, read.wait) : a.move;
}

/**
 * Moves every body for one match step in MOVE.substeps fixed sub steps:
 * running, the locked linemen, and the collisions between them all.
 */
export function stepBodies(m: Match, dt: number): void {
  const live = m.phase === "live";
  const holder = m.ball.state === "held" ? m.ball.holder : null;
  const face = { x: m.ball.pos.x, z: m.ball.pos.z };
  const sticks = new Map<number, V2>();
  for (const a of m.athletes) if (a.role !== "lineman") sticks.set(a.id, legs(m, a, live));
  const h = dt / MOVE.substeps;
  for (let i = 0; i < MOVE.substeps; i++) {
    for (const a of m.athletes) {
      if (a.role === "lineman") continue;
      // The stick is kept as sent; freezing, Guard and the read only steer this step.
      const stick = a.move;
      a.move = sticks.get(a.id) ?? stick;
      moveAthlete(a, h, holder === a.id, face, paceOf(m, a));
      a.move = stick;
      if (settingUp(m)) holdOnside(a, m.drive);
    }
    updateLinemen(m, h);
    separate(m, m.bumps);
  }
}
