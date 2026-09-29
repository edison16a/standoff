import { attackSign, other } from "../teams";
import { brake, isHuman, moveAthlete, turnToward } from "./athlete";
import { autoShootAt, chargeLevel } from "./charge";
import { SET_KICK } from "./defence-tuning";
import { goalX } from "./goal";
import { botPass, shotWindup } from "./kick";
import { choosePassTarget } from "./passing";
import { setRefereeAction } from "./referee";
import { planBotFreeKick, planBotPenalty } from "./set-piece-bot";
import { kickDirection, previewPath } from "./set-piece-kick";
import { strikeSetPiece } from "./set-piece-strike";
import { wantsWall } from "./set-piece-wall";
import { PITCH } from "./tuning";
import type { Athlete, Command, MatchState, SetPiece, SetStage } from "./types";
import { clamp, dist, norm, sub } from "./vec";

const IDLE: Command = { move: { x: 0, z: 0 } };

/** The stages in order, for the Back button. */
function stagesOf(sp: SetPiece): SetStage[] {
  return sp.kind === "penalty" ? ["aim", "power"] : ["aim", "curve", "power"];
}

function goTo(sp: SetPiece, stage: SetStage): void {
  sp.stage = stage;
  sp.stageT = 0;
  sp.holding = false;
  sp.held = 0;
}

/**
 * One step while a free kick or penalty is lined up. Nobody moves but
 * the taker; the phone steers the aim, then the curve, then the power,
 * a stage at a time. A computer taker thinks for a moment and goes.
 */
export function stepSetPiece(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  const sp = state.setPiece;
  if (!sp) return;
  sp.t += dt;
  sp.stageT += dt;
  const taker = state.athletes[sp.taker]!;
  for (const a of state.athletes) {
    a.actionT += dt;
    if (a !== taker) brake(a, dt);
  }
  if (sp.stage === "runup") return runUp(state, sp, taker, dt);
  if (!isHuman(taker)) return botTaker(state, sp, taker);
  // Nobody stands over a ball for ever: a phone left alone takes it at a medium strike.
  if (sp.t > SET_KICK.patience && !sp.holding) {
    sp.power = SET_KICK.preview;
    return goTo(sp, "runup");
  }
  steer(sp, commands.get(taker.id) ?? IDLE, dt);
  sp.path = previewPath(sp);
}

/**
 * The phone's controls, stage by stage. The stick is read as it sits on
 * the phone: left and right turn the aim or bend the curve, and at a
 * penalty up and down move the spot on the goal. Shoot/Pass confirms a
 * stage, Slide goes back one, and in the power stage holding Shoot/Pass
 * fills the bar and letting go strikes it.
 */
function steer(sp: SetPiece, c: Command, dt: number): void {
  const sx = c.move.x;
  const sy = -c.move.z;
  const stages = stagesOf(sp);
  const at = stages.indexOf(sp.stage);
  if (c.slide && at > 0) return goTo(sp, stages[at - 1]!);
  switch (sp.stage) {
    case "aim":
      if (sp.kind === "penalty") {
        // The taker's right, on the pitch, is +z when attacking toward +x.
        sp.target.z = clamp(sp.target.z + sx * SET_KICK.spotRate * dt * attackSign(sp.team), -(PITCH.goalHalfWidth + 0.8), PITCH.goalHalfWidth + 0.8);
        sp.target.y = clamp(sp.target.y + sy * SET_KICK.spotRate * 0.6 * dt, 0.15, PITCH.goalHeight + 0.6);
      } else sp.aim = clamp(sp.aim + sx * SET_KICK.aimRate * dt, -SET_KICK.maxAim, SET_KICK.maxAim);
      if (c.shootUp) goTo(sp, stages[at + 1]!);
      return;
    case "curve":
      sp.curve = clamp(sp.curve + sx * SET_KICK.curveRate * dt, -1, 1);
      if (c.shootUp) goTo(sp, "power");
      return;
    case "power":
      if (c.shootDown) {
        sp.holding = true;
        sp.held = 0;
      }
      if (sp.holding) sp.held += dt;
      if (sp.holding && (c.shootUp || sp.held >= autoShootAt())) {
        sp.power = chargeLevel(c.shootUp ? (c.held ?? sp.held) : sp.held);
        goTo(sp, "runup");
      }
      return;
    case "runup":
      return;
  }
}

/** A computer taker: a short pass from deep, otherwise a planned shot, after a moment's thought. */
function botTaker(state: MatchState, sp: SetPiece, taker: Athlete): void {
  if (sp.t < SET_KICK.botThink) return;
  const defending = other(sp.team);
  if (sp.kind === "free" && !wantsWall(sp.spot, defending)) {
    const mate = choosePassTarget(state, taker, null);
    if (mate) {
      // Play restarts with a pass: the ball at the taker's feet and play live.
      state.ball.owner = { kind: "athlete", id: taker.id };
      state.ball.heldFor = 1;
      taker.pos = { x: sp.spot.x - Math.cos(taker.facing) * 0.4, z: sp.spot.z - Math.sin(taker.facing) * 0.4 };
      state.setPiece = null;
      state.phase = "play";
      state.phaseT = 0;
      setRefereeAction(state.referee, "follow");
      botPass(state, taker, mate.id);
      return;
    }
  }
  if (sp.kind === "penalty") planBotPenalty(state, sp);
  else planBotFreeKick(state, sp);
  goTo(sp, "runup");
}

/**
 * The run up: a few quick steps in to the ball on a slight curve, then
 * the strike itself, timed off the same wind up as an open play shot.
 */
function runUp(state: MatchState, sp: SetPiece, taker: Athlete, dt: number): void {
  const dir = sp.kind === "penalty" ? norm(sub({ x: goalX(other(sp.team)), z: sp.target.z }, sp.spot)) : kickDirection(sp);
  if (taker.action !== "shoot") {
    const plant = { x: sp.spot.x - dir.x * 0.5, z: sp.spot.z - dir.z * 0.5 };
    const to = sub(plant, taker.pos);
    const d = dist(plant, taker.pos);
    if (d > 0.15 && sp.stageT < 1.4) {
      moveAthlete(taker, { x: (to.x / d) * 0.72, z: (to.z / d) * 0.72 }, dt, false);
      return;
    }
    taker.action = "shoot";
    taker.actionT = 0;
    taker.power = sp.power;
    taker.actionLen = shotWindup(sp.power) + 0.4;
    taker.actionDir = dir;
  }
  brake(taker, dt, 6);
  turnToward(taker, Math.atan2(dir.z, dir.x), 12 * dt);
  if (taker.actionT >= shotWindup(sp.power)) strikeSetPiece(state, sp);
}
