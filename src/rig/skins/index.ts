import type { CharacterId } from "@/shared/characters";
import type { Skin } from "./skin";

/** Classic white kit. The lightest silhouette on the strip. */
const vale: Skin = {
  id: "vale",
  head: "mesh-mask",
  torso: "jacket",
  blade: "epee",
  bladeLength: 0.9,
  limb: { upper: 0.058, lower: 0.045 },
  tones: {
    body: "paper", sleeve: "paper", glove: "light", legs: "paper", socks: "paper", shoes: "dark",
    head: "ink", headDetail: "mid", blade: "light", guard: "mid",
  },
};

/** Dark doublet, cape and plumed hat. */
const duchess: Skin = {
  id: "duchess",
  head: "plumed-hat",
  torso: "doublet",
  blade: "rapier",
  bladeLength: 0.98,
  limb: { upper: 0.054, lower: 0.042 },
  tones: {
    body: "dark", sleeve: "light", glove: "ink", legs: "ink", socks: "light", shoes: "ink",
    head: "ink", headDetail: "trim", blade: "light", guard: "mid",
  },
};

/** Long black coat, bandana and a curved saber. */
const marrow: Skin = {
  id: "marrow",
  head: "bandana",
  torso: "long-coat",
  blade: "saber",
  bladeLength: 0.84,
  limb: { upper: 0.062, lower: 0.048 },
  tones: {
    body: "ink", sleeve: "ink", glove: "dark", legs: "mid", socks: "dark", shoes: "ink",
    head: "light", headDetail: "trim", blade: "light", guard: "dark",
  },
};

/** Grey plate and a visored helm. The heaviest silhouette. */
const iron: Skin = {
  id: "iron",
  head: "helm",
  torso: "plate",
  blade: "arming",
  bladeLength: 0.86,
  limb: { upper: 0.068, lower: 0.054 },
  tones: {
    body: "mid", sleeve: "light", glove: "mid", legs: "dark", socks: "mid", shoes: "dark",
    head: "light", headDetail: "ink", blade: "paper", guard: "dark",
  },
};

export const SKINS: Record<CharacterId, Skin> = { vale, duchess, marrow, iron };

export type { Skin } from "./skin";
