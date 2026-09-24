import { FixedStepClock } from "../engine/clock";
import type { MatchEvent } from "../engine/events";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import type { MatchState } from "../engine/types";
import { buildView, type MatchView } from "../engine/view";

const LINEUP: Entrant[] = [
  { team: 0, character: "messi", seat: null },
  { team: 0, character: "bellingham", seat: null },
  { team: 0, character: "salah", seat: null },
  { team: 1, character: "ronaldo", seat: null },
  { team: 1, character: "kane", seat: null },
  { team: 1, character: "yamal", seat: null },
];

/**
 * Computer players having a kick about behind the lobby, so the big
 * screen shows the game while everyone picks their stars. When it ends
 * another starts.
 */
export class DemoMatch {
  private state: MatchState;
  private readonly clock = new FixedStepClock();
  private seed = 1;
  view: MatchView;

  constructor() {
    this.state = this.fresh();
    this.view = buildView(this.state);
  }

  private fresh(): MatchState {
    return createMatch(LINEUP, { seed: this.seed++, replays: false, seconds: 600, goalsToWin: 99 });
  }

  tick(nowMs: number): MatchEvent[] {
    const events: MatchEvent[] = [];
    for (let i = this.clock.stepsFor(nowMs); i > 0; i--) {
      stepMatch(this.state);
      events.push(...this.state.events);
    }
    if (this.state.phase === "fulltime" && this.state.phaseT > 4) this.state = this.fresh();
    this.view = buildView(this.state);
    return events;
  }
}
