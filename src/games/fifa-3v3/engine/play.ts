import { brake, carryBall, isHuman, moveAthlete } from "./athlete";
import { rise, tryAerial } from "./aerial";
import { collideBodies } from "./contact";
import { dribble, dribbleSteer } from "./dribble";
import { settleNets } from "./ball";
import { botCommand } from "./bots";
import { tryControl } from "./control";
import { outAt, scoredIn } from "./goal";
import { updateKeeper } from "./keeper-update";
import { applyButtons } from "./buttons";
import { stepLooseBall, updateFlight } from "./loose-ball";
import { coolDefend, updateJump, updateSteal } from "./defend";
import { guardStep } from "./guard";
import { followPlay } from "./referee";
import { owns, progressKick } from "./kick";
import { fullTime, onGoal, onOut } from "./rules";
import { coolSkill, updateBeaten, updateSkill } from "./skills";
import { updateSlide } from "./slide";
import { challenges } from "./tackle";
import type { Athlete, Command, MatchState } from "./types";
import { scale } from "./vec";

const IDLE: Command = { move: { x: 0, z: 0 } };

/** One step of open play: everyone moves, the ball flies, and the rules are checked. */
export function playStep(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  const live = state.phase === "play";
  const strides = state.athletes.map((a) => a.stride);
  for (const a of state.athletes) {
    const command = !live ? IDLE : isHuman(a) ? (commands.get(a.id) ?? IDLE) : botCommand(state, a, dt);
    a.want = command.move;
    if (live) applyButtons(state, a, command, dt);
    updateAction(state, a, command, dt);
  }
  const ball = state.ball;
  const owner = ball.owner;
  let rolled = false;
  if (owner?.kind === "athlete") {
    ball.heldFor += dt;
    const carrier = state.athletes[owner.id]!;
    // A skill move places the ball itself; a kick being wound up gathers it onto the boot.
    if (carrier.action === "shoot" || carrier.action === "pass") carryBall(carrier, ball, dt);
    else if (carrier.action !== "skill") {
      // Between touches the ball rolls free, and can run into anyone.
      stepLooseBall(state, dt);
      rolled = true;
      if (ball.owner && !dribble(state, carrier, strides[carrier.id] ?? carrier.stride, dt)) ball.owner = null;
    }
  } else if (!owner) {
    stepLooseBall(state, dt);
    rolled = true;
  }
  if (!rolled) settleNets(state.nets, dt);
  for (const k of state.keepers) updateKeeper(state, k, dt);
  if (owner?.kind === "keeper") ball.heldFor += dt;
  updateFlight(state, dt);
  // A foul given this step stops play at once: nobody may pick the dead ball up.
  if (state.phase === "play") {
    rise(state);
    if (!tryAerial(state)) tryControl(state);
    challenges(state, dt);
    followPlay(state, dt);
    settleSetPiece(state, dt);
  }
  for (const [id, shove] of collideBodies(state.athletes)) {
    const a = state.athletes[id]!;
    a.shove = Math.max(a.shove, shove);
  }
  checkBall(state);
  if (live && state.phase === "play") runClock(state, dt);
}

/** The camera stays with a free kick or penalty for a moment after it is struck, then play is just play. */
function settleSetPiece(state: MatchState, dt: number): void {
  const sp = state.setPiece;
  if (!sp) return;
  sp.struckT += dt;
  const done = state.flight === null || state.flight.resolved;
  if (sp.struckT > 2.6 || (done && sp.struckT > 1.4)) {
    state.setPiece = null;
    state.foul = null;
  }
}

function updateAction(state: MatchState, a: Athlete, c: Command, dt: number): void {
  const before = a.actionT;
  a.actionT += dt;
  a.noTouch = Math.max(0, a.noTouch - dt);
  coolSkill(a, dt);
  coolDefend(a, dt);
  const has = owns(state, a);
  if (a.action !== "free") a.guard.on = false;
  switch (a.action) {
    case "free":
      if (!guardStep(state, a, c, dt)) moveAthlete(a, has ? dribbleSteer(state, a, c.move) : c.move, dt, has);
      return;
    case "celebrate":
    case "dejected":
      moveAthlete(a, c.move, dt, has);
      return;
    case "jump":
    case "header":
      updateJump(a, dt);
      break;
    case "chest":
      // Cushioning it: he goes on, more slowly, while it drops to his feet.
      moveAthlete(a, scale(c.move, 0.4), dt, has);
      break;
    case "steal":
      updateSteal(state, a, before, dt);
      break;
    case "hurdle":
      moveAthlete(a, has ? dribbleSteer(state, a, c.move) : c.move, dt, has);
      break;
    case "shoot":
    case "pass":
      moveAthlete(a, scale(c.move, 0.3), dt, has);
      progressKick(state, a, before);
      break;
    case "slide":
      updateSlide(state, a, dt);
      return;
    case "skill":
      updateSkill(state, a, dt);
      return;
    case "beaten":
      updateBeaten(a, state.ball.pos, dt);
      break;
    case "getup":
    case "stumble":
      brake(a, dt);
      break;
  }
  if (a.actionT >= a.actionLen) {
    a.action = "free";
    a.actionT = 0;
  }
}

function checkBall(state: MatchState): void {
  if (state.phase !== "play" && state.phase !== "restart") return;
  const inGoal = scoredIn(state.ball, state.nets);
  if (inGoal !== null && state.ball.inGoal === null && state.phase === "play") return onGoal(state, inGoal);
  const out = outAt(state.ball, state.nets);
  if (out !== null && state.phase === "play") onOut(state, out);
}

/**
 * The clock runs in open play. At zero a decided match ends; a level
 * one goes to golden goal, where the next goal wins. A shot already in
 * the air is allowed to land first.
 */
function runClock(state: MatchState, dt: number): void {
  if (state.golden) return;
  state.clock = Math.max(0, state.clock - dt);
  if (state.clock > 0 || (state.flight && !state.flight.resolved)) return;
  if (state.score[0] !== state.score[1]) return fullTime(state);
  state.golden = true;
  state.events.push({ type: "whistle", long: false }, { type: "golden" });
}
