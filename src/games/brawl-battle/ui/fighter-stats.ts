import type { CharacterId } from "../roster";

/** How each fighter plays, out of five, for the phone's picker. Read from their moves and bodies. */
export const FIGHTER_STATS: Record<CharacterId, { speed: number; power: number; reach: number }> = {
  karate: { speed: 5, power: 2, reach: 2 },
  samurai: { speed: 3, power: 3, reach: 5 },
  mage: { speed: 2, power: 3, reach: 4 },
  bear: { speed: 1, power: 5, reach: 3 },
};

/** A bold backdrop for each face in the picker, before the player's own colour takes over. */
export const PICKER_COLOURS: Record<CharacterId, string> = {
  karate: "#fb923c",
  samurai: "#f87171",
  mage: "#a78bfa",
  bear: "#fbbf24",
};
