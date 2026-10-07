import { incomplete } from "./catch/outcome";
import { touchBall } from "./catch/touch";
import { FIELD } from "./field";
import { stepFlight } from "./flight";
import type { Match } from "./match";
import type { V3 } from "./vec";

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
