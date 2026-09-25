import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { DemoFight } from "../showcase/demo-fight";

/** How long a finished demo fight stays on screen before the next begins, in milliseconds. */
const REST_MS = 4_000;

/**
 * The fight behind the menus: two computer boxers going at it, with a
 * fresh fight a few seconds after each one is decided, so the menus
 * always have something happening behind them.
 */
export class MenuDemo {
  private fight = new DemoFight(3, { busy: false });
  private seed = 3;
  private over = 0;

  get match(): Match {
    return this.fight.match;
  }

  step(ms: number): MatchEvent[] {
    const events = this.fight.step(ms);
    if (this.fight.match.phase !== "over") this.over = 0;
    else if ((this.over += ms) > REST_MS) {
      this.fight = new DemoFight(++this.seed, { busy: false });
      this.over = 0;
    }
    return events;
  }
}
