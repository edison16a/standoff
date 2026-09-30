import type { ShowcaseView } from "@/platform/games/game-api";
import type { Cut } from "./film";
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
  /** Hard studio light instead of the game's own, for key art. */
  dramatic?: boolean;
  /** Cuts through the script like a trailer, from `start` on. */
  film?: readonly Cut[];
}

/**
 * The trailer: eight seconds of the loop script, cut in close. The rising
 * throw, the three fruit combo in slow motion, every blade on the giant
 * melon and its burst in slow motion, the glowing dragonfruit, the bomb
 * going off, and the last flurry pulled wide. Cuts skip ahead through
 * the script, and one pass moves it on by one period, so the clip loops.
 */
const TRAILER: readonly Cut[] = [
  { from: 0.75, seconds: 0.4, aim: { x: -2.4, y: -0.6, zoom: 1.35 } },
  { from: 1.15, seconds: 1, rate: 0.3, aim: { x: -2.4, y: -0.6, zoom: 1.35 }, to: { x: -2.6, y: 0.3, zoom: 1.75 } },
  { from: 2.1, seconds: 1.25, aim: { x: 0.4, y: -0.9, zoom: 1.55 }, to: { x: 0.6, y: -0.7, zoom: 1.7 } },
  { from: 3.55, seconds: 0.4, aim: { x: 0.6, y: -1.1, zoom: 1.9 } },
  { from: 3.95, seconds: 1.1, rate: 0.3, aim: { x: 0.6, y: -1.1, zoom: 1.9 }, to: { x: 0.5, y: -1.3, zoom: 2.3 } },
  { from: 4.3, seconds: 0.9, aim: { x: -3.8, y: 1.2, zoom: 1.5 } },
  { from: 5.6, seconds: 0.35, aim: { x: 2.6, y: 0.8, zoom: 1.6 } },
  { from: 5.95, seconds: 0.8, rate: 0.4, aim: { x: 2.6, y: 0.8, zoom: 1.6 }, to: { x: 2.6, y: 0.8, zoom: 1.3 } },
  { from: 6.6, seconds: 1.8, aim: { x: 0, y: 0.2, zoom: 1.2 }, to: { x: 0, y: 0, zoom: 1.02 } },
];

/**
 * The capture tool films the loop from three seconds after the page is
 * ready. Starting at 16, two whole periods in, the board already holds
 * the stains and halves of the period before. The trailer shows no name
 * tags or points, since a trailer has no words.
 */
export const SHOTS: Record<ShowcaseView, Shot> = {
  loop: { script: LOOP, start: 16, labels: false, film: TRAILER },
  poster: { script: LOOP, start: 20.2, freeze: 20.2, camera: { x: -0.4, y: -0.5, zoom: 1.35 }, labels: false },
  icon: { script: ICON, start: ICON_AT, freeze: ICON_AT, camera: { x: 0, y: 1.3, zoom: 1.65 }, labels: false, dramatic: true },
};
