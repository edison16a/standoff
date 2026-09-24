import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import { makeAthlete } from "./athlete";
import { newBall } from "./ball";
import { celebrateGoal, celebrateWin } from "./celebrate";
import { makeKeeper } from "./keeper";
import { updateKeeper } from "./keeper-update";
import { playStep, stepLooseBall } from "./play";
import { Rng } from "./rng";
import { fullTime, restartFromKeeper, setupKickoff, startPlay } from "./rules";
import { MATCH, STEP } from "./tuning";
import type { Command, MatchOptions, MatchState } from "./types";

export interface Entrant {
  team: TeamId;
  character: CharacterId;
  /** The phone playing them, or null for a computer player. */
  seat: number | null;
}

export const DEFAULT_OPTIONS: MatchOptions = {
  seed: 1,
  seconds: MATCH.seconds,
  goalsToWin: MATCH.goalsToWin,
  replays: true,
};

/** A match ready to kick off. Entrants fill the slots of their team in order. */
export function createMatch(entrants: readonly Entrant[], options: Partial<MatchOptions> = {}): MatchState {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const slots: [number, number] = [0, 0];
  const athletes = entrants.map((e, id) => makeAthlete(id, e.team, slots[e.team]++, e.character, e.seat));
  const state: MatchState = {
    phase: "kickoff",
    phaseT: 0,
    clock: opts.seconds,
    golden: false,
    score: [0, 0],
    kickoffTeam: 0,
    restartTeam: null,
    athletes,
    keepers: [makeKeeper(0), makeKeeper(1)],
    ball: newBall(),
    flight: null,
    winner: null,
    lastGoal: null,
    rng: new Rng(opts.seed),
    events: [],
    options: opts,
    time: 0,
    shotCount: 0,
  };
  setupKickoff(state);
  return state;
}

/**
 * One fixed step of the match. Events from the step are left in
 * `state.events` for the host to read. Commands come from phones, keyed
 * by athlete id; computer players make their own.
 */
export function stepMatch(state: MatchState, commands: ReadonlyMap<number, Command> = new Map(), dt: number = STEP): void {
  state.events = [];
  state.time += dt;
  state.phaseT += dt;
  switch (state.phase) {
    case "kickoff":
      for (const k of state.keepers) updateKeeper(state, k, dt);
      if (state.phaseT >= MATCH.kickoffWait) startPlay(state);
      return;
    case "play":
      playStep(state, commands, dt);
      return;
    case "restart":
      playStep(state, new Map(), dt);
      if (state.phase === "restart" && state.phaseT >= MATCH.outWait) restartFromKeeper(state);
      return;
    case "goal":
      celebrateGoal(state, dt);
      ballOnly(state, dt);
      if (state.phaseT < MATCH.celebrate) return;
      if (state.winner !== null) return fullTime(state);
      if (state.options.replays) {
        state.phase = "replay";
        state.phaseT = 0;
      } else setupKickoff(state);
      return;
    case "replay":
      if (state.phaseT >= MATCH.replay) setupKickoff(state);
      return;
    case "fulltime":
      celebrateWin(state, dt);
      ballOnly(state, dt);
      return;
  }
}

/** The ball keeps settling in the net while everyone celebrates. */
function ballOnly(state: MatchState, dt: number): void {
  if (!state.ball.owner) stepLooseBall(state, dt);
}
