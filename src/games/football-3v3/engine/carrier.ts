import { diveBallSpot } from "./dive";
import { FIELD, gain, goalLineOf, inEndZone } from "./field";
import { carrierOf } from "./tackle";
import type { MatchState } from "./types";
import { clamp } from "./vec";

/**
 * The carrier's spot each step, checked against the lines: across the
 * goal line is a touchdown the moment the ball breaks the plane, and a
 * foot over the sideline or end line ends the play there.
 */
export function checkCarrier(state: MatchState): void {
  const play = state.play;
  const c = carrierOf(state);
  if (!c || play.end || state.ball.mode !== "held") return;
  const ball = c.action === "dive" ? diveBallSpot(c) : c.pos;
  if (inEndZone(play.carrierTeam, ball.x) && Math.abs(ball.z) <= FIELD.halfWidth) {
    play.end = "touchdown";
    play.spot = { x: goalLineOf(play.carrierTeam), z: clamp(ball.z, -FIELD.halfWidth, FIELD.halfWidth) };
    return;
  }
  if (Math.abs(c.pos.z) > FIELD.halfWidth || Math.abs(c.pos.x) > FIELD.endLine) {
    play.end = "out";
    play.spot = { x: clamp(c.pos.x, -FIELD.endLine, FIELD.endLine), z: clamp(c.pos.z, -FIELD.halfWidth, FIELD.halfWidth) };
    state.events.push({ type: "out", athlete: c.id });
  }
}

/**
 * Yards for the stat sheet once the whistle goes: the gain on a completed
 * pass to the passer and receiver, and yards with the ball in hand
 * (a scramble, a run after the catch, a return) as rushing yards.
 */
export function creditYards(state: MatchState): void {
  const play = state.play;
  const c = carrierOf(state);
  if (!c || !play.end || play.end === "incomplete") return;
  const x = play.spot.x;
  c.stats.rushYards += Math.round(gain(play.carrierTeam, play.gotAt, x));
  if (play.receiver === null || play.intercepted) return;
  const total = Math.round(gain(state.drive.offense, state.drive.los, x));
  c.stats.recYards += total;
  const thrower = play.pass?.thrower ?? state.athletes.find((a) => a.team === c.team && a.role === "qb")?.id;
  const qb = thrower === undefined ? null : state.athletes[thrower];
  if (qb) qb.stats.passYards += total;
}
