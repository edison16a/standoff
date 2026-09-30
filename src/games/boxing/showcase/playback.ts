import type { MatchEvent } from "../engine/events";
import type { FightScene } from "../render/fight-scene";
import { cycleToFight } from "./timeline";
import type { Trailer } from "./trailer";

const INPUT = { mirrors: [null, null], telegraph: [false, false] } as const;
/** The film moves on in steps this long, in real seconds, whatever the page's frame times. */
export const STEP = 1 / 60;

/**
 * Plays the film on by one step, to `at` seconds into the loop, and
 * returns the scene's clock moved on. Over the cut past the count the
 * fight plays on unseen, a step at a time, so the boxers, the referee
 * and the springs in their arms have all caught up when the next shot
 * opens.
 */
export function playStep(trailer: Trailer, scene: FightScene, at: number, clock: number, hear: (events: MatchEvent[]) => void): number {
  const from = cycleToFight(at - STEP) * 1000;
  const to = cycleToFight(at) * 1000;
  const steps = Math.max(1, Math.round((to - from) / (STEP * 1000)));
  const dt = (to - from) / steps / 1000;
  for (let i = 1; i <= steps; i++) {
    hear(trailer.advanceToMatch(from + ((to - from) * i) / steps));
    clock += dt;
    scene.update(trailer.match, INPUT, clock, dt);
  }
  return clock;
}
