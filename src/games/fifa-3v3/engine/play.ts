import { other } from "../teams";
import { brake, carryBall, isHuman, moveAthlete, separate } from "./athlete";
import { stepBall, type Contact } from "./ball";
import { botCommand } from "./bots";
import { tryControl } from "./control";
import { goalX, outAt, scoredIn } from "./goal";
import { makeSave } from "./keeper";
import { updateKeeper } from "./keeper-update";
import { applyButtons } from "./buttons";
import { owns, progressKick } from "./kick";
import { fullTime, onGoal, onOut } from "./rules";
import { coolSkill, updateBeaten, updateSkill } from "./skills";
import { challenges, updateSlide } from "./tackle";
import { PITCH } from "./tuning";
import type { Athlete, Command, MatchState } from "./types";
import { scale } from "./vec";

const IDLE: Command = { move: { x: 0, z: 0 } };

/** One step of open play: everyone moves, the ball flies, and the rules are checked. */
export function playStep(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  const live = state.phase === "play";
  for (const a of state.athletes) {
    const command = !live ? IDLE : isHuman(a) ? (commands.get(a.id) ?? IDLE) : botCommand(state, a, dt);
    if (live) applyButtons(state, a, command, dt);
    updateAction(state, a, command, dt);
  }
  const ball = state.ball;
  const owner = ball.owner;
  if (owner?.kind === "athlete") {
    ball.heldFor += dt;
    // During a skill move the move itself places the ball.
    const carrier = state.athletes[owner.id]!;
    if (carrier.action !== "skill") carryBall(carrier, ball, dt);
  } else if (!owner) stepLooseBall(state, dt);
  for (const k of state.keepers) updateKeeper(state, k, dt);
  if (owner?.kind === "keeper") ball.heldFor += dt;
  updateFlight(state, dt);
  if (live) {
    tryControl(state);
    challenges(state, dt);
  }
  separate(state.athletes);
  checkBall(state);
  if (live && state.phase === "play") runClock(state, dt);
}

/** Moves a loose ball and turns what it hits into events. */
export function stepLooseBall(state: MatchState, dt: number): void {
  const contacts: Contact[] = [];
  stepBall(state.ball, dt, contacts);
  for (const c of contacts) {
    if (c.type === "post" || c.type === "bar") {
      state.events.push({ type: "woodwork", part: c.type, speed: c.speed, at: c.at });
      if (state.flight) state.flight.resolved = true;
    } else if (c.type === "net") state.events.push({ type: "net", team: c.team, speed: c.speed, at: c.at });
    else if (c.type === "board") {
      if (c.speed > 1.5) state.events.push({ type: "board", speed: c.speed, at: c.at });
      endShotOnBoards(state);
    }
    else if (c.type === "bounce" && c.speed > 2) state.events.push({ type: "bounce", speed: c.speed });
  }
}

/**
 * A shot that hits the boards is over: the ball is live again for
 * anyone to play. Off the end boards it was a miss.
 */
function endShotOnBoards(state: MatchState): void {
  const flight = state.flight;
  if (!flight || flight.resolved) return;
  flight.resolved = true;
  if (Math.abs(state.ball.pos.x) > PITCH.halfLength - 1) state.events.push({ type: "miss", team: flight.team, kind: "wide" });
}

function updateAction(state: MatchState, a: Athlete, c: Command, dt: number): void {
  const before = a.actionT;
  a.actionT += dt;
  a.noTouch = Math.max(0, a.noTouch - dt);
  coolSkill(a, dt);
  const has = owns(state, a);
  switch (a.action) {
    case "free":
    case "celebrate":
    case "dejected":
      moveAthlete(a, c.move, dt, has);
      return;
    case "hurdle":
      moveAthlete(a, c.move, dt, has);
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

/** Resolves a shot meant to be saved when it reaches the keeper, and times out stray ones. */
function updateFlight(state: MatchState, dt: number): void {
  const flight = state.flight;
  if (!flight || flight.resolved) return;
  flight.t += dt;
  const defending = other(flight.team);
  if (flight.outcome === "catch" || flight.outcome === "parry") {
    const inward = Math.sign(goalX(defending));
    if ((state.ball.pos.x - flight.keeperX) * inward >= 0) {
      makeSave(state, state.keepers[defending], flight.outcome === "parry");
      flight.resolved = true;
    }
  }
  if (flight.t > 3) flight.resolved = true;
}

function checkBall(state: MatchState): void {
  if (state.phase !== "play" && state.phase !== "restart") return;
  const inGoal = scoredIn(state.ball);
  if (inGoal !== null && state.ball.inGoal === null && state.phase === "play") return onGoal(state, inGoal);
  const out = outAt(state.ball);
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
