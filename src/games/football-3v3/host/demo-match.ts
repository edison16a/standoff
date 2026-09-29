import type { MatchEvent } from "../engine/events";
import type { Entry } from "../engine/lineup";
import { Match } from "../engine/match";
import { STEP } from "../engine/tuning";
import { buildView, type MatchView } from "../engine/view";
import { StepClock } from "./step-clock";

/** Two full teams of computer players, one of every build. */
const LINEUP: Entry[] = [
  { team: 0, role: "qb", build: "gunslinger", seat: null },
  { team: 0, role: "runner", build: "speedster", seat: null },
  { team: 0, role: "runner", build: "routerunner", seat: null },
  { team: 1, role: "qb", build: "scrambler", seat: null },
  { team: 1, role: "runner", build: "lockdown", seat: null },
  { team: 1, role: "runner", build: "powerback", seat: null },
];

/**
 * Computer players having a game behind the lobby, so the big screen
 * shows football while everyone picks their builds. When it ends another
 * starts.
 */
export class DemoMatch {
  private match: Match;
  private readonly clock = new StepClock();
  private seed = 1;
  view: MatchView;

  constructor() {
    this.match = this.fresh();
    this.view = buildView(this.match);
  }

  private fresh(): Match {
    return new Match({ entries: LINEUP, seed: this.seed++, level: "medium", quarterSeconds: 600, target: 99 });
  }

  tick(nowMs: number): MatchEvent[] {
    const events: MatchEvent[] = [];
    for (let i = this.clock.stepsFor(nowMs); i > 0; i--) {
      this.match.step(STEP);
      events.push(...this.match.drainEvents());
    }
    if (this.match.phase === "over" && this.match.phaseT > 4) this.match = this.fresh();
    this.view = buildView(this.match);
    return events;
  }
}
