import type { CharacterId } from "../../roster";
import { BEAR } from "./bear";
import { KARATE } from "./karate";
import { MAGE } from "./mage";
import { SAMURAI } from "./samurai";
import type { ChargeKey, Move, MoveKey, Moveset } from "./types";

export * from "./types";

export const MOVESETS: Record<CharacterId, Moveset> = { karate: KARATE, samurai: SAMURAI, mage: MAGE, bear: BEAR };

export function moveOf(character: CharacterId, key: MoveKey): Move {
  return MOVESETS[character][key];
}

/** Heavy and ult moves are the Attack 2 family, for sound and hit stop. */
export function isHeavyKey(key: MoveKey): boolean {
  return key.startsWith("heavy") || key.startsWith("holdHeavy") || key === "ult";
}

/** A charged release. */
export function isChargeKey(key: MoveKey): key is ChargeKey {
  return key.startsWith("hold");
}
