import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchView } from "../engine";
import type { FilmCam } from "./film-cams";

/** A frozen moment of the trailer, and its own camera when the film's is not the one for a still. */
export interface Still {
  /** Seconds into the trailer. */
  t: number;
  camera?: (view: MatchView) => FilmCam;
}

/** The home screen's stills, held from the trailer. */
export const STILLS: Partial<Record<ShowcaseView, Still>> = {
  poster: { t: 1.9 },
  icon: { t: 6.2 },
};
