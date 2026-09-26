import type { ShowcaseView } from "@/platform/games/game-api";
import { createMatch } from "../engine/match";
import { Rng } from "../engine/rng";
import { pickStage } from "../engine/stages";
import type { MatchState } from "../engine/types";
import { CHARACTER_IDS } from "../roster";

/** The match every view films: four hard bots on the stage this seed picks, the Dojo Rooftop. */
export const SEED = 9;

/**
 * The capture tool lets the scene run three seconds after the page says
 * it is ready, then films. Nobody sees those frames, so the loop steps
 * through them without drawing.
 */
export const PREROLL = 2.95;

/**
 * Where the loop's match starts, in seconds. Three KOs land in the film,
 * one after another: the mage knocks the samurai out, the bear sends
 * the mage after, and the samurai takes the bear.
 */
export const LOOP_LEAD = 13.3;

/** How long the tool films: an eight second clip and one more second to blend over its start. */
export const FILMED = 9;

/** The poster and the icon are single frames, run this far ahead without drawing and then held. */
export const STILL_AT: Record<ShowcaseView, number> = { loop: 0, poster: 9.1, icon: 9.1 };

/**
 * The stills' shots, in stage metres: the samurai letting go of a charged
 * Heaven Cut in a flare at the right edge, with the karate rushing in and
 * the bear on the platform above. The icon sits closer and low, so the
 * action clears the logo.
 */
export const STILL_CAMERA: Partial<Record<ShowcaseView, { x: number; y: number; distance: number }>> = {
  poster: { x: 6.2, y: 2.2, distance: 11.5 },
  icon: { x: 6.8, y: 1.4, distance: 10.5 },
};

/** The showcase's match, the same every time for the same seed. */
export function showcaseMatch(seed = SEED): MatchState {
  const entrants = CHARACTER_IDS.map((character) => ({ character, seat: null }));
  return createMatch(entrants, { seed, stage: pickStage(new Rng(seed)), difficulty: "hard" });
}
