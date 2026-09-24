import type { ShowcaseView } from "@/platform/games/game-api";
import { ICON, ICON_AT } from "./icon-script";
import { LOOP } from "./loop-script";
import type { Script } from "./script";

/** What each view films: which script, from when, and whether it stops on one frame. */
export interface Shot {
  script: Script;
  /** Film time the first drawn frame shows. Everything before is played through unseen. */
  start: number;
  /** Film time a still stops at. A loop never stops. */
  freeze?: number;
  /** Where the camera looks, for a close shot. A zoom of 1 is the whole board. */
  camera?: { x: number; y: number; zoom: number };
  /** Whether the players' name tags and the points show. */
  labels: boolean;
}

/**
 * The capture tool films the loop from three seconds after the page is
 * ready. Starting at 13 puts that at 16, two whole periods in, so the
 * board already holds the stains and halves of the period before and the
 * film's end runs into its start.
 */
export const SHOTS: Record<ShowcaseView, Shot> = {
  loop: { script: LOOP, start: 13, labels: true },
  poster: { script: LOOP, start: 17.36, freeze: 17.36, labels: true },
  icon: { script: ICON, start: ICON_AT, freeze: ICON_AT, camera: { x: 0, y: 1, zoom: 1.35 }, labels: false },
};
