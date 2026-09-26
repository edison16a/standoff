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
