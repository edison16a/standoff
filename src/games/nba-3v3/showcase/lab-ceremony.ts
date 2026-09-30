import { Ceremony } from "../engine/ceremony";
import { Match } from "../engine/match";
import type { Entry as MatchEntry } from "../engine/match-options";
import { BUILD_IDS } from "../builds";

/**
 * A development aid: the trophy ceremony on its own, from the cut, for
 * reviewing the lift, the cameras and the confetti without playing a
 * game to 11. Open `/showcase/nba-3v3?lab=ceremony`, with `&at=6` to
 * hold a frame six seconds in or `&step=1` to step it.
 */
export class CeremonyFilm {
  readonly match: Match;
  readonly ceremony: Ceremony;

  /** By default a mixed lineup with the third player as captain; the trailer passes its highlight's team. */
  constructor(lineup?: readonly MatchEntry[], captain = 2) {
    const entries = lineup ? [...lineup] : BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));
    this.match = new Match({ seed: 5, entries });
    const m = this.match;
    m.phase = "over";
    m.winner = m.athletes[captain]!.team;
    m.score = m.winner === 0 ? [11, 8] : [8, 11];
    // The top scorer lifts it.
    m.athletes[captain]!.box.points = 6;
    this.ceremony = new Ceremony(m);
    this.ceremony.stage(m);
  }

  steer(): void {}

  /** One engine step of the ceremony: the match itself is held, as on the host. */
  stepCeremony(dt: number): void {
    this.ceremony.step(this.match, dt);
  }

  slowFor(): null {
    return null;
  }
}
