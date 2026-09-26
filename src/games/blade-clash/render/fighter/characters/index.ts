import type * as THREE from "three";
import type { CharacterId } from "@/games/blade-clash/characters";
import type { Dresser } from "../model/dresser";
import type { LookKit } from "../model/look-kit";
import { dressBlockHero } from "./block-hero";
import { dressKnight } from "./knight";
import { dressSamurai } from "./samurai";
import { dressStarKnight } from "./star-knight";

export type WeaponKind = "longsword" | "katana" | "pixel" | "energy";

/** How a blade's trail looks as it sweeps. */
export interface TrailStyle {
  /** The ribbon's colour; null takes the player's. */
  colour: number | null;
  /** How far down the blade from the tip the ribbon reaches, as a share of its length. */
  depth: number;
  /** How long a sweep stays visible, in game milliseconds. */
  lifeMs: number;
  /** How bright it is at its freshest. */
  strength: number;
  /** Steps the ribbon in blocky segments and hard fades, for the pixel sword. */
  pixel: boolean;
}

export interface CharacterModel {
  dress(d: Dresser, kit: LookKit, trim: THREE.Color): void;
  weapon: WeaponKind;
  /** Both fists on the grip when the free arm can reach it. */
  twoHanded: boolean;
  trail: TrailStyle;
  /** Blocky characters move a little stiffer. */
  blocky: boolean;
}

/** Each fighter's costume, weapon and the way their blade streaks. The skeleton and animation are shared. */
export const MODELS: Record<CharacterId, CharacterModel> = {
  knight: { dress: dressKnight, weapon: "longsword", twoHanded: true, blocky: false, trail: { colour: 0xcfe2ff, depth: 0.3, lifeMs: 220, strength: 0.8, pixel: false } },
  samurai: { dress: dressSamurai, weapon: "katana", twoHanded: true, blocky: false, trail: { colour: 0xffffff, depth: 0.2, lifeMs: 180, strength: 1, pixel: false } },
  block: { dress: dressBlockHero, weapon: "pixel", twoHanded: false, blocky: true, trail: { colour: 0xff4fc3, depth: 0.35, lifeMs: 280, strength: 0.9, pixel: true } },
  star: { dress: dressStarKnight, weapon: "energy", twoHanded: false, blocky: false, trail: { colour: null, depth: 0.6, lifeMs: 300, strength: 1.1, pixel: false } },
};
