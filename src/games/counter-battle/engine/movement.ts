import { updateBrain, type BrainWorld } from "./brain";
import type { Fighter } from "./fighter";
import { duckDown } from "./peek";
import { skirmishDuck, updateSkirmish } from "./skirmish";

/**
 * How fighters move. Matches skirmish (`skirmish.ts`): everyone keeps
 * moving round the other team at their gun's range. The cover brain
 * (`brain.ts`) hides and peeks from bunker to bunker; the showcase's
 * filmed fight was played with it and keeps it until it is filmed again.
 */
export type Movement = "skirmish" | "cover";

/** One step of a fighter's movement. */
export function moveFighter(movement: Movement, f: Fighter, w: BrainWorld, now: number, dt: number): void {
  if (movement === "skirmish") updateSkirmish(f, w, now, dt);
  else updateBrain(f, w, now, dt);
}

/** A computer player ducking after a burst. */
export function duckFighter(movement: Movement, f: Fighter, w: BrainWorld): void {
  if (movement === "skirmish") skirmishDuck(f, w);
  else duckDown(f, w);
}
