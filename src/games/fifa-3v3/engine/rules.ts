import { attackSign, other, type TeamId } from "../teams";
import { newBall } from "./ball";
import { goalX } from "./goal";
import { hands, makeKeeper, outward } from "./keeper";
import { PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist } from "./vec";

/** Kick off spots: the kicker on the centre spot, the others back in their own half. */
function kickoffSpot(a: Athlete, kicking: boolean): { x: number; z: number } {
  const s = attackSign(a.team);
  if (a.slot === 0) return { x: kicking ? -s * 0.35 : -s * (PITCH.centreRadius + 0.4), z: 0 };
  return { x: -s * 5.5, z: a.slot === 1 ? -4 : 4 };
}

/** Everyone back to their kick off spots, a fresh ball on the centre spot. */
export function setupKickoff(state: MatchState): void {
  state.ball = newBall();
  state.flight = null;
  for (const a of state.athletes) {
    const kicking = a.team === state.kickoffTeam && a.slot === 0;
    a.pos = kickoffSpot(a, kicking);
    a.vel = { x: 0, z: 0 };
    a.facing = attackSign(a.team) > 0 ? 0 : Math.PI;
    a.action = "free";
    a.actionT = 0;
    a.charging = false;
    a.charge = 0;
    a.buffered = 0;
    a.noTouch = 0;
    a.brain.thinkIn = 0.4;
  }
  // Fresh keepers in position, keeping their save counts for the results.
  const saves = [state.keepers[0].saves, state.keepers[1].saves];
  state.keepers = [makeKeeper(0), makeKeeper(1)];
  state.keepers[0].saves = saves[0]!;
  state.keepers[1].saves = saves[1]!;
  state.phase = "kickoff";
  state.phaseT = 0;
}

/** The whistle goes and the kicker has the ball. */
export function startPlay(state: MatchState): void {
  const kicker = state.athletes.find((a) => a.team === state.kickoffTeam && a.slot === 0);
  if (kicker) {
    state.ball.owner = { kind: "athlete", id: kicker.id };
    state.ball.lastTouch = { team: kicker.team, id: kicker.id };
    state.ball.heldFor = 0;
  }
  state.phase = "play";
  state.phaseT = 0;
  state.events.push({ type: "whistle", long: false }, { type: "kickoff", team: state.kickoffTeam });
}

/** The whole ball is over the line in `team`'s goal. */
export function onGoal(state: MatchState, team: TeamId): void {
  const scoring = other(team);
  const ball = state.ball;
  ball.inGoal = team;
  const touch = ball.lastTouch;
  const scorer = touch && touch.team === scoring && touch.id !== null ? touch.id : null;
  state.score[scoring]++;
  if (scorer !== null) state.athletes[scorer]!.stats.goals++;
  state.lastGoal = { team: scoring, scorer };
  if (state.flight) state.flight.resolved = true;
  if (state.golden || state.score[scoring] >= state.options.goalsToWin) state.winner = scoring;
  state.kickoffTeam = team;
  state.phase = "goal";
  state.phaseT = 0;
  state.events.push({ type: "goal", team: scoring, scorer, golden: state.golden });
  const keeper = state.keepers[scoring];
  keeper.action = "cheer";
  keeper.actionT = 0;
  keeper.dive = null;
}

/** Over the end boards: the keeper at that end restarts once the ball is fetched. */
export function onOut(state: MatchState, team: TeamId): void {
  if (state.flight) state.flight.resolved = true;
  state.restartTeam = team;
  state.phase = "restart";
  state.phaseT = 0;
  state.events.push({ type: "out", team, over: state.ball.pos.y > PITCH.boardHeight });
}

/** The goal kick: the keeper has the ball in hand and the attackers back off. */
export function restartFromKeeper(state: MatchState): void {
  const team = state.restartTeam ?? 0;
  const k = state.keepers[team];
  const gx = goalX(team);
  k.pos = { x: gx + outward(team) * 1.4, z: 0 };
  k.action = "hold";
  k.actionT = 0;
  k.dive = null;
  k.holdFor = 0.9;
  k.facing = outward(team) > 0 ? 0 : Math.PI;
  const ball = newBall();
  ball.owner = { kind: "keeper", team };
  ball.lastTouch = { team, id: null };
  ball.pos = hands(k);
  state.ball = ball;
  state.flight = null;
  for (const a of state.athletes) {
    if (a.team === team) continue;
    // Opponents step back out of the keeper's area.
    const d = dist(a.pos, { x: gx, z: 0 });
    if (d < PITCH.boxRadius + 1.5) a.pos.x = gx + outward(team) * (PITCH.boxRadius + 1.5);
  }
  state.restartTeam = null;
  state.phase = "play";
  state.phaseT = 0;
}

/** The final whistle. A level match never gets here: it goes to a golden goal instead. */
export function fullTime(state: MatchState): void {
  if (state.winner === null) state.winner = state.score[0] > state.score[1] ? 0 : 1;
  state.phase = "fulltime";
  state.phaseT = 0;
  state.events.push({ type: "whistle", long: true }, { type: "fulltime", winner: state.winner });
}
