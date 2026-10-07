import type { CatchKind, CatchResult } from "../../../engine/catch-preset";
import {
  AIR, CLAP, CRADLE, GIVE, JOLT, join, LAND, LAYOUT, LOAD, OPEN, OVER_SHOULDER, SECURE, SWAT_DOWN, SWAT_UP, handsTo, type Part,
} from "./shapes";

/**
 * Each catch move as keys in seconds from the ball reaching the hands
 * (negative before it), authored for a ball on the catcher's left. The
 * approach brings the hands to the ball right on time; what follows is
 * picked by how it went. A key with no leg joints keeps the stride.
 */
export type Step = readonly [number, Part];

export interface CatchTrack {
  steps: Step[];
  /** Off the ground for part of it: the feet are the move's, not the stride's. */
  air: boolean;
}

/** What the body knows about the ball coming: how high it meets him, and whether he is near standing. */
export interface Arrival {
  height: number;
  slow: boolean;
}

/** The approach: from the run to the hands meeting the ball at 0. */
function approach(kind: CatchKind, at: Arrival): Step[] {
  const hands = handsTo(at.height);
  const give = at.slow ? GIVE : {};
  switch (kind) {
    case "chest":
    case "stumble":
      return [[-0.42, {}], [-0.14, join(give, hands)], [0, join(give, hands, { pitch: 0.18 })]];
    case "high":
      return [[-0.45, {}], [-0.24, join(LOAD, { neckX: -0.6 })], [-0.08, join(AIR, handsTo(2.5), { lift: 0.42 })], [0, join(AIR, handsTo(2.6), { lift: 0.55 })]];
    case "pick": {
      // Up only as far as the ball needs: a hop for one at the chest, a leap for one over the helmet.
      const lift = Math.max(0.12, Math.min(0.5, (at.height - 1.3) * 0.6));
      return [[-0.42, {}], [-0.22, join(LOAD, { pitch: 0.35 })], [-0.06, join(AIR, handsTo(at.height), { lift: lift * 0.8, pitch: 0.15 })], [0, join(AIR, handsTo(at.height), { lift })]];
    }
    case "dive":
      return [[-0.42, {}], [-0.3, join(LOAD, { pitch: 0.55 })], [-0.12, join(LAYOUT, { lift: 0.35 })], [0, join(LAYOUT, { lift: 0.3, shLX: -2.8, shRX: -2.7 })]];
    case "shoulder":
      return [[-0.5, {}], [-0.3, { neckY: 1.0, spineY: 0.4, neckX: -0.3 }], [0, OVER_SHOULDER]];
    case "swat":
      return [[-0.4, {}], [-0.22, LOAD], [-0.06, join(AIR, SWAT_UP, { lift: 0.45 })], [0, join(AIR, SWAT_UP, { lift: 0.5 })]];
  }
}

/** Where the body comes down after a move in the air: landing on two feet, or flat out on the turf from a dive. */
function landing(kind: CatchKind): Step[] {
  if (kind === "dive") return [[0.18, join(LAYOUT, { lift: 0.1 })], [0.32, join(LAYOUT, { pitch: 1.5, lift: 0 })]];
  if (kind === "high" || kind === "pick" || kind === "swat") return [[0.3, join(LAND, { lift: 0 })], [0.55, {}]];
  return [[0.45, {}]];
}

/** Held: into the chest, then away under the arm, turning upfield. */
function held(kind: CatchKind, at: Arrival): Step[] {
  if (kind === "dive") return [[0.12, join(LAYOUT, CRADLE, { lift: 0.2 })], [0.32, join(LAYOUT, SECURE, { pitch: 1.5, lift: 0, neckX: -0.6 })]];
  if (kind === "high" || kind === "pick") return [[0.14, join(AIR, CRADLE, { lift: 0.35 })], [0.32, join(LAND, CRADLE, { lift: 0 })], [0.6, join(SECURE, { spineY: -0.3 })]];
  if (kind === "stumble") {
    // Rocked back by a hot or crowded ball, he pitches forward to catch his balance with it.
    return [[0.1, join(CRADLE, { pitch: -0.25, spineX: -0.1 })], [0.32, join(SECURE, { pitch: 0.45, neckX: -0.4 })], [0.55, SECURE]];
  }
  const give = at.slow ? GIVE : {};
  return [[0.12, join(give, CRADLE)], [0.35, join(SECURE, { spineY: -0.35, neckY: -0.4 })], [0.55, SECURE]];
}

/** Every other ending: the ball off the hands, knocked loose, slapped away or gone by. */
function lost(kind: CatchKind, result: Exclude<CatchResult, "held">): Step[] {
  const air = kind === "high" || kind === "pick" || kind === "swat" || kind === "dive";
  const up = air && kind !== "dive" ? join(AIR, { lift: 0.3 }) : kind === "dive" ? join(LAYOUT, { lift: 0.18 }) : {};
  const first: Part =
    result === "swatted" ? SWAT_DOWN : result === "jarred" ? JOLT : result === "dropped" ? OPEN : CLAP;
  const after = landing(kind).map(([t, p]): Step => [t, t < 0.4 ? join(p, result === "swatted" ? { shLX: -0.9, shLY: 0.5 } : OPEN) : p]);
  return [[0.1, join(up, first)], ...after];
}

/** The whole track of a move that finished with `result`, or still coming when null. */
export function catchTrack(kind: CatchKind, result: CatchResult | null, at: Arrival): CatchTrack {
  const steps = approach(kind, at);
  const air = kind === "high" || kind === "pick" || kind === "swat" || kind === "dive";
  if (result === "held") steps.push(...held(kind, at));
  else if (result) steps.push(...lost(kind, result));
  return { steps, air };
}
