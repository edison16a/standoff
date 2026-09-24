import type { CharacterId } from "@/games/fencing/characters";
import type { BladeColours, BladeKind } from "../blades";
import type { Dresser } from "../dresser";
import { dressDuchess } from "./duchess";
import { dressIron } from "./iron";
import type { Look } from "./look";
import { dressMarrow } from "./marrow";
import { dressVale } from "./vale";

export interface CharacterModel {
  dress(d: Dresser, look: Look): void;
  blade: BladeKind;
  /** From the middle of the grip to the tip, metres. The referee's reach never changes with it. */
  bladeLength: number;
  bladeColours: BladeColours;
}

/** Each fencer's costume and weapon. The skeleton and animation are shared. */
export const MODELS: Record<CharacterId, CharacterModel> = {
  vale: { dress: dressVale, blade: "epee", bladeLength: 0.98, bladeColours: { steel: 0xe6eaef, guard: 0xb8c0c9, grip: 0x1d2433 } },
  duchess: { dress: dressDuchess, blade: "rapier", bladeLength: 1.06, bladeColours: { steel: 0xeef1f4, guard: 0xf2c24a, grip: 0x3c096c } },
  marrow: { dress: dressMarrow, blade: "saber", bladeLength: 0.9, bladeColours: { steel: 0xe2e6ea, guard: 0xc9a227, grip: 0x3b2414 } },
  iron: { dress: dressIron, blade: "arming", bladeLength: 0.94, bladeColours: { steel: 0xf2f4f6, guard: 0xc9a227, grip: 0x4a2c18 } },
};
