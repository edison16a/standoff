import { isHuman } from "./athlete";
import { stepLoose } from "./ball";
import { defenseCommand } from "./bot-defense";
import { offenseCommand } from "./bot-offense";
import { botSkill } from "./bot-skill";
import { checkCarrier } from "./carrier";
import { collide } from "./collide";
import { applyCommand } from "./control";
import { quarterback } from "./formation";
import { coolJuke } from "./juke";
import { stepLinemen } from "./linemen";
import { stepPass } from "./pass";
import { BALL } from "./tuning";
import type { Athlete, Command, MatchState } from "./types";
import { fromAngle, lerp, v2, v3 } from "./vec";

const IDLE: Command = { move: v2() };

function tick(a: Athlete, dt: number): void {
  a.actionT += dt;
  a.tackleWait = Math.max(0, a.tackleWait - dt);
  a.brain.thinkIn -= dt;
  coolJuke(a, dt);
}

/** A phone's command, or a computer's for a bot or a player whose phone dropped. */
function commandFor(state: MatchState, a: Athlete, commands: ReadonlyMap<number, Command>, dt: number): Command {
  if (isHuman(a)) return commands.get(a.id) ?? IDLE;
  return a.team === state.play.carrierTeam ? offenseCommand(state, a, state.phaseT) : defenseCommand(state, a, dt);
}

/** The snap flies back to the quarterback's hands, then he has it. */
function stepBall(state: MatchState, dt: number): void {
  const ball = state.ball;
  if (ball.mode === "snap") {
    const qb = quarterback(state);
    const t = Math.min(1, state.phaseT / BALL.snapTime);
    ball.pos = v3(lerp(state.drive.los, qb.pos.x, t), lerp(0.4, BALL.carryHeight, t), lerp(state.drive.ballZ, qb.pos.z, t));
    if (t >= 1) {
      ball.mode = "held";
      state.play.carrier = qb.id;
    }
    return;
  }
  if (ball.mode === "held" && ball.holder !== null) {
    const h = state.athletes[ball.holder]!;
    const f = fromAngle(h.facing);
    ball.pos = v3(h.pos.x + f.x * 0.25, h.action === "down" ? 0.3 : BALL.carryHeight, h.pos.z + f.z * 0.25);
    ball.vel = v3(h.vel.x, 0, h.vel.z);
  } else if (ball.mode === "loose" || ball.mode === "kick") stepLoose(ball, dt);
}

/**
 * One step of a live play: the clock, every player's command, the
 * linemen's fight, bumps, the ball, and the lines the carrier crosses.
 * Sets `play.end` when the whistle should go.
 */
export function stepLive(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  if (!state.overtime) state.clock = Math.max(0, state.clock - dt);
  const pace = botSkill(state).speed;
  for (const a of state.athletes) tick(a, dt);
  for (const a of state.athletes) applyCommand(state, a, commandFor(state, a, commands, dt), dt, isHuman(a) ? 1 : pace);
  stepLinemen(state, dt, true);
  collide(state);
  if (state.play.pass) stepPass(state, dt);
  stepBall(state, dt);
  checkCarrier(state);
}
