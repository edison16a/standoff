import { attackSign, other } from "../teams";
import { isHuman, setAction } from "./athlete";
import { stepTumble } from "./ball";
import { botSkill, sloppiness } from "./bot-skill";
import { FIELD, inOwnEndZone, yardsToGoal } from "./field";
import { quarterback, setKickFormation } from "./formation";
import { crossing, kickLength, kickVelocity, powerNeeded } from "./kick-flight";
import { aimMeter, powerMeter } from "./meters";
import { KICK } from "./tuning";
import type { Command, KickKind, MatchState } from "./types";
import { clamp, v3 } from "./vec";

/** The kick a Kick call makes from here: an extra point on a try, a field goal in range, else a punt. */
export function kickKind(state: MatchState): KickKind {
  if (state.play.isTry) return "pat";
  const length = yardsToGoal(state.drive.offense, state.drive.los) + KICK.setBack + (FIELD.endLine - FIELD.goalLine);
  return length <= KICK.goalRange ? "fieldgoal" : "punt";
}

/** Sets up the kick: the quarterback steps back to the spot and the accuracy bar starts. */
export function setupKick(state: MatchState, kind: KickKind): void {
  const spot = setKickFormation(state);
  const qb = quarterback(state);
  qb.facing = attackSign(qb.team) > 0 ? 0 : Math.PI;
  state.kick = { kind, stage: "aim", t: 0, aim: 0, power: 0, kicker: qb.id, spot, result: null, landed: null };
  state.phase = "kick";
  state.phaseT = 0;
  qb.brain.thinkIn = 0.6 + Math.min(1.5, botSkill(state).reaction) + state.rng.range(0, 0.5);
}

/** A computer kicker's stops: near the green and enough leg, less so on the easier levels. */
function botStops(state: MatchState): { aim: number; power: number } {
  const kick = state.kick!;
  const slop = sloppiness(state);
  const aim = clamp(state.rng.range(-1, 1) * slop * 0.5, -1, 1);
  if (kick.kind === "punt") return { aim, power: clamp(0.9 - state.rng.range(0, slop * 0.4), 0, 1) };
  const need = powerNeeded(state.drive.offense, kick.spot) ?? 1;
  return { aim, power: clamp(need + 0.12 + state.rng.range(-0.25, 0.1) * slop, 0, 1) };
}

/**
 * One step of a kick: the accuracy bar, then the power bar, each stopped
 * by the kicker's phone (or a computer, or itself after a while), the
 * wind up, then the flight to the posts or downfield.
 */
export function stepKick(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  const kick = state.kick;
  if (!kick) return;
  kick.t += dt;
  const kicker = state.athletes[kick.kicker]!;
  const cmd = commands.get(kicker.id);
  const human = isHuman(kicker);
  kicker.brain.thinkIn -= dt;
  if (kick.stage === "aim") {
    const stop = human ? cmd?.kickAim : kicker.brain.thinkIn <= 0 ? botStops(state).aim : undefined;
    if (stop !== undefined || kick.t >= KICK.autoStop) {
      kick.aim = clamp(stop ?? aimMeter(kick.t), -1, 1);
      next(state, "power");
      kicker.brain.thinkIn = 0.5 + state.rng.range(0, 0.6);
    }
  } else if (kick.stage === "power") {
    const stop = human ? cmd?.kickPower : kicker.brain.thinkIn <= 0 ? botStops(state).power : undefined;
    if (stop !== undefined || kick.t >= KICK.autoStop) {
      kick.power = clamp(stop ?? powerMeter(kick.t), 0, 1);
      next(state, "windup");
      setAction(kicker, "kick", KICK.windup + 0.6);
    }
  } else if (kick.stage === "windup") {
    if (kick.t >= KICK.windup) launch(state);
  } else if (kick.stage === "flight") {
    flight(state, dt);
  }
}

function next(state: MatchState, stage: NonNullable<MatchState["kick"]>["stage"]): void {
  state.kick!.stage = stage;
  state.kick!.t = 0;
}

function launch(state: MatchState): void {
  const kick = state.kick!;
  const ball = state.ball;
  ball.mode = "kick";
  ball.holder = null;
  ball.pos = v3(kick.spot.x, 0.15, kick.spot.z);
  ball.vel = kickVelocity(kick.kind, state.drive.offense, kick.spot, kick.aim, kick.power);
  ball.tumble = 0;
  next(state, "flight");
  state.events.push({ type: "kick", athlete: kick.kicker, kind: kick.kind, power: kick.power, aim: kick.aim });
}

/** Follows the kick until it is judged: at the posts for a goal, on landing for a punt. */
function flight(state: MatchState, dt: number): void {
  const kick = state.kick!;
  const ball = state.ball;
  const s = attackSign(state.drive.offense);
  stepTumble(ball, dt);
  if (kick.kind !== "punt") {
    if (s * ball.pos.x >= FIELD.endLine) return judge(state, crossing(ball.pos));
    if (ball.pos.y <= 0.1) return judge(state, "short");
    return;
  }
  if (ball.pos.y > 0.12) return;
  const landed = { x: clamp(ball.pos.x, -FIELD.endLine, FIELD.endLine), z: clamp(ball.pos.z, -FIELD.halfWidth, FIELD.halfWidth) };
  kick.landed = landed;
  const receiving = other(state.drive.offense);
  if (Math.abs(ball.pos.z) > FIELD.halfWidth) return judge(state, "out");
  if (inOwnEndZone(receiving, ball.pos.x) || Math.abs(ball.pos.x) > FIELD.endLine) return judge(state, "touchback");
  judge(state, "landed");
}

function judge(state: MatchState, result: NonNullable<NonNullable<MatchState["kick"]>["result"]>): void {
  const kick = state.kick!;
  kick.result = result;
  next(state, "done");
  state.ball.mode = kick.kind === "punt" ? "loose" : "kick";
  const good = result === "good" || (kick.kind === "punt" && result !== "out");
  state.events.push({ type: "kickResult", kind: kick.kind, good, distance: kick.kind === "punt" ? puntLength(state) : kickLength(state.drive.offense, kick.spot) });
}

function puntLength(state: MatchState): number {
  const kick = state.kick!;
  return kick.landed ? Math.round(Math.abs(kick.landed.x - kick.spot.x)) : 0;
}
