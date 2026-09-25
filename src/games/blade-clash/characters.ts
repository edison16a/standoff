/**
 * The roster. Every fighter shares one body and one set of moves, so this
 * file carries what a player sees on the select screen and the one thing
 * that changes play: the blade. A longer blade reaches further, a wider
 * one blocks a little more easily.
 */

export const CHARACTER_IDS = ["knight", "samurai", "block", "star"] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

/** The blade's shape in play, in metres. Looks and sounds live with the renderer and the audio. */
export interface BladeSpec {
  /** From the hand to the tip. */
  length: number;
  /** How thick the blade counts as for hits and clashes. */
  radius: number;
}

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  /** One line shown under the name on the select screen. */
  tagline: string;
  /** The weapon's name, for the select screen. */
  weapon: string;
  blade: BladeSpec;
}

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  knight: {
    id: "knight",
    name: "Knight",
    tagline: "Plate armour and a long reach.",
    weapon: "Longsword",
    blade: { length: 1.08, radius: 0.03 },
  },
  samurai: {
    id: "samurai",
    name: "Samurai",
    tagline: "Lacquered armour and a quick curved edge.",
    weapon: "Katana",
    blade: { length: 1, radius: 0.028 },
  },
  block: {
    id: "block",
    name: "Block Hero",
    tagline: "Built from cubes, swings a chunky pixel sword.",
    weapon: "Pixel sword",
    blade: { length: 0.94, radius: 0.045 },
  },
  star: {
    id: "star",
    name: "Star Knight",
    tagline: "A robed duellist with a humming blade of light.",
    weapon: "Energy blade",
    blade: { length: 1.04, radius: 0.036 },
  },
};

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && (CHARACTER_IDS as readonly string[]).includes(value);
}
