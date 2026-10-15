import type { PlayEnd } from "../engine/events";
import type { WHISTLES } from "./whistle";

/**
 * Which whistle a play's end gets. Only scores are whistled: a blast
 * after every tackle and incompletion wore thin over a game, so dead
 * balls end on the pads and the crowd of bodies instead.
 */
export function whistleFor(end: PlayEnd): keyof typeof WHISTLES | null {
  return end === "touchdown" || end === "safety" || end === "fieldGoal" ? "score" : null;
}
