/**
 * The ten ratings every build is made of, 0 to 99. They come in the
 * pairs the builds are known by: a striker's finishing and shot power,
 * a playmaker's passing and vision, a winger's pace and dribbling, a
 * defender's tackling and strength, a sweeper keeper's reach and reflexes.
 */
export const ATTRIBUTE_IDS = ["finishing", "power", "passing", "vision", "pace", "dribbling", "tackling", "strength", "reach", "reflexes"] as const;
export type AttributeId = (typeof ATTRIBUTE_IDS)[number];
export type Attributes = Record<AttributeId, number>;

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  finishing: "Finishing",
  power: "Shot power",
  passing: "Passing",
  vision: "Vision",
  pace: "Pace",
  dribbling: "Dribbling",
  tackling: "Tackling",
  strength: "Strength",
  reach: "Reach",
  reflexes: "Reflexes",
};

/** The pairs, in the order the picker shows them: one row per specialist build. */
export const ATTRIBUTE_PAIRS: readonly (readonly [AttributeId, AttributeId])[] = [
  ["finishing", "power"],
  ["passing", "vision"],
  ["pace", "dribbling"],
  ["tackling", "strength"],
  ["reach", "reflexes"],
];

/** A rating from 0 to 99 as 0 to 1, for the engine's formulas. */
export function unit(stat: number): number {
  return Math.max(0, Math.min(1, stat / 99));
}

/** Every rating as 0 to 1. */
export function units(ratings: Attributes): Attributes {
  const out = {} as Attributes;
  for (const id of ATTRIBUTE_IDS) out[id] = unit(ratings[id]);
  return out;
}
