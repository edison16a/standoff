import { CEREMONY } from "../engine/ceremony";
import type { MatchEvent } from "../engine/events";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import { STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import type { TrailerFilmKind } from "./trailer-plan";

const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "playmaker", seat: null },
  { team: 0, build: "defender", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "allrounder", seat: null },
  { team: 1, build: "winger", seat: null },
];

/** The Striker, who hurdles the slide, scores and lifts the cup. */
export const STRIKER = 0;

/**
 * Seeded with sharp computer players, and every shot rigged to go in:
 * this seed holds a slide tackle the Striker hops over, then his strike
 * from the edge of the box and his SUI. The trailer's timings are read
 * from it (trailer-plan.ts).
 */
const SEED = 60;

function match(): MatchState {
  return createMatch(LINEUP, { seed: SEED, replays: false, level: "hard", rig: () => "goal" });
}

/**
 * The same sides at full time, cut straight to the cup: the Striker has
 * the most goals, so he is the captain. Its seconds count from the cut.
 */
function ceremony(): MatchState {
  const state = match();
  state.phase = "fulltime";
  state.phaseT = CEREMONY.cut;
  state.winner = 0;
  state.score = [5, 2];
  state.athletes[STRIKER]!.stats.goals = 3;
  return state;
}

export function makeFilm(kind: TrailerFilmKind): MatchState {
  return kind === "ceremony" ? ceremony() : match();
}

/**
 * One engine step of a film, and what happened in it. Films always step
 * at the engine's own rate, so slow motion never changes how the seeded
 * match plays out: the trailer blends between steps instead.
 */
export function stepFilm(state: MatchState): MatchEvent[] {
  stepMatch(state, new Map(), STEP);
  return [...state.events];
}
