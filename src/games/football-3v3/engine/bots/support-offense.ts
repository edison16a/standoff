import { attackSign } from "../../teams";
import { isDown } from "../body";
import { ballTrack } from "../catch/track";
import { YARD, yardToX } from "../field";
import { locked } from "../linemen";
import type { Match } from "../match";
import { clinchOf } from "../support/clinch";
import { offenseJob } from "../support/roster";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";
import { ahead, headFor } from "./goal";

/** Seconds after the snap a wing or the lead back with nobody to block leaks out as an outlet. */
const LEAK_AFTER = 1.3;

/** Defenders a blocker could take: on their feet, not locked in the line, and not already someone else's man. */
function targets(m: Match, a: Athlete, near: V2, range: number): Athlete[] {
  const taken = new Set(m.athletes.filter((o) => o.role === "support" && o.team === a.team && o !== a && o.bot.cover !== null).map((o) => o.bot.cover));
  return m.athletes.filter((d) => d.team !== a.team && !isDown(d) && !locked(m, d) && !taken.has(d.id) && !clinchOf(m, d.id) && dist2(d, near) < range);
}

/** Steps into a defender's path to the ball, just short of him so the hands land. */
function blockSpot(d: Athlete, ball: V2): V2 {
  const at = ahead(d, 0.25);
  const dx = ball.x - at.x;
  const dz = ball.z - at.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: at.x + (dx / l) * 0.7, z: at.z + (dz / l) * 0.7 };
}

/**
 * Pass protection: pick up the rusher nearest the QB that nobody has,
 * and stand in his way. A wing or the lead back with nobody coming leaks
 * out a few yards past the line as an outlet, the only place he goes.
 */
function protect(m: Match, a: Athlete, qb: Athlete): void {
  const rushers = targets(m, a, qb, 11).filter((d) => d.role === "support" || d.role === "qb");
  const mark = rushers.sort((p, q) => dist2(p, qb) + dist2(p, a) * 0.5 - (dist2(q, qb) + dist2(q, a) * 0.5))[0] ?? null;
  a.bot.cover = mark?.id ?? null;
  if (mark) return headFor(a, blockSpot(mark, qb), 0.3);
  const since = m.play?.sinceSnap ?? 0;
  if (offenseJob(a.slot) === "tackle" || since < LEAK_AFTER) return headFor(a, a, 1);
  const s = attackSign(a.team);
  headFor(a, { x: yardToX(m.offense, m.drive.los) + s * 4 * YARD, z: a.z }, 1.5);
}

/**
 * Blocking for a runner: take the free defender who is the biggest
 * threat to the ball, the closest to it and the most in front of it,
 * and get in his way. With nobody to take, run ahead of the ball.
 */
function leadBlock(m: Match, a: Athlete, carrier: Athlete): void {
  const s = attackSign(carrier.team);
  const threat = (d: Athlete) => dist2(d, carrier) + dist2(d, a) * 0.6 - ((d.x - carrier.x) * s > 0 ? 3 : 0);
  const mark = targets(m, a, carrier, 18).sort((p, q) => threat(p) - threat(q))[0] ?? null;
  a.bot.cover = mark?.id ?? null;
  if (mark) return headFor(a, blockSpot(mark, carrier), 0.3);
  headFor(a, { x: carrier.x + s * 4, z: carrier.z + (a.z > carrier.z ? 2 : -2) }, 0.5);
}

/**
 * A support player on the side with the ball. He never runs a route: he
 * blocks, keeps driving the man in his hands, and only goes for the ball
 * when it is thrown to him.
 */
export function supportOffense(m: Match, a: Athlete, carrier: Athlete | null): void {
  const track = ballTrack(m, a);
  if (track) {
    a.bot.goal = track;
    return;
  }
  const c = clinchOf(m, a.id);
  const man = c ? m.athlete(c.d) : null;
  if (man) return headFor(a, man, 0.3);
  if (!carrier) return headFor(a, m.ball.pass ? m.ball.pass.spot : a, 1.5);
  const play = m.play;
  const passing = carrier.role === "qb" && play?.call === "throw" && !play.passed && !play.qbRun;
  if (passing) return protect(m, a, carrier);
  leadBlock(m, a, carrier);
}
