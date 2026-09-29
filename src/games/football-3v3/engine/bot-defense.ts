import { attackSign } from "../teams";
import { isDown, topSpeed } from "./athlete";
import { toward } from "./bot-offense";
import { botSkill, sloppiness } from "./bot-skill";
import { gain } from "./field";
import { carrierOf } from "./tackle";
import { TACKLE } from "./tuning";
import type { Athlete, Command, MatchState } from "./types";
import { add, dist, flat, sub, v2, type Vec2 } from "./vec";

/**
 * Man coverage: the defence's runners take the offence's runners in
 * order and the quarterback rushes. With fewer runners to cover, the
 * spare men rush too.
 */
export function assignment(state: MatchState, d: Athlete): Athlete | null {
  const attackers = state.athletes.filter((a) => a.team !== d.team && a.role === "runner");
  const covers = state.athletes.filter((a) => a.team === d.team && a.role === "runner");
  const i = covers.indexOf(d);
  return i >= 0 ? (attackers[i] ?? null) : null;
}

/** Still in the pocket: the quarterback holding the ball behind the line before any throw. */
function inPocket(state: MatchState, c: Athlete): boolean {
  const play = state.play;
  return c.role === "qb" && !play.thrown && !play.intercepted && gain(c.team, state.drive.los, c.pos.x) <= 0.5;
}

/** Runs at where the carrier will be, not where he is, and tackles once he is close and the bot has reacted. */
function pursue(state: MatchState, d: Athlete, c: Athlete, rush: boolean, dt: number): Command {
  const eta = dist(c.pos, d.pos) / Math.max(4, topSpeed(state, d));
  const lead = add(c.pos, c.vel, Math.min(1.2, eta) * (1 - sloppiness(state) * 0.6));
  const cmd: Command = { move: toward(d.pos, lead, 1), rush };
  if (dist(c.pos, d.pos) < TACKLE.range * 0.85) {
    // Time in range counts up to the bot's reaction before it throws itself at him.
    d.brain.react += dt;
    if (d.brain.react >= botSkill(state).reaction * 0.6) cmd.tackle = true;
  } else d.brain.react = 0;
  return cmd;
}

/** Sits goal side of the man, reacting late by the bot's reaction time. */
function cover(state: MatchState, d: Athlete, mark: Athlete): Command {
  const late = botSkill(state).reaction * 0.5;
  const seen = sub(mark.pos, { x: mark.vel.x * late, z: mark.vel.z * late });
  const spot: Vec2 = add(add(seen, mark.vel, 0.4), v2(attackSign(mark.team), 0), 1.6);
  return { move: toward(d.pos, spot, 1.5) };
}

/**
 * A computer defender. A pass in the air draws the nearest defenders to
 * where it comes down, which is how bots intercept: by getting there. A
 * carrier out of the pocket is chased down by everyone. Before that the
 * cover men stay on their man and the others rush the quarterback.
 */
export function defenseCommand(state: MatchState, d: Athlete, dt: number): Command {
  if (!botSkill(state).acts || isDown(d)) return { move: v2() };
  const pass = state.play.pass;
  if (pass) {
    const spot = flat(pass.catchAt);
    const target = state.athletes[pass.target];
    const mine = target && assignment(state, d) === target;
    if (mine || dist(d.pos, spot) < 8) return { move: toward(d.pos, spot, 1) };
  }
  const c = carrierOf(state);
  const mark = assignment(state, d);
  if (c && c.team !== d.team) {
    if (!inPocket(state, c) || !mark) return pursue(state, d, c, true, dt);
    return cover(state, d, mark);
  }
  if (mark) return cover(state, d, mark);
  return { move: v2() };
}
