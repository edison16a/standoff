import { isDown, statsOf } from "./body";
import { knockDown } from "./down";
import type { Match } from "./match";
import { headingOf } from "./tackle-preset";
import type { Athlete } from "./types";
import { dist2, dot2, norm2 } from "./vec";

/**
 * A juke beats the men in front of it. As the dodge starts, a heavy
 * defender close in front bites on the fake: his feet get crossed and
 * he stumbles, or right on top of it his ankles go and he sits down.
 * Big linemen are the easiest to fool; a light, agile man keeps his feet.
 */
export const BEAT = {
  /** Defenders within this many metres of the juke, and in front of it, are fooled. */
  range: 1.7,
  /** Closer than this a heavy man falls instead of stumbling. */
  fall: 1.05,
  /** In front: the defender within about 70 degrees of the run. */
  ahead: 0.35,
  /** Heavier than this many kilograms, or a lineman, bites on a juke; agility above `steady` never falls. */
  heavy: 97,
  steady: 6,
  stumble: 0.75,
  /** Seconds on the turf for a man whose ankles went. */
  down: 1.3,
} as const;

/** Who a juke fools: what happens to `d` when `runner` starts dodging. */
export function beatBy(runner: Athlete, d: Athlete): "fall" | "stumble" | null {
  if (d.team === runner.team || isDown(d) || d.stumble) return null;
  if (d.action.kind !== "none" && d.action.kind !== "stance") return null;
  const gap = dist2(runner, d);
  if (gap > BEAT.range) return null;
  const to = norm2({ x: d.x - runner.x, z: d.z - runner.z });
  if (dot2(to, headingOf(runner)) < BEAT.ahead) return null;
  const heavy = d.role === "lineman" || d.mass > BEAT.heavy;
  if (!heavy) return null;
  return gap < BEAT.fall && statsOf(d).agility < BEAT.steady ? "fall" : "stumble";
}

/** Called each step of a juke: on the step its dodge opens, the men it fools stumble or fall. */
export function jukeBeats(m: Match, runner: Athlete, dt: number): void {
  const act = runner.action;
  if (act.kind !== "juke" || act.t < act.dodge[0] || act.t - dt >= act.dodge[0]) return;
  if (m.carrier() !== runner) return;
  // He lurches the way the runner went, as his weight was already moving there.
  const side: 1 | -1 = act.side;
  for (const d of m.athletes) {
    const beat = beatBy(runner, d);
    if (beat === "fall") knockDown(d, BEAT.down, "juked");
    else if (beat === "stumble") {
      d.stumble = { t: 0, side };
      d.stagger = Math.max(d.stagger, BEAT.stumble);
    }
  }
}

/** A stumble plays out and the man has his feet again. */
export function updateStumble(a: Athlete, dt: number): void {
  if (!a.stumble) return;
  a.stumble.t += dt;
  if (a.stumble.t >= BEAT.stumble) a.stumble = null;
}
