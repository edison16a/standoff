/**
 * The six stars in the game, in one place so the roster is easy to
 * edit: their names, their stylised look, their stats and their goal
 * celebration. Looks are built from build, skin tone, hair, kit and
 * number, never from photos. Stats run 0 to 99.
 */

export const CHARACTER_IDS = ["echeverri", "brandao", "okemba", "holmvik", "lacerda", "serrano"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export type HairStyle = "swept" | "slick" | "buzz" | "bun" | "twists" | "curls" | "parted" | "afro" | "messy" | "curlytop";
export type Beard = "none" | "stubble" | "full";
/** A goal celebration: the SUI (run, leap, half turn, land) or a knee slide across the grass. */
export type Celebration = "sui" | "kneeslide";

const SUI = { celebration: "sui", celebrationName: "The SUI jump" } as const;
const SLIDE = { celebration: "kneeslide", celebrationName: "Knee slide" } as const;

export interface Kit {
  shirt: string;
  /** Vertical stripes over the shirt colour, like a striped shirt. */
  stripes?: string;
  trim: string;
  shorts: string;
  socks: string;
  /** The colour the name and number are printed in. */
  ink: string;
}

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard: Beard;
  /** Standing height in metres, which scales the whole body. */
  height: number;
  /** 0 slight to 1 powerful: shoulders, chest and thighs. */
  build: number;
  boots: string;
  /** The kit they are shown in on the phone's picker. Matches are played in team kits. */
  kit: Kit;
}

export interface Stats {
  speed: number;
  shooting: number;
  /** Winning tackles and holding players off. */
  strength: number;
  /** Close control: keeping the ball in a challenge and turning with it. */
  dribbling: number;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** Printed on the back of the shirt and on the name tags of computer players. */
  short: string;
  number: number;
  /** A few words for the picker. */
  role: string;
  look: Look;
  stats: Stats;
  /** The stronger foot, which takes every shot and pass. */
  foot: "left" | "right";
  celebration: Celebration;
  celebrationName: string;
}

const kit = (shirt: string, trim: string, shorts: string, socks: string, ink: string, stripes?: string): Kit => ({ shirt, trim, shorts, socks, ink, stripes });

export const ROSTER: Record<CharacterId, Character> = {
  echeverri: {
    id: "echeverri", name: "Tomas Echeverri", short: "ECHEVERRI", number: 10, role: "Magic left foot",
    look: { skin: "#e2b48e", hair: "#4a2f1d", hairStyle: "swept", beard: "full", height: 1.7, build: 0.42, boots: "#f5c518", kit: kit("#8fd0f2", "#1b2a4a", "#15171c", "#ffffff", "#15171c", "#ffffff") },
    stats: { speed: 81, shooting: 89, strength: 62, dribbling: 96 },
    foot: "left",
    ...SLIDE,
  },
  brandao: {
    id: "brandao", name: "Nuno Brandao", short: "BRANDAO", number: 7, role: "Deadly finisher",
    look: { skin: "#d9a57e", hair: "#1a1410", hairStyle: "slick", beard: "none", height: 1.87, build: 0.72, boots: "#ff3b5c", kit: kit("#b0162c", "#1c7a3c", "#1c7a3c", "#b0162c", "#f5d76e") },
    stats: { speed: 82, shooting: 93, strength: 82, dribbling: 82 },
    foot: "right",
    ...SUI,
  },
  okemba: {
    id: "okemba", name: "Yanis Okemba", short: "OKEMBA", number: 10, role: "Blistering pace",
    look: { skin: "#6e4631", hair: "#130c09", hairStyle: "buzz", beard: "none", height: 1.78, build: 0.62, boots: "#ff8a1f", kit: kit("#1d2f6f", "#e8c66a", "#f4f5f8", "#d0213f", "#f4f5f8") },
    stats: { speed: 97, shooting: 90, strength: 77, dribbling: 92 },
    foot: "right",
    ...SUI,
  },
  holmvik: {
    id: "holmvik", name: "Sindre Holmvik", short: "HOLMVIK", number: 9, role: "Unstoppable striker",
    look: { skin: "#f1cfb6", hair: "#e3c47e", hairStyle: "bun", beard: "none", height: 1.95, build: 0.9, boots: "#e9eef5", kit: kit("#c8102e", "#ffffff", "#ffffff", "#0f1f4d", "#ffffff") },
    stats: { speed: 88, shooting: 94, strength: 93, dribbling: 79 },
    foot: "left",
    ...SLIDE,
  },
  lacerda: {
    id: "lacerda", name: "Davi Lacerda", short: "LACERDA", number: 7, role: "Tricky winger",
    look: { skin: "#4d2e20", hair: "#120c0a", hairStyle: "twists", beard: "none", height: 1.76, build: 0.48, boots: "#22d3ee", kit: kit("#f7d330", "#0a8a3a", "#1f4fa8", "#ffffff", "#0a8a3a") },
    stats: { speed: 95, shooting: 84, strength: 68, dribbling: 92 },
    foot: "right",
    ...SLIDE,
  },
  serrano: {
    id: "serrano", name: "Adil Serrano", short: "SERRANO", number: 19, role: "Teenage wizard",
    look: { skin: "#9b6b49", hair: "#16100c", hairStyle: "curlytop", beard: "none", height: 1.8, build: 0.38, boots: "#facc15", kit: kit("#c60b1e", "#ffc400", "#10204a", "#10204a", "#ffc400") },
    stats: { speed: 88, shooting: 80, strength: 58, dribbling: 91 },
    foot: "left",
    ...SUI,
  },
};

export function isCharacterId(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value);
}

/** A stat from 0 to 99 as 0 to 1, for the engine's formulas. */
export function unit(stat: number): number {
  return Math.max(0, Math.min(1, stat / 99));
}
