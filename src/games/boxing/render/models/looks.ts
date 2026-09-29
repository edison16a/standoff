import { BUILDS, type BuildId } from "../../engine/builds";

/** How a boxer looks. Who they are is the player's own name; how they are built follows the build they pick. */
export type HairStyle = "buzz" | "bald" | "spikes" | "curls";
export type BeardStyle = "none" | "stubble" | "full" | "moustache";

export interface Look {
  /** Changes whenever anything drawn changes, so the picture knows to rebuild the model. */
  id: string;
  /** The body and face this look is built on, which seeds the face's painted details. */
  body: string;
  /** The player's name, on the waistband and everywhere else. */
  name: string;
  /** The build's name, on the front of the waistband. */
  nickname: string;
  skin: string;
  /** A deeper tone for lips, creases and shading painted on the face. */
  skinShade: string;
  hair: string;
  hairStyle: HairStyle;
  beard: BeardStyle;
  eyes: string;
  trunks: string;
  trim: string;
  gloves: string;
  gloveTrim: string;
  shoes: string;
  socks: string;
  /** Build: 1 is average. Wider shoulders and bigger arms read from across a room. */
  bulk: number;
  height: number;
}

type Body = Omit<Look, "id" | "name" | "nickname" | "trunks" | "trim" | "gloves" | "gloveTrim" | "shoes" | "socks">;
type Kit = Pick<Look, "trunks" | "trim" | "gloves" | "gloveTrim" | "shoes" | "socks">;

/** Each build's body: the slugger heavy and broad, the out boxer long and lean. */
const BODIES: Record<BuildId, Body> = {
  slugger: { body: "slugger", skin: "#6b4029", skinShade: "#44261a", hair: "#17100c", hairStyle: "bald", beard: "full", eyes: "#2b1a10", bulk: 1.16, height: 1.02 },
  "out-boxer": { body: "out-boxer", skin: "#e2ad84", skinShade: "#b98a66", hair: "#0e0e12", hairStyle: "spikes", beard: "none", eyes: "#2a1c14", bulk: 0.95, height: 1.04 },
  "counter-puncher": { body: "counter-puncher", skin: "#dca07a", skinShade: "#b77a5c", hair: "#3a2618", hairStyle: "buzz", beard: "stubble", eyes: "#4a6a8a", bulk: 1.05, height: 1.0 },
  swarmer: { body: "swarmer", skin: "#b57a52", skinShade: "#85523a", hair: "#1c120c", hairStyle: "curls", beard: "moustache", eyes: "#3a2414", bulk: 1.03, height: 0.96 },
};

/** Each build's own kit, and a second kit for when both boxers pick the same build. */
const KITS: Record<BuildId, readonly [Kit, Kit]> = {
  slugger: [
    { trunks: "#15151a", trim: "#e8c25a", gloves: "#e3b23c", gloveTrim: "#15151a", shoes: "#1b1b1f", socks: "#1b1b1f" },
    { trunks: "#6d1a1a", trim: "#f2f2f2", gloves: "#b01c1c", gloveTrim: "#f2f2f2", shoes: "#f2f2f2", socks: "#f2f2f2" },
  ],
  "out-boxer": [
    { trunks: "#1d5fd6", trim: "#ffffff", gloves: "#1f63e0", gloveTrim: "#ffffff", shoes: "#1d5fd6", socks: "#ffffff" },
    { trunks: "#f2f2f2", trim: "#1d5fd6", gloves: "#f2f2f2", gloveTrim: "#1d5fd6", shoes: "#f2f2f2", socks: "#1d5fd6" },
  ],
  "counter-puncher": [
    { trunks: "#c8102e", trim: "#f5c542", gloves: "#d0142c", gloveTrim: "#ffffff", shoes: "#f4f4f4", socks: "#ffffff" },
    { trunks: "#5b2a86", trim: "#f5c542", gloves: "#6a2fa0", gloveTrim: "#f5c542", shoes: "#1b1b1f", socks: "#1b1b1f" },
  ],
  swarmer: [
    { trunks: "#0e8a4b", trim: "#f2f2f2", gloves: "#f2f2f2", gloveTrim: "#0e8a4b", shoes: "#f2f2f2", socks: "#0e8a4b" },
    { trunks: "#f28c28", trim: "#15151a", gloves: "#f28c28", gloveTrim: "#15151a", shoes: "#15151a", socks: "#f28c28" },
  ],
};

/**
 * The boxer for a player: the build's body and kit with the player's
 * name on it. `alt` puts on the second kit, so two boxers of the same
 * build can still be told apart.
 */
export function boxerLook(build: BuildId, name: string, alt = false): Look {
  return { ...BODIES[build], ...KITS[build][alt ? 1 : 0], id: `${build}:${alt ? 2 : 1}:${name}`, name, nickname: BUILDS[build].name };
}
