/**
 * What the host picks with the mouse before a round. Each option is a
 * short list of named steps rather than a free number, so the settings
 * card stays a row of big buttons anyone can read from the sofa.
 */

export const ROUND_LENGTHS = [45, 60, 90, 120] as const;
export const BOMB_LEVELS = ["none", "few", "some", "lots"] as const;
export const FRUIT_RATES = ["calm", "normal", "frantic"] as const;

export type RoundLength = (typeof ROUND_LENGTHS)[number];
export type BombLevel = (typeof BOMB_LEVELS)[number];
export type FruitRate = (typeof FRUIT_RATES)[number];

export interface Settings {
  seconds: RoundLength;
  bombs: BombLevel;
  fruit: FruitRate;
}

export const DEFAULT_SETTINGS: Settings = { seconds: 60, bombs: "some", fruit: "normal" };

/** Chance that any one thing thrown is a bomb. */
export const BOMB_CHANCE: Record<BombLevel, number> = { none: 0, few: 0.07, some: 0.13, lots: 0.22 };

/** How much more often waves come. */
export const FRUIT_RATE: Record<FruitRate, number> = { calm: 0.72, normal: 1, frantic: 1.45 };

export const BOMB_LABEL: Record<BombLevel, string> = { none: "None", few: "Few", some: "Some", lots: "Lots" };
export const FRUIT_LABEL: Record<FruitRate, string> = { calm: "Calm", normal: "Normal", frantic: "Frantic" };
