import { isDown, statsOf } from "./body";
import { knockDown } from "./down";
import { headingOf } from "./tackle-preset";
import type { Athlete } from "./types";
import { leftOf } from "./tackle-bind";
import { dist2, dot2, fromYaw, norm2 } from "./vec";

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

/** Called each step of a ball carrier's juke: on the step its dodge opens, the men it fools stumble or fall. */
export function jukeBeats(list: readonly Athlete[], runner: Athlete, dt: number): void {
  const act = runner.action;
  if (act.kind !== "juke" || act.t < act.dodge[0] || act.t - dt >= act.dodge[0]) return;
  // He bit on the fake: his weight lurches away from the way the runner actually went.
  const heading = headingOf(runner);
  const along = dot2(act.push, heading);
  const across = { x: act.push.x - heading.x * along, z: act.push.z - heading.z * along };
  for (const d of list) {
    const beat = beatBy(runner, d);
    const side: 1 | -1 = dot2(across, leftOf(fromYaw(d.yaw))) > 0 ? -1 : 1;
    if (beat === "fall") knockDown(d, BEAT.down, "juked");
    else if (beat === "stumble") d.stagger = Math.max(d.stagger, BEAT.stumble);
    if (beat) d.stumble = { t: 0, dur: beat === "fall" ? BEAT.down : BEAT.stumble, side };
  }
}

/** A stumble plays out and the man has his feet again. */
export function updateStumble(a: Athlete, dt: number): void {
  if (!a.stumble) return;
  a.stumble.t += dt;
  if (a.stumble.t >= a.stumble.dur) a.stumble = null;
}
