/**
 * The roster. Every character shares one skeleton and one animation set,
 * so this file only carries what a player sees on the select screen. The
 * art pieces that make each one look different live in `rig/skins`.
 */

export const CHARACTER_IDS = ["vale", "duchess", "marrow", "iron"] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  /** One line shown under the name on the select screen. */
  tagline: string;
}

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  vale: { id: "vale", name: "Vale", tagline: "Modern kit, mesh mask, straight épée." },
  duchess: { id: "duchess", name: "Duchess", tagline: "Plumed hat, short cape, rapier." },
  marrow: { id: "marrow", name: "Marrow", tagline: "Long coat, bandana, curved saber." },
  iron: { id: "iron", name: "Iron", tagline: "Visored helm, plate arms, arming sword." },
};

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && (CHARACTER_IDS as readonly string[]).includes(value);
}
