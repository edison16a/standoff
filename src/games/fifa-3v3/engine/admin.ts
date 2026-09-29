import { other, type TeamId } from "../teams";
import { isHuman } from "./athlete";
import { commitFoul } from "./foul";
import { goalX } from "./goal";
import { markOf } from "./guard";
import { outward } from "./keeper";
import { fullTime } from "./rules";
import { setupSetPiece } from "./set-piece";
import type { Athlete, MatchState, SetPieceKind } from "./types";
import { dist } from "./vec";

/**
 * Test shortcuts for the host's hidden admin panel: a foul, a free kick,
 * a penalty or the final whistle on demand, so each can be tried without
 * playing for it. They only work while the ball is in play or about to be.
 */
function ready(state: MatchState): boolean {
  return state.phase === "play" || state.phase === "kickoff" || state.phase === "restart";
}

/** The side a phone's player is on, so the tester gets the ball. */
function testSide(state: MatchState): TeamId {
  return state.athletes.find(isHuman)?.team ?? 0;
}

function victimOn(state: MatchState, team: TeamId): Athlete {
  return state.athletes.find((a) => a.team === team && isHuman(a)) ?? state.athletes.find((a) => a.team === team)!;
}

/** A foul in open play on whoever has the ball, by the nearest opponent, with the whole referee scene. */
export function adminFoul(state: MatchState): boolean {
  if (!ready(state) || !state.athletes.length) return false;
  const owner = state.ball.owner;
  const victim = owner?.kind === "athlete" ? state.athletes[owner.id]! : victimOn(state, testSide(state));
  const foes = state.athletes.filter((a) => a.team !== victim.team);
  if (!foes.length) return false;
  const by = foes.reduce((best, a) => (dist(a.pos, victim.pos) < dist(best.pos, victim.pos) ? a : best), foes[0]!);
  state.phase = "play";
  commitFoul(state, by, victim, "admin");
  return state.foul !== null;
}

/** Straight to a free kick or a penalty for the tester's side. */
export function adminSetPiece(state: MatchState, kind: SetPieceKind): boolean {
  if (!ready(state) || !state.athletes.length) return false;
  const team = testSide(state);
  const victim = victimOn(state, team);
  const by = markOf(state, victim) ?? victim;
  const defending = other(team);
  // A free kick from just outside the box, off to one side, where a wall and a curler both matter.
  const at = kind === "penalty" ? { x: goalX(defending), z: 0 } : { x: goalX(defending) + outward(defending) * 13, z: state.rng.range(-4, 4) };
  state.foul = { by: by.id, victim: victim.id, at, kind: "admin", penalty: kind === "penalty", team, carded: true };
  setupSetPiece(state, kind, team);
  return true;
}

/** The final whistle now, with the tester's side a goal up, straight into the trophy ceremony. */
export function adminWin(state: MatchState): boolean {
  if (!ready(state) || !state.athletes.length) return false;
  const team = testSide(state);
  state.score[team] = Math.max(state.score[team], state.score[other(team)] + 1);
  state.winner = team;
  state.foul = null;
  state.setPiece = null;
  state.flight = null;
  fullTime(state);
  return true;
}
