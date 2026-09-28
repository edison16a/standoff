import { other } from "../teams";
import { isHuman, moveAthlete, turnToward } from "./athlete";
import { autoShootAt, chargeLevel } from "./charge";
import { botSkill } from "./difficulty";
import { shotWindup } from "./kick";
import { updateKeeperFacing } from "./keeper-update";
import { botSetPiece } from "./set-piece-bot";
import { AIM_RATE, takerInput, type TakerInput } from "./set-piece-input";
import { SET_KICK, strikeKick } from "./set-piece-kick";
import { judgeFreeKick, judgePenalty, penaltyDive } from "./set-piece-save";
import { planDive } from "./keeper";
import { TOUCH } from "./tuning";
import type { Command, MatchState, SetPiece } from "./types";
import { clamp, dist, len, norm, scale, sub } from "./vec";

/** A taker who leaves a stage alone this long has it made for them, so a match never stalls. */
export const STAGE_TIMEOUT = 15;

/** One step of a set piece being lined up and taken. */
export function stepSetPiece(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  const sp = state.setPiece;
  if (!sp) return;
  sp.stageT += dt;
  const taker = state.athletes[sp.taker]!;
  const input = isHuman(taker) ? takerInput(commands.get(taker.id)) : botSetPiece(state, sp, dt);
  if (sp.stage === "struck") return runUp(state, sp, dt);
  control(sp, input, dt);
  for (const k of state.keepers) updateKeeperFacing(state, k, dt);
}

/** The stages: shift the aim, bend it, then hold and let go for power. */
function control(sp: SetPiece, input: TakerInput, dt: number): void {
  if (input.press) sp.armed = true;
  const timedOut = sp.stageT > STAGE_TIMEOUT;
  const next = (input.release && sp.armed) || timedOut;
  switch (sp.stage) {
    case "aim":
      if (sp.kind === "free") sp.aimX = clamp(sp.aimX + input.right * AIM_RATE.yaw * dt, -SET_KICK.maxYaw, SET_KICK.maxYaw);
      else {
        sp.aimX = clamp(sp.aimX + input.right * AIM_RATE.across * dt, -SET_KICK.penWide, SET_KICK.penWide);
        sp.aimY = clamp(sp.aimY + input.up * AIM_RATE.up * dt, 0.12, SET_KICK.penHigh);
      }
      if (next) nextStage(sp, sp.kind === "free" ? "curve" : "power");
      return;
    case "curve":
      sp.curve = clamp(sp.curve + input.right * AIM_RATE.curve * dt, -1, 1);
      if (next) nextStage(sp, "power");
      return;
    case "power":
      if (input.press) {
        sp.charging = true;
        sp.charge = 0;
      }
      if (sp.charging) sp.charge += dt;
      sp.power = sp.charging ? chargeLevel(sp.charge) : SET_KICK.nominal;
      if (sp.charging && (input.release || sp.charge >= autoShootAt())) {
        sp.power = chargeLevel(input.release && input.held !== undefined ? input.held : sp.charge);
        sp.charging = false;
        nextStage(sp, "struck");
      } else if (timedOut) nextStage(sp, "struck");
      return;
    case "struck":
      return;
  }
}

function nextStage(sp: SetPiece, stage: SetPiece["stage"]): void {
  sp.stage = stage;
  sp.stageT = 0;
  sp.armed = false;
}

/**
 * The taker runs up and swings, the ball leaves the boot at the moment
 * the kick animation meets it, and play is live again.
 */
function runUp(state: MatchState, sp: SetPiece, dt: number): void {
  const taker = state.athletes[sp.taker]!;
  taker.actionT += dt;
  if (taker.action !== "shoot") {
    // A few strides in, pulling up just behind the ball.
    const toBall = sub(sp.spot, taker.pos);
    if (len(toBall) > 0.6 && sp.stageT < 2) {
      moveAthlete(taker, scale(norm(toBall), 0.7), dt, false);
      return;
    }
    taker.action = "shoot";
    taker.actionT = 0;
    taker.power = sp.power;
    taker.actionLen = shotWindup(sp.power) + 0.4;
    taker.actionDir = norm(sub(sp.spot, taker.pos));
  }
  turnToward(taker, Math.atan2(taker.actionDir.z, taker.actionDir.x), 12 * dt);
  if (taker.actionT >= shotWindup(sp.power)) launch(state, sp);
}

/** The ball is struck: the wall leaps, the keeper reads it, and play goes on. */
function launch(state: MatchState, sp: SetPiece): void {
  const taker = state.athletes[sp.taker]!;
  const ball = state.ball;
  const kick = strikeKick(sp, state.rng);
  const keeper = state.keepers[other(sp.team)];
  const judged = sp.kind === "penalty" ? judgePenalty(state, sp, kick, keeper) : { outcome: judgeFreeKick(state, sp, kick, keeper), guess: 0 as const, rightWay: true };
  ball.vel = kick.vel;
  ball.spin = kick.spin;
  ball.lastTouch = { team: taker.team, id: taker.id };
  taker.noTouch = TOUCH.afterKick;
  taker.stats.shots++;
  const target = { x: keeper.pos.x, y: 0, z: 0 };
  state.flight = { shooter: taker.id, team: taker.team, outcome: judged.outcome, t: 0, target, keeperX: keeper.pos.x, power: sp.power, resolved: false };
  if (sp.kind === "penalty") penaltyDive(state, keeper, judged.guess, judged.rightWay);
  else planDive(state, keeper);
  sp.launched = true;
  sp.struckT = 0;
  if (sp.wall.length && botSkill(state).acts) jumpWall(state, sp);
  state.phase = "play";
  state.phaseT = 0;
  state.events.push({ type: "shot", athlete: taker.id, team: taker.team, outcome: judged.outcome, power: sp.power, distance: dist(sp.spot, { x: keeper.pos.x, z: 0 }) });
}

/** The wall goes up together as the ball is struck, each a hair apart. */
function jumpWall(state: MatchState, sp: SetPiece): void {
  for (const id of sp.wall) {
    const a = state.athletes[id]!;
    a.action = "jump";
    a.actionT = -state.rng.range(0, 0.07);
    a.actionLen = 0.62;
    a.defendWait = 0.7;
  }
  state.events.push({ type: "wallJump", team: other(sp.team) });
}
