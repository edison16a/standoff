/**
 * The six players to pick from. This file holds who they are and how they
 * play; how they look (helmets, pads, skin, build) belongs to the renderer,
 * keyed by the same ids. Stats run 0 to 99.
 */

export const CHARACTER_IDS = ["blaze", "tank", "jet", "ace", "bolt", "rook"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface Stats {
  /** Top running speed. */
  speed: number;
  /** Breaking tackles, winning tackles, holding ground. */
  strength: number;
  /** Quicker jukes and sharper cuts. */
  agility: number;
  /** Arm strength and a tighter spiral. */
  arm: number;
  /** Safe catches and snatching interceptions. */
  hands: number;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** Printed on the jersey back and name tags. */
  short: string;
  number: number;
  /** A few words for the picker. */
  tagline: string;
  /** Body mass in kilograms, which sets how heavy the player feels. */
  mass: number;
  stats: Stats;
}

export const ROSTER: Record<CharacterId, Character> = {
  blaze: { id: "blaze", name: "Marcus Blaze", short: "BLAZE", number: 12, tagline: "Cannon arm", mass: 102, stats: { speed: 74, strength: 70, agility: 72, arm: 97, hands: 70 } },
  tank: { id: "tank", name: "Deon Tankersley", short: "TANK", number: 32, tagline: "Runs through walls", mass: 112, stats: { speed: 80, strength: 96, agility: 66, arm: 60, hands: 74 } },
  jet: { id: "jet", name: "Kai Jetson", short: "JET", number: 84, tagline: "Nobody catches him", mass: 84, stats: { speed: 98, strength: 60, agility: 88, arm: 58, hands: 86 } },
  ace: { id: "ace", name: "Tyler Acevedo", short: "ACE", number: 7, tagline: "Cool in the pocket", mass: 97, stats: { speed: 82, strength: 68, agility: 80, arm: 91, hands: 72 } },
  bolt: { id: "bolt", name: "Andre Boltz", short: "BOLTZ", number: 11, tagline: "Sticky hands", mass: 90, stats: { speed: 92, strength: 70, agility: 84, arm: 64, hands: 97 } },
  rook: { id: "rook", name: "Sam Rookwood", short: "ROOK", number: 22, tagline: "Ankle breaker", mass: 88, stats: { speed: 90, strength: 72, agility: 98, arm: 66, hands: 80 } },
};

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && (CHARACTER_IDS as readonly string[]).includes(value);
}

/** A stat from 0 to 99 as 0 to 1, for the engine's formulas. */
export function unit(stat: number): number {
  return Math.max(0, Math.min(1, stat / 99));
}
