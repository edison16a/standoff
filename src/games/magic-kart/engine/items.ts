/**
 * The power ups. A cube gives one at random, weighted by race position:
 * the leader mostly gets defence and something to throw, the back of the
 * pack gets speed and stealth to catch up. That keeps the pack together,
 * which is what makes a party race fun.
 */

export const ITEM_KINDS = ["orb", "nitro", "ice", "ghost", "shield"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_NAMES: Record<ItemKind, string> = {
  orb: "Star Orb",
  nitro: "Nitro",
  ice: "Ice Blast",
  ghost: "Vanish",
  shield: "Shield",
};

/** Weights for the kart in front, then for the kart at the back. */
const FRONT: Record<ItemKind, number> = { orb: 34, nitro: 10, ice: 14, ghost: 8, shield: 34 };
const BACK: Record<ItemKind, number> = { orb: 22, nitro: 36, ice: 16, ghost: 18, shield: 8 };

/**
 * Picks an item. `place` is 0 for the leader up to 1 for last, and
 * `roll` is a random number from 0 to 1, passed in so tests can pin it.
 */
export function rollItem(place: number, roll: number): ItemKind {
  const p = Math.max(0, Math.min(1, place));
  const weights = ITEM_KINDS.map((kind) => FRONT[kind] + (BACK[kind] - FRONT[kind]) * p);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let pick = roll * total;
  for (let i = 0; i < ITEM_KINDS.length; i++) {
    pick -= weights[i]!;
    if (pick < 0) return ITEM_KINDS[i]!;
  }
  return ITEM_KINDS[ITEM_KINDS.length - 1]!;
}

/** Items thrown at another kart, which the ghost hides you from. */
export function isThrown(kind: ItemKind): kind is "orb" | "ice" {
  return kind === "orb" || kind === "ice";
}
