import { Match, STEP, buildView, type MatchView } from "../engine";
import { adminWin } from "../engine/admin";
import { blendViews } from "../engine/view-blend";
import { SHOWCASE_SEED, SHOWCASE_TEAMS } from "./scene";

/**
 * Every still of a seeded match of computer players up to a moment,
 * one per engine step, so the trailer can show any instant of it at any
 * speed and from any camera, and go back to show a play again.
 */
export class Reel {
  private readonly frames: MatchView[] = [];

  /** Plays `match` for `seconds`, keeping each still. */
  constructor(match: Match, seconds: number) {
    this.frames.push(buildView(match));
    for (let t = 0; t < seconds; t += STEP) {
      match.step(STEP);
      this.frames.push(buildView(match));
    }
    match.drainEvents();
  }

  /** The still at a match time, blended between the two steps either side for smooth slow motion. */
  at(time: number): MatchView {
    const f = this.frames;
    const first = f[0]!.time;
    const pos = Math.max(0, Math.min(f.length - 1, (time - first) / STEP));
    const i = Math.floor(pos);
    const a = f[i]!;
    const b = f[Math.min(f.length - 1, i + 1)]!;
    const k = pos - i;
    const view = blendViews(a, b, k);
    // The presentation's own clock moves the trophy, so it blends too, or a slow lift would step.
    if (a.ceremony && b.ceremony) view.ceremony = { ...view.ceremony!, t: a.ceremony.t + (b.ceremony.t - a.ceremony.t) * k };
    return view;
  }
}

/** The showcase's own game to 90 seconds: the long touchdown, and the big hit late on. */
export function gameReel(seed = SHOWCASE_SEED): Reel {
  return new Reel(new Match({ entries: SHOWCASE_TEAMS, seed, level: "hard", firstOffense: 0 }), 90);
}

/** The same game won on the spot by the Storm, through its trophy presentation. */
export function trophyReel(seed = SHOWCASE_SEED): Reel {
  const match = new Match({ entries: SHOWCASE_TEAMS, seed, level: "hard", firstOffense: 0 });
  adminWin(match, 0);
  return new Reel(match, 12);
}
