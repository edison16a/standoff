import { Match, buildView, type MatchView } from "../engine";
import type { Entry } from "../engine/lineup";
import type { MatchOptions } from "../engine/match";

/**
 * The showcase's seeded game. The trailer's moments are picked from it,
 * so a change to the engine or the bots that moves them means picking
 * new ones (trailer.test.ts says so).
 */
export const SHOWCASE_SEED = 111;

/** Two full teams of computer players, one of every build. */
export const SHOWCASE_TEAMS: Entry[] = [
  { team: 0, role: "qb", build: "gunslinger", seat: null },
  { team: 0, role: "runner", build: "speedster", seat: null },
  { team: 0, role: "runner", build: "routerunner", seat: null },
  { team: 1, role: "qb", build: "scrambler", seat: null },
  { team: 1, role: "runner", build: "lockdown", seat: null },
  { team: 1, role: "runner", build: "powerback", seat: null },
];

/**
 * The showcase's match: its seed, its teams and Hard computer players.
 * The media were filmed before the deep threat, so this game plays the
 * last support slot as the lead back, as it was filmed.
 */
export const showcaseMatch = (seed = SHOWCASE_SEED): MatchOptions => ({ entries: SHOWCASE_TEAMS, seed, level: "hard", firstOffense: 0, deepThreat: false });

/**
 * A seeded match of computer players at kick off, for the animation
 * lab, which draws its own poses over the match's view.
 */
export class ShowcaseScene {
  readonly match: Match;
  readonly view: MatchView;

  constructor(seed: number) {
    this.match = new Match(showcaseMatch(seed));
    this.view = buildView(this.match);
  }
}
