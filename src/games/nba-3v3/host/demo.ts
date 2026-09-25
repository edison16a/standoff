import { CENTER } from "@/games/kit/pad/stick-math";
import type { MatchEvent } from "../engine/events";
import type { Entry } from "../engine/match";
import { CHARACTER_IDS } from "../roster";
import { MatchDriver } from "./match-driver";

/** Six stars, a different six each time, so the lobby shows off the roster. */
function lineup(round: number): Entry[] {
  const start = (round * 3) % CHARACTER_IDS.length;
  return Array.from({ length: 6 }, (_, i) => ({
    team: (i % 2) as 0 | 1,
    character: CHARACTER_IDS[(start + i) % CHARACTER_IDS.length]!,
    seat: null,
  }));
}

/**
 * The game playing itself behind the lobby: computer players only, a new
 * set of stars every game. Its events feed the picture but not the
 * sound, so the lobby music is not drowned out.
 */
export class DemoGame {
  driver: MatchDriver;
  private round = 0;

  constructor(private readonly onEvent: (event: MatchEvent) => void) {
    this.driver = this.make();
  }

  get match() {
    return this.driver.match;
  }

  tick(realDt: number): number {
    const m = this.driver.match;
    if (m.phase === "over" && m.phaseT > 6) this.driver = this.make();
    return this.driver.tick(realDt, () => CENTER);
  }

  private make(): MatchDriver {
    const driver = new MatchDriver(lineup(this.round++));
    driver.listen(this.onEvent);
    return driver;
  }
}
