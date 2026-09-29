import { buildFor, type BuildId } from "../../engine/builds";

/**
 * How the boxers look. Each build has its own body, face, hair and kit
 * colours, but no name of its own: the player's name goes on the
 * waistband and over the health bar.
 */
export type HairStyle = "buzz" | "bald" | "spikes" | "curls";
export type BeardStyle = "none" | "stubble" | "full" | "moustache";

export interface Body {
  id: string;
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

/** A body dressed for a fight: the player's name, and the build's name as the smaller word. */
export interface Look extends Body {
  name: string;
  nickname: string;
}

const BODY_LIST: readonly Body[] = [
  {
    id: "slugger",
    skin: "#dca07a",
    skinShade: "#b77a5c",
    hair: "#3a2618",
    hairStyle: "buzz",
    beard: "stubble",
    eyes: "#4a6a8a",
    trunks: "#c8102e",
    trim: "#f5c542",
    gloves: "#d0142c",
    gloveTrim: "#ffffff",
    shoes: "#f4f4f4",
    socks: "#ffffff",
    bulk: 1.08,
    height: 1.0,
  },
  {
    id: "counter-puncher",
    skin: "#6b4029",
    skinShade: "#44261a",
    hair: "#17100c",
    hairStyle: "bald",
    beard: "full",
    eyes: "#2b1a10",
    trunks: "#15151a",
    trim: "#e8c25a",
    gloves: "#e3b23c",
    gloveTrim: "#15151a",
    shoes: "#1b1b1f",
    socks: "#1b1b1f",
    bulk: 1.14,
    height: 1.03,
  },
  {
    id: "out-boxer",
    skin: "#e2ad84",
    skinShade: "#b98a66",
    hair: "#0e0e12",
    hairStyle: "spikes",
    beard: "none",
    eyes: "#2a1c14",
    trunks: "#1d5fd6",
    trim: "#ffffff",
    gloves: "#1f63e0",
    gloveTrim: "#ffffff",
    shoes: "#1d5fd6",
    socks: "#ffffff",
    bulk: 0.96,
    height: 0.98,
  },
  {
    id: "swarmer",
    skin: "#b57a52",
    skinShade: "#85523a",
    hair: "#1c120c",
    hairStyle: "curls",
    beard: "moustache",
    eyes: "#3a2414",
    trunks: "#0e8a4b",
    trim: "#f2f2f2",
    gloves: "#f2f2f2",
    gloveTrim: "#0e8a4b",
    shoes: "#f2f2f2",
    socks: "#0e8a4b",
    bulk: 1.03,
    height: 1.0,
  },
];

/** Each build's body, by build id. */
export const BODIES: Readonly<Record<BuildId, Body>> = Object.fromEntries(BODY_LIST.map((b) => [b.id, b])) as Record<BuildId, Body>;

/** The body for a build, by its place in the list of builds, dressed with a name. */
export function lookFor(index: number, name: string): Look {
  const build = buildFor(index);
  return { ...BODIES[build.id], name, nickname: build.name };
}
