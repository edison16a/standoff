import { inBounds, xToYard } from "../field";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { endPlay } from "../whistle";

/**
 * How a pass ends: in someone's hands or on the turf. The ball keeps
 * its flight after an incompletion, so it bounces away as a real ball
 * does while the whistle blows.
 */

/** Keeps a forward pass for the replay's numbers; a pitch is part of a run. */
function keepPass(m: Match): void {
  if (m.ball.pass && !m.ball.pass.pitch) m.lastPass = m.ball.pass;
}

function give(m: Match, a: Athlete): void {
  keepPass(m);
  m.ball.state = "held";
  m.ball.holder = a.id;
  m.ball.flight = null;
  m.ball.pass = null;
}

export function incomplete(m: Match, id: number | null): void {
  keepPass(m);
  m.ball.state = "loose";
  m.ball.pass = null;
  m.emit({ type: "incomplete", id });
  endPlay(m, "incomplete");
}

/** A receiver holds on. Only with his feet in bounds; a pitch taken is just the run going on. */
export function caught(m: Match, r: Athlete): void {
  if (!inBounds(r)) return incomplete(m, r.id);
  const pitch = m.ball.pass?.pitch ?? false;
  give(m, r);
  if (pitch) return m.emit({ type: "takePitch", id: r.id });
  m.play!.caughtBy = r.id;
  m.qbOf(r.team).stats.completions++;
  r.stats.catches++;
  m.emit({ type: "catch", id: r.id, yards: Math.round(xToYard(r.team, r.x) - m.drive.los) });
}

export function intercepted(m: Match, d: Athlete, from: number): void {
  give(m, d);
  m.play!.intercepted = true;
  d.stats.interceptions++;
  m.emit({ type: "intercept", id: d.id, from });
}
