import { buildView, Match, STEP, type MatchView } from "../engine";
import { BOTS } from "../engine/test-helpers";

/** A real view of a fresh bot match, for render tests to start from. */
export function freshView(seed = 3): MatchView {
  return buildView(new Match({ entries: BOTS, seed, firstOffense: 0 }));
}

/** A bot match stepped until `until` holds, or null if it never does in `seconds`. */
export function viewWhen(until: (v: MatchView) => boolean, seconds = 120, seed = 3): MatchView | null {
  const m = new Match({ entries: BOTS, seed, firstOffense: 0, level: "hard" });
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    m.drainEvents();
    const v = buildView(m);
    if (until(v)) return v;
  }
  return null;
}
