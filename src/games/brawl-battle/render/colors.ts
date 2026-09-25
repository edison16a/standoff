import { PLAYER_COLORS, playerColor } from "@/games/kit/players";
import type { CharacterId } from "../roster";

export interface FighterColours {
  /** The player's colour: their seat's, or a spare one for a bot. */
  colour: string;
  /** Set when another fighter shares the character, so the model wears the colour. */
  tint: string | null;
}

/**
 * Colours for everyone in a match. Phones keep their seat colour, as in
 * every other game; bots take the first of the four seat colours that
 * no phone is using, so no two fighters ever match.
 */
export function fighterColours(fighters: readonly { seat: number | null; character: CharacterId }[]): FighterColours[] {
  const taken = new Set(fighters.flatMap((f) => (f.seat === null ? [] : [playerColor(f.seat)])));
  const spare = PLAYER_COLORS.filter((c) => !taken.has(c));
  let nextSpare = 0;
  return fighters.map((f) => {
    const colour = f.seat !== null ? playerColor(f.seat) : (spare[nextSpare++ % spare.length] ?? PLAYER_COLORS[0]);
    const shared = fighters.filter((o) => o.character === f.character).length > 1;
    return { colour, tint: shared ? colour : null };
  });
}

/** Each fighter's own effect colours: swing trails, sparks and the ult aura. */
export const FX: Record<CharacterId, { trail: string; spark: string; aura: string }> = {
  karate: { trail: "#fff1c1", spark: "#ffd166", aura: "#ff8a3d" },
  samurai: { trail: "#e0f2fe", spark: "#bae6fd", aura: "#f43f5e" },
  mage: { trail: "#c4b5fd", spark: "#e9d5ff", aura: "#a855f7" },
  bear: { trail: "#fed7aa", spark: "#fdba74", aura: "#f59e0b" },
};
