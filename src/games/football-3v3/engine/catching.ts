import { isDown, statsOf } from "./body";
import { coverReach } from "./build-effects";
import { incomplete } from "./catch/outcome";
import { touchBall } from "./catch/touch";
import { FIELD } from "./field";
import { stepFlight } from "./flight";
import type { Match } from "./match";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import { dist2, norm2, type V2, type V3 } from "./vec";

/** Defenders who can make a play on the ball: on their feet and not tailing someone on Guard. */
const canPlayBall = (d: Athlete) => d.role !== "lineman" && !isDown(d) && d.guard === null;

/**
 * A defender sitting in front of the target when the ball is thrown:
 * near the catch spot and between it and the QB. He reads the throw and
 * breaks on the ball (a computer defender may then catch it, which
 * otherwise only knocks passes down); the ball itself goes where it was
 * thrown and the hands decide.
 */
export function jumpingDefender(m: Match, qb: Athlete, from: V3, spot: V2, target: Athlete, read = 1): Athlete | null {
  const dir = norm2({ x: spot.x - from.x, z: spot.z - from.z });
  const along = (p: V2) => (p.x - from.x) * dir.x + (p.z - from.z) * dir.z;
  let best: Athlete | null = null;
  for (const d of m.athletes) {
    if (d.team === qb.team || !canPlayBall(d)) continue;
    if (dist2(d, spot) > PASS.jumpRadius * read * coverReach(statsOf(d)) || along(d) >= along(target)) continue;
    if (!best || dist2(d, spot) < dist2(best, spot)) best = d;
  }
  return best;
}

/** A pass that has gone past where anyone could catch it in bounds. */
const gone = (p: V3) => Math.abs(p.z) > FIELD.halfWidth + 1.5 || Math.abs(p.x) > FIELD.endX + 1.5;

/**
 * Flies a pass one step through the real physics, checking every pair
 * of hands it passes on each sub step. It ends in someone's hands, or
 * incomplete once it touches the turf or sails out of reach.
 */
export function updatePass(m: Match, dt: number): void {
  const pass = m.ball.pass;
  const f = m.ball.flight;
  if (!pass || !f) return;
  stepFlight(f, dt, (from) => touchBall(m, from));
  pass.t += dt;
  m.ball.pos = { ...f.pos };
  if (m.ball.state !== "pass") return;
  if (f.grounded || gone(f.pos)) incomplete(m, pass.to);
}
