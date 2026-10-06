import { Match, buildView, type MatchView } from "../engine";
import type { Entry } from "../engine/lineup";

/**
 * The showcase's seeded game. The trailer's moments are picked from it,
 * so a change to the engine or the bots that moves them means picking
 * new ones (trailer.test.ts says so).
 */
export const SHOWCASE_SEED = 347;

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
 * A seeded match of computer players at kick off, for the animation
 * lab, which draws its own poses over the match's view.
 */
export class ShowcaseScene {
  readonly match: Match;
  readonly view: MatchView;

  constructor(seed: number) {
    this.match = new Match({ entries: SHOWCASE_TEAMS, seed, level: "hard", firstOffense: 0 });
    this.view = buildView(this.match);
  }
}
