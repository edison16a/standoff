import { Match } from "../engine/match";
import type { MatchEvent } from "../engine/events";
import { BUILD_IDS } from "../builds";

/**
 * A development aid for looking at the players themselves: all six
 * builds in a row across the free throw line, facing the broadcast
 * camera, the Shooter dribbling in place and the rest standing at ease.
 * Open `/showcase/nba-3v3?lab=lineup&at=2` with `&cam=` or `&follow=`
 * for close ups of faces, kits and shoes.
 */
export class LineupFilm {
  readonly match: Match;

  constructor() {
    this.match = new Match({
      seed: 11,
      firstOffence: 0,
      botLevel: "training",
      entries: BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null })),
    });
    const m = this.match;
    m.checkBeat = false;
    m.phase = "live";
    m.athletes.forEach((a, i) => Object.assign(a, { x: (i - 2.5) * 1.5, z: 7, yaw: 0, vx: 0, vz: 0 }));
    m.ball.holder = 0;
    m.brains.reset();
  }

  steer(t: number): void {
    void t;
    for (const a of this.match.athletes) {
      a.move = { x: 0, z: 0 };
      a.stealCd = Math.max(a.stealCd, 0.5);
      a.blockCd = Math.max(a.blockCd, 0.5);
    }
  }

  slowFor(e: MatchEvent): null {
    void e;
    return null;
  }
}
