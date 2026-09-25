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
 * Where the loop's match starts, in seconds. Four KOs land in the film:
 * the samurai knocks the mage out, the bear sends the samurai after, the
 * karate takes the bear and the samurai the karate. Along the way the
 * bear throws two charged Haymakers and the mage a charged Frost Ring.
 */
export const LOOP_LEAD = 15.6;

/** How long the tool films: an eight second clip and one more second to blend over its start. */
export const FILMED = 9;

/** The poster and the icon are single frames, run this far ahead without drawing and then held. */
export const STILL_AT: Record<ShowcaseView, number> = { loop: 0, poster: 4.95, icon: 4.95 };

/**
 * The stills' shots, in stage metres: the karate's charged Dragon Flight
 * landing on the mage, with the samurai slashing down from the air and
 * the bear winding up Big Paw. The icon sits closer and low, so the
 * action clears the logo.
 */
export const STILL_CAMERA: Partial<Record<ShowcaseView, { x: number; y: number; distance: number }>> = {
  poster: { x: -0.8, y: 2.2, distance: 13 },
  icon: { x: -1.1, y: 1.3, distance: 11.5 },
};

/** The showcase's match, the same every time for the same seed. */
export function showcaseMatch(seed = SEED): MatchState {
  const entrants = CHARACTER_IDS.map((character) => ({ character, seat: null }));
  return createMatch(entrants, { seed, stage: pickStage(new Rng(seed)), difficulty: "hard" });
}
