import { attackSign } from "../teams";
import { isDown } from "./athlete";
import { carryCommand } from "./bot-carry";
import { quarterbackCommand } from "./bot-qb";
import { gain } from "./field";
import { routeTarget } from "./routes";
import { carrierOf } from "./tackle";
import type { Athlete, Command, MatchState } from "./types";
import { add, clampLen, dist, flat, norm, scale, sub, v2, type Vec2 } from "./vec";

/** A stick toward a point, full on from this far out and easing in closer. */
export function toward(from: Vec2, to: Vec2, full = 2): Vec2 {
  return clampLen(scale(sub(to, from), 1 / full), 1);
}

/**
 * A computer player on the side with the ball. The carrier runs (or, in
 * the pocket, plays quarterback); the target of a pass runs onto it; the
 * others block for a carrier or run their routes.
 */
export function offenseCommand(state: MatchState, a: Athlete, since: number): Command {
  const play = state.play;
  if (play.carrier === a.id) {
    const pocket = a.role === "qb" && !play.thrown && !play.intercepted && gain(state.drive.offense, state.drive.los, a.pos.x) <= 0.5;
    if (state.ball.mode === "snap") return { move: v2() };
    return pocket ? quarterbackCommand(state, a, since) : carryCommand(state, a);
  }
  const pass = play.pass;
  if (pass && pass.target === a.id) {
    // Arrive at the catch point when the ball does: no sooner, no later.
    const left = Math.max(0.15, pass.eta - pass.t);
    const need = sub(flat(pass.catchAt), a.pos);
    return { move: clampLen(scale(need, 1 / (left * 9)), 1) };
  }
  const carrier = carrierOf(state);
  if (carrier && carrier.team === a.team && (carrier.role !== "qb" || play.thrown || play.intercepted || gain(carrier.team, state.drive.los, carrier.pos.x) > 0.5)) {
    return { move: blockFor(state, a, carrier) };
  }
  if (a.route) {
    const t = routeTarget(a.route, a.pos);
    if (!t) return { move: v2() };
    return { move: norm(sub(t, a.pos)) };
  }
  // A quarterback who has thrown drifts behind the play.
  return { move: v2() };
}

/** Gets between the carrier and the nearest chaser to screen him off. */
function blockFor(state: MatchState, a: Athlete, carrier: Athlete): Vec2 {
  let chaser: Athlete | null = null;
  for (const d of state.athletes) {
    if (d.team === a.team || isDown(d)) continue;
    if (!chaser || dist(d.pos, carrier.pos) < dist(chaser.pos, carrier.pos)) chaser = d;
  }
  if (!chaser) return toward(a.pos, add(carrier.pos, v2(attackSign(a.team) * 5, 0)));
  const between = add(chaser.pos, norm(sub(carrier.pos, chaser.pos)), 0.9);
  return toward(a.pos, between, 1.2);
}
