import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { Battle } from "../engine/battle";
import type { FighterSetup } from "../engine/fighter";
import type { GunId } from "../engine/guns";
import { Rng } from "../engine/rng";
import { assignCharacters } from "../roster";

/** The fight the home screen films. A new seed films another. */
export const SEED = 7;

const LINEUP: { name: string; gun: GunId }[] = [
  { name: "Nova", gun: "rifle" },
  { name: "Blaze", gun: "shotgun" },
  { name: "Vex", gun: "smg" },
  { name: "Kite", gun: "sniper" },
];

/** A 2v2 of hard computer players, one of each gun, with characters drawn from the seed. */
export function showcaseBattle(seed: number): Battle {
  const characters = assignCharacters(4, new Rng(seed));
  const setups: FighterSetup[] = LINEUP.map((l, i) => ({
    team: (i < 2 ? 0 : 1) as 0 | 1,
    seat: null,
    name: l.name,
    character: characters[i]!,
    gun: l.gun,
    difficulty: "hard",
  }));
  return new Battle(setups, seed);
}

/**
 * The capture tool lets the scene run three seconds after the page says
 * it is ready, then films. Nobody sees those frames, so the loop steps
 * through them without drawing.
 */
export const PREROLL = 2.95;

/** Battle time of the loop's first filmed frame: round five, as the pink side pushes up. */
export const FILM_START = 78;

/** How long the tool films: an eight second clip and one more second to blend over its start. */
export const FILMED = 9;

/** Where the loop's battle starts, so the film opens at FILM_START once the capture's warm up has run. */
export const LOOP_LEAD = FILM_START - 3;

/** From this battle time on, the loop is seen over this fighter's shoulder. */
export interface Cut {
  from: number;
  fighter: number;
}

/**
 * The loop's cuts, one gun's kill each. Blaze runs at Vex and drops him
 * with the shotgun. Kite waits behind the wall at the back, steps out
 * and snipes Blaze. Nova answers with a burst, ducks, peeks again and
 * walks the rifle onto Kite. Each fighter is cut to once, so every
 * shoulder camera starts fresh in place instead of swinging round.
 */
export const CUTS: readonly Cut[] = [
  { from: 0, fighter: 1 },
  { from: 81, fighter: 3 },
  { from: 82.2, fighter: 0 },
];

/** Whose shoulder the loop looks over at a battle time. */
export function heroAt(time: number): number {
  let fighter = CUTS[0]!.fighter;
  for (const cut of CUTS) if (time >= cut.from) fighter = cut.fighter;
  return fighter;
}

/** The poster and the icon are single frames, run this far ahead without drawing and then held. */
export const STILL_AT: Record<ShowcaseView, number> = { loop: 0, poster: 79.42, icon: 79.42 };

/**
 * The stills' television shots, world metres, side on to the fight:
 * Blaze's shotgun going off into Vex a few paces away, paint bursting on
 * Vex's vest, with the stands behind. The square icon stands further
 * back to hold both, and looks lower so they stand above the logo.
 */
export const STILL_CAMERA: Partial<Record<ShowcaseView, { from: THREE.Vector3; at: THREE.Vector3 }>> = {
  poster: { from: new THREE.Vector3(-6.8, 1.5, 1.0), at: new THREE.Vector3(-2.2, 1.1, 1.4) },
  icon: { from: new THREE.Vector3(-8.2, 1.35, 1.3), at: new THREE.Vector3(-2.2, 0.75, 1.35) },
};
