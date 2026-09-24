import type { CharacterId } from "@/games/fencing/characters";
import type { Skin } from "./skin";

/** Metal and white kit, shared so every blade reads as the same steel. */
const STEEL = { white: "#fbfaf5", light: "#dfe4ea", mid: "#98a2ad" };

/** Modern kit in bright white with a navy mask, yellow gloves and pink shoes. */
const vale: Skin = {
  id: "vale",
  head: "mesh-mask",
  torso: "jacket",
  blade: "epee",
  bladeLength: 0.9,
  build: { arm: 0.068, leg: 0.1, chest: 1.14 },
  tones: {
    body: STEEL.white, sleeve: STEEL.white, glove: "#ffd23f", legs: STEEL.white, socks: "#3a86ff", shoes: "#ff4d8d",
    head: "#14213d", headDetail: "#5fa8ff", blade: STEEL.light, guard: STEEL.mid,
  },
};

/** Royal purple doublet with gold sleeves and a pink plume. */
const duchess: Skin = {
  id: "duchess",
  head: "plumed-hat",
  torso: "doublet",
  blade: "rapier",
  bladeLength: 0.98,
  build: { arm: 0.064, leg: 0.094, chest: 1.06 },
  tones: {
    body: "#7b2cbf", sleeve: "#f4c542", glove: "#3c096c", legs: "#3c096c", socks: "#f4c542", shoes: "#240046",
    head: "#240046", headDetail: "#ff5d8f", blade: STEEL.light, guard: "#f4c542",
  },
};

/** Navy sea coat, red bandana, tan trousers and a curved saber. */
const marrow: Skin = {
  id: "marrow",
  head: "bandana",
  torso: "long-coat",
  blade: "saber",
  bladeLength: 0.84,
  build: { arm: 0.07, leg: 0.098, chest: 1.18 },
  tones: {
    body: "#1d3557", sleeve: "#1d3557", glove: "#6b4226", legs: "#d4a373", socks: "#6b4226", shoes: "#2b1b12",
    head: "#c98b5e", headDetail: "#e63946", blade: STEEL.light, guard: "#c9a227",
  },
};

/** Steel plate over an emerald tabard, with a visored helm. The heaviest silhouette. */
const iron: Skin = {
  id: "iron",
  head: "helm",
  torso: "plate",
  blade: "arming",
  bladeLength: 0.86,
  build: { arm: 0.078, leg: 0.108, chest: 1.3 },
  tones: {
    body: "#1f8a5b", sleeve: STEEL.light, glove: STEEL.mid, legs: "#44505f", socks: STEEL.mid, shoes: "#2d3440",
    head: STEEL.light, headDetail: "#161b24", blade: STEEL.white, guard: "#c9a227",
  },
};

export const SKINS: Record<CharacterId, Skin> = { vale, duchess, marrow, iron };

export type { Skin } from "./skin";
