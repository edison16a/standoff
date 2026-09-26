import type { Rng } from "./engine/rng";

/**
 * The four fighters. Each is an original design with its own build, so a
 * player can tell them apart across the arena. Teams tint their kit; the
 * character keeps its own shape and details. Hit boxes are the same for
 * all four, so the draw never changes the odds.
 */
export const CHARACTER_IDS = ["pro", "operator", "runner", "heavy"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface Character {
  id: CharacterId;
  name: string;
  blurb: string;
  /** Standing height in metres, for the model only. */
  height: number;
  /** Shoulder width, 1 is average. */
  bulk: number;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  pro: { id: "pro", name: "Paintball Pro", blurb: "Padded jersey, full mask, never sits still.", height: 1.8, bulk: 1 },
  operator: { id: "operator", name: "Operator", blurb: "Plate carrier, helmet and a calm head.", height: 1.82, bulk: 1.08 },
  runner: { id: "runner", name: "Street Runner", blurb: "Hoodie, bandana and quick feet.", height: 1.74, bulk: 0.92 },
  heavy: { id: "heavy", name: "Heavy Gunner", blurb: "Big frame, bigger vest, all nerve.", height: 1.88, bulk: 1.2 },
};

/** A different character for each fighter, shuffled so nobody always gets the same one. */
export function assignCharacters(count: number, rng: Rng): CharacterId[] {
  const pool = [...CHARACTER_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
