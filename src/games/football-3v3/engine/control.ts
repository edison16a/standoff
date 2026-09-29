import { advance, runToward } from "./athlete";
import { pickTarget } from "./aim";
import { gain } from "./field";
import { stepDive, startDive, diveBallSpot } from "./dive";
import { guardStick } from "./guard";
import { stepJuke, startJuke } from "./juke";
import { blockedPace } from "./linemen";
import { throwPass } from "./pass";
import { pressTackle, stepLunge } from "./tackle";
import type { Athlete, Command, MatchState } from "./types";
import { scale } from "./vec";

/** Bodies on the grass or standing about slow to a stop. */
export function settle(a: Athlete, dt: number, rate = 5): void {
  a.vel = scale(a.vel, Math.exp(-rate * dt));
  advance(a, dt);
}

/**
 * One player's command for one live step, the same for phones and bots.
 * Timed actions play out first; a free player on the side with the ball
 * can juke, dive and (the quarterback) throw; on the other side they can
 * rush, guard and tackle. `pace` scales a computer player's speed.
 */
export function applyCommand(state: MatchState, a: Athlete, cmd: Command, dt: number, pace = 1): void {
  switch (a.action) {
    case "down":
      settle(a, dt, 6);
      if (a.actionT >= a.actionLen) a.action = "free";
      return;
    case "lunge":
      return stepLunge(state, a, dt);
    case "dive":
      if (stepDive(state, a, dt) && !state.play.end) {
        state.play.end = "dive";
        state.play.spot = diveBallSpot(a);
      }
      return;
    case "juke":
      return stepJuke(state, a, dt);
    case "throw":
      runToward(state, a, scale(cmd.move, 0.3), dt, pace);
      if (a.actionT >= a.actionLen) a.action = "free";
      return;
    case "kick":
    case "celebrate":
    case "dejected":
      return settle(a, dt);
    case "stance":
      a.action = "free";
      break;
    case "free":
      break;
  }
  if (a.team === state.play.carrierTeam) attack(state, a, cmd, dt, pace);
  else defend(state, a, cmd, dt, pace);
}

function attack(state: MatchState, a: Athlete, cmd: Command, dt: number, pace: number): void {
  const play = state.play;
  a.rush = false;
  a.guard.held = false;
  if (cmd.juke && startJuke(state, a, cmd.move)) return stepJuke(state, a, dt);
  if (cmd.dive && startDive(state, a, cmd.move)) return;
  const holding = play.carrier === a.id && state.ball.mode === "held";
  // Forward passes only from behind the line, by the quarterback, once a play.
  const canThrow = holding && a.role === "qb" && !play.thrown && !play.intercepted && gain(state.drive.offense, state.drive.los, a.pos.x) <= 0.5;
  if (canThrow) {
    if (cmd.aim) play.target = pickTarget(state, a, cmd.aim);
    if (cmd.throw && play.target !== null) {
      throwPass(state, a, play.target);
      return;
    }
  } else if (play.carrier === a.id) play.target = null;
  runToward(state, a, cmd.move, dt, pace);
}

function defend(state: MatchState, a: Athlete, cmd: Command, dt: number, pace: number): void {
  a.rush = !!cmd.rush;
  a.guard.held = !!cmd.guard;
  if (!a.guard.held) a.guard.mark = null;
  if (cmd.tackle && pressTackle(state, a)) return stepLunge(state, a, dt);
  const stick = a.guard.held ? guardStick(state, a) : cmd.move;
  runToward(state, a, stick, dt, pace * blockedPace(state, a, dt));
}
