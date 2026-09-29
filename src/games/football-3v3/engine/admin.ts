import type { TeamId } from "../teams";
import { isHuman } from "./athlete";
import { newDrive } from "./downs";
import { goalLineOf, xFromGoal } from "./field";
import { beginCall, makeCall, snap, startTry } from "./flow";
import type { MatchState } from "./types";
import { v3 } from "./vec";
import { whistle } from "./whistle";

/**
 * Test shortcuts for the host's hidden admin panel: a touchdown, a field
 * goal attempt and a two point try on demand, each through the real
 * rules so the celebration, replay, bars and scoring all run. They work
 * between plays and during one, never mid celebration or at the end.
 */
function ready(state: MatchState): boolean {
  return state.phase === "call" || state.phase === "presnap" || state.phase === "live" || state.phase === "dead" || state.phase === "quarter" || state.phase === "kick";
}

/** The side a phone's player is on, so the tester gets the ball. */
export function testSide(state: MatchState): TeamId {
  return state.athletes.find(isHuman)?.team ?? 0;
}

/** A runner on the tester's side (a human one if there is one) scores from a catch in the end zone. */
export function adminTouchdown(state: MatchState): boolean {
  if (!ready(state)) return false;
  const team = testSide(state);
  state.drive = newDrive(team, xFromGoal(team, 5));
  beginCall(state);
  makeCall(state, "throw");
  snap(state, true);
  const side = state.athletes.filter((a) => a.team === team && a.role === "runner");
  const scorer = side.find(isHuman) ?? side[0] ?? state.athletes.find((a) => a.team === team)!;
  const x = xFromGoal(team, -3);
  scorer.pos = { x, z: scorer.pos.z };
  state.ball.mode = "held";
  state.ball.holder = scorer.id;
  state.ball.pos = v3(x, 1.1, scorer.pos.z);
  const play = state.play;
  play.carrier = scorer.id;
  play.gotAt = state.drive.los;
  play.thrown = scorer.role !== "qb";
  play.receiver = scorer.role !== "qb" ? scorer.id : null;
  play.end = "touchdown";
  play.spot = { x: goalLineOf(team), z: scorer.pos.z };
  whistle(state);
  return true;
}

/** A field goal try from the 20 for the tester's side: the kicking bars come up at once. */
export function adminFieldGoal(state: MatchState): boolean {
  if (!ready(state)) return false;
  const team = testSide(state);
  state.drive = { ...newDrive(team, xFromGoal(team, 20)), down: 4 };
  beginCall(state);
  makeCall(state, "kick");
  return state.phase === "kick";
}

/** Straight to a try for the tester's side: kick for one or throw for two. */
export function adminTwoPoint(state: MatchState): boolean {
  if (!ready(state)) return false;
  startTry(state, testSide(state));
  return true;
}
