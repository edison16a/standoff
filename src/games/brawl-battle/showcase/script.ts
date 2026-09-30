import { createMatch } from "../engine/match";
import { Rng } from "../engine/rng";
import { pickStage } from "../engine/stages";
import type { MatchState } from "../engine/types";
import { CHARACTER_IDS } from "../roster";

/** The main fight the showcase films: four hard bots on the stage this seed picks, the Dojo Rooftop. */
export const SEED = 9;

/** The showcase's match, the same every time for the same seed. */
export function showcaseMatch(seed = SEED): MatchState {
  const entrants = CHARACTER_IDS.map((character) => ({ character, seat: null }));
  return createMatch(entrants, { seed, stage: pickStage(new Rng(seed)), difficulty: "hard" });
}
