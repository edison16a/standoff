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
  return new Battle(setups, seed, { movement: "cover" });
}

/**
 * The capture tool lets the scene run three seconds after the page says
 * it is ready, then films. Nobody sees those frames, so the trailer
 * starts only after them.
 */
export const PREROLL = 2.95;

/** The poster and the icon are single frames, run this far ahead without drawing and then held. */
export const STILL_AT: Record<ShowcaseView, number> = { loop: 0, poster: 89.42, icon: 89.44 };

/**
 * The stills' cameras, world metres. The poster looks from low on the
 * near side of the fight: Blaze on the left, his shotgun going off into
 * Vex four paces away, paint bursting on Vex's mask, the big round
 * bunker between them. The icon is down on the grass in front of Vex as
 * he rises beside that bunker and the paint hits him, looking up so he
 * stands above the logo with the stands and their colours behind him.
 */
export const STILL_CAMERA: Partial<Record<ShowcaseView, { from: THREE.Vector3; at: THREE.Vector3; fov?: number }>> = {
  poster: { from: new THREE.Vector3(-1.25, 0.6, -18.3), at: new THREE.Vector3(-1, 1.0, -14.05), fov: 40 },
  icon: { from: new THREE.Vector3(-2.6, 0.5, -16.2), at: new THREE.Vector3(0.9, 0.35, -13.9), fov: 40 },
};
