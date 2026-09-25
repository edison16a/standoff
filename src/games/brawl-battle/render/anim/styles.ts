import type { CharacterId } from "../../roster";
import { BEAR_STYLE } from "./bear";
import { KARATE_STYLE } from "./karate";
import { MAGE_STYLE } from "./mage";
import { SAMURAI_STYLE } from "./samurai";
import type { Style } from "./style";

export const STYLES: Record<CharacterId, Style> = { karate: KARATE_STYLE, samurai: SAMURAI_STYLE, mage: MAGE_STYLE, bear: BEAR_STYLE };
