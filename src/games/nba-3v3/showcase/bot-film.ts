import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { CHARACTER_IDS } from "../roster";

/**
 * A development aid for looking at the animation: a whole game between
 * computer players from a fixed seed, check ups and all, filmed by the
 * showcase like its highlight. Open `/showcase/nba-3v3?bots=3&at=12`
 * to hold the frame twelve seconds in.
 */
export class BotFilm {
  readonly match: Match;

  constructor(seed: number) {
    this.match = new Match({
      seed,
      firstOffence: 0,
      entries: CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null })),
    });
  }

  steer(): void {}

  slowFor(e: MatchEvent): { scale: number; seconds: number } | null {
    void e;
    return null;
  }
}
