import { other } from "../teams";
import { CHARGE } from "./charge";
import { goalX, toGoal } from "./goal";
import { planDive } from "./keeper";
import { crossing, judgePenalty, judgeSave, onGoal, penaltyDive, penaltyGuess, type Crossing } from "./keeper-judge";
import { startJump } from "./jump";
import { setRefereeAction } from "./referee";
import { launchFor, type Launch } from "./set-piece-kick";
import { wallBlocks } from "./set-piece-wall";
import { BALL, PITCH, TOUCH } from "./tuning";
import type { MatchState, SetPiece, ShotOutcome } from "./types";
import { clamp01 } from "./vec";

/** A bar stopped in the red goes off line: the further into it, the wilder. */
function overhit(state: MatchState, sp: SetPiece, launch: Launch): Launch {
  const err = clamp01((sp.power - CHARGE.red) / (1 - CHARGE.red));
  if (err <= 0) return launch;
  const rng = state.rng;
  const turn = rng.range(-1, 1) * 0.07 * err;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const v = launch.vel;
  return {
    vel: { x: v.x * c - v.z * s, y: v.y * (1 + rng.range(0, 0.3) * err), z: v.x * s + v.z * c },
    spin: launch.spin,
  };
}

/** Whether the ball is heading for the goal at all, rather than a long ball upfield. */
function atGoal(c: Crossing | null): c is Crossing {
  return c !== null && Math.abs(c.z) < PITCH.goalHalfWidth + 2.5 && c.y < PITCH.goalHeight + 2.5;
}

/**
 * The kick. The wall jumps as it is struck. Where the ball goes is pure
 * physics; what the keeper does about it is judged now, from where it
 * will cross the line and how long they have, and the dive is planned
 * to match. Play is live again from this moment.
 */
export function strikeSetPiece(state: MatchState, sp: SetPiece): void {
  const taker = state.athletes[sp.taker]!;
  const defending = other(sp.team);
  const keeper = state.keepers[defending];
  const launch = overhit(state, sp, launchFor(sp, sp.power));
  const ball = state.ball;
  ball.owner = null;
  ball.pos = { x: sp.spot.x, y: BALL.radius, z: sp.spot.z };
  ball.vel = { ...launch.vel };
  ball.spin = { ...launch.spin };
  ball.lastTouch = { team: sp.team, id: taker.id };
  ball.passTo = null;
  taker.noTouch = TOUCH.afterKick;
  const blocked = wallBlocks(state, sp, launch);
  for (const id of sp.wall) startJump(state, state.athletes[id]!);
  const onLine = crossing(sp.spot, launch, goalX(defending));
  const speed = Math.hypot(launch.vel.x, launch.vel.y, launch.vel.z);
  state.setPiece = null;
  state.phase = "play";
  state.phaseT = 0;
  setRefereeAction(state.referee, "follow");
  if (!atGoal(onLine)) {
    // Nowhere near the goal: a long ball into play, not a shot.
    taker.stats.passes++;
    state.events.push({ type: "pass", athlete: taker.id, to: null, air: launch.vel.y > 2 });
    return;
  }
  let outcome: ShotOutcome = blocked ? "blocked" : onGoal(onLine);
  const atKeeper = crossing(sp.spot, launch, keeper.pos.x);
  if (outcome === "goal" && atKeeper) {
    if (sp.kind === "penalty") {
      const guess = penaltyGuess(state.rng, onLine.z);
      outcome = judgePenalty(keeper, atKeeper, speed, guess, state.rng);
      if (guess !== 0) penaltyDive(keeper, atKeeper, guess, outcome !== "goal", state.rng);
    } else {
      // The wall hides the strike, so the keeper reacts a beat later.
      outcome = judgeSave(keeper, atKeeper, speed, sp.wall.length > 0 ? 0.2 : 0.08, state.rng);
    }
  }
  taker.stats.shots++;
  state.shotCount++;
  state.flight = { shooter: taker.id, team: sp.team, outcome, t: 0, target: { x: goalX(defending), y: onLine.y, z: onLine.z }, keeperX: keeper.pos.x, power: sp.power, resolved: false };
  // A penalty keeper already went (or stood); anyone else reads the flight.
  if (sp.kind !== "penalty" && outcome !== "blocked") planDive(state, keeper);
  if (sp.kind === "penalty" && keeper.action === "set" && outcome !== "goal") planDive(state, keeper);
  state.events.push({ type: "shot", athlete: taker.id, team: sp.team, outcome, power: sp.power, distance: toGoal(sp.spot, defending) });
}
