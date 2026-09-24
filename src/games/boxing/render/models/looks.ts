/** The four boxers to choose from. Each has its own build, face, hair and kit. */
export type HairStyle = "buzz" | "bald" | "spikes" | "curls";
export type BeardStyle = "none" | "stubble" | "full" | "moustache";

export interface Look {
  id: string;
  name: string;
  nickname: string;
  /** Where they fight out of, for the introductions. */
  from: string;
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

export const LOOKS: readonly Look[] = [
  {
    id: "rocco",
    name: "Rocco Vance",
    nickname: "The Hammer",
    from: "Philadelphia",
    skin: "#e2b08c",
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
    id: "marcus",
    name: "Marcus Cole",
    nickname: "Night Train",
    from: "Detroit",
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
    id: "kenji",
    name: "Kenji Sato",
    nickname: "Lightning",
    from: "Osaka",
    skin: "#e8c09a",
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
    id: "diego",
    name: "Diego Reyes",
    nickname: "El Toro",
    from: "Guadalajara",
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

export function lookFor(index: number): Look {
  return LOOKS[((index % LOOKS.length) + LOOKS.length) % LOOKS.length]!;
}
