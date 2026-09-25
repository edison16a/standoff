import { CHARACTER_IDS, type CharacterId } from "../../roster";
import { BEAR_STYLE } from "./bear";
import { CHARGED_ANIMS } from "./charged";
import { KARATE_STYLE } from "./karate";
import { MAGE_STYLE } from "./mage";
import { SAMURAI_STYLE } from "./samurai";
import type { BaseStyle, Style } from "./style";

const BASE: Record<CharacterId, BaseStyle> = { karate: KARATE_STYLE, samurai: SAMURAI_STYLE, mage: MAGE_STYLE, bear: BEAR_STYLE };

export const STYLES = Object.fromEntries(
  CHARACTER_IDS.map((c) => [c, { ...BASE[c], moves: { ...BASE[c].moves, ...CHARGED_ANIMS[c] } }]),
) as Record<CharacterId, Style>;
