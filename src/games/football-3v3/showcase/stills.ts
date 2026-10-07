import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchView } from "../engine";
import type { FilmCam } from "./film-cams";

/** A frozen moment of the trailer, and its own camera when the film's is not the one for a still. */
export interface Still {
  /** Seconds into the trailer. */
  t: number;
  camera?: (view: MatchView) => FilmCam;
  /** How strong the warm key light is, against the film's. */
  key?: number;
}

/** The home screen's stills held from the trailer. The icon is staged key art instead (keyart.ts). */
export const STILLS: Partial<Record<ShowcaseView, Still>> = {
  // The corner leaving his feet at the receiver who has just pulled the ball in.
  poster: { t: 6.68 },
};
