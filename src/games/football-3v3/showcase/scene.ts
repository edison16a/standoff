import { Match, STEP, buildView, type MatchEvent, type MatchView } from "../engine";
import type { Entry } from "../engine/lineup";

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
 * A seeded match of computer players, stepped at the engine's fixed
 * rate from the page's frame clock. The same seed and the same frame
 * times always play the same game, so a capture is repeatable.
 */
export class ShowcaseScene {
  readonly match: Match;
  view: MatchView;
  private carry = 0;
  private last = -1;

  constructor(seed: number, seek = 0) {
    this.match = new Match({ entries: SHOWCASE_TEAMS, seed, level: "hard", firstOffense: 0 });
    // Development peeks can jump ahead without drawing every frame on the way.
    for (let t = 0; t < seek; t += STEP) this.match.step(STEP);
    this.match.drainEvents();
    this.view = buildView(this.match);
  }

  /** Steps the match up to the frame time and returns what happened. */
  tick(nowMs: number): MatchEvent[] {
    if (this.last < 0) this.last = nowMs;
    this.carry += Math.min(0.25, Math.max(0, (nowMs - this.last) / 1000));
    this.last = nowMs;
    while (this.carry >= STEP) {
      this.match.step(STEP);
      this.carry -= STEP;
    }
    this.view = buildView(this.match);
    return this.match.drainEvents();
  }
}
