/**
 * Every star in the game, in one place so the roster is easy to edit:
 * their names, their stylised look, their stats and their goal
 * celebration. Looks are built from build, skin tone, hair, kit and
 * number, never from photos. Stats run 0 to 99 like the real game's cards.
 */

export const CHARACTER_IDS = ["messi", "ronaldo", "mbappe", "haaland", "vinicius", "bellingham", "kane", "salah", "debruyne", "yamal"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export type HairStyle = "swept" | "slick" | "buzz" | "bun" | "twists" | "curls" | "parted" | "afro" | "messy" | "curlytop";
export type Beard = "none" | "stubble" | "full";
export type Celebration = "skypoint" | "siu" | "armsfolded" | "zen" | "samba" | "armswide" | "kneeslide" | "airplane" | "fistpump" | "handsign";

export interface Kit {
  shirt: string;
  /** Vertical stripes over the shirt colour, like Argentina's. */
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
  messi: {
    id: "messi", name: "Lionel Messi", short: "MESSI", number: 10, role: "Magic left foot",
    look: { skin: "#e2b48e", hair: "#4a2f1d", hairStyle: "swept", beard: "full", height: 1.7, build: 0.42, boots: "#f5c518", kit: kit("#8fd0f2", "#1b2a4a", "#15171c", "#ffffff", "#15171c", "#ffffff") },
    stats: { speed: 81, shooting: 89, strength: 62, dribbling: 96 },
    foot: "left",
    celebration: "skypoint", celebrationName: "Points to the sky",
  },
  ronaldo: {
    id: "ronaldo", name: "Cristiano Ronaldo", short: "RONALDO", number: 7, role: "Deadly finisher",
    look: { skin: "#d9a57e", hair: "#1a1410", hairStyle: "slick", beard: "none", height: 1.87, build: 0.72, boots: "#ff3b5c", kit: kit("#b0162c", "#1c7a3c", "#1c7a3c", "#b0162c", "#f5d76e") },
    stats: { speed: 82, shooting: 93, strength: 82, dribbling: 82 },
    foot: "right",
    celebration: "siu", celebrationName: "The jump and spin",
  },
  mbappe: {
    id: "mbappe", name: "Kylian Mbappe", short: "MBAPPE", number: 10, role: "Blistering pace",
    look: { skin: "#6e4631", hair: "#130c09", hairStyle: "buzz", beard: "none", height: 1.78, build: 0.62, boots: "#ff8a1f", kit: kit("#1d2f6f", "#e8c66a", "#f4f5f8", "#d0213f", "#f4f5f8") },
    stats: { speed: 97, shooting: 90, strength: 77, dribbling: 92 },
    foot: "right",
    celebration: "armsfolded", celebrationName: "Arms folded",
  },
  haaland: {
    id: "haaland", name: "Erling Haaland", short: "HAALAND", number: 9, role: "Unstoppable striker",
    look: { skin: "#f1cfb6", hair: "#e3c47e", hairStyle: "bun", beard: "none", height: 1.95, build: 0.9, boots: "#e9eef5", kit: kit("#c8102e", "#ffffff", "#ffffff", "#0f1f4d", "#ffffff") },
    stats: { speed: 88, shooting: 94, strength: 93, dribbling: 79 },
    foot: "left",
    celebration: "zen", celebrationName: "Zen pose",
  },
  vinicius: {
    id: "vinicius", name: "Vinicius Junior", short: "VINI JR", number: 7, role: "Tricky winger",
    look: { skin: "#4d2e20", hair: "#120c0a", hairStyle: "twists", beard: "none", height: 1.76, build: 0.48, boots: "#22d3ee", kit: kit("#f7d330", "#0a8a3a", "#1f4fa8", "#ffffff", "#0a8a3a") },
    stats: { speed: 95, shooting: 84, strength: 68, dribbling: 92 },
    foot: "right",
    celebration: "samba", celebrationName: "Samba dance",
  },
  bellingham: {
    id: "bellingham", name: "Jude Bellingham", short: "BELLINGHAM", number: 5, role: "Box to box engine",
    look: { skin: "#8d5c3e", hair: "#1a120e", hairStyle: "curls", beard: "stubble", height: 1.86, build: 0.74, boots: "#f8fafc", kit: kit("#f4f5f8", "#0b1f4b", "#0b1f4b", "#f4f5f8", "#0b1f4b") },
    stats: { speed: 80, shooting: 86, strength: 85, dribbling: 88 },
    foot: "right",
    celebration: "armswide", celebrationName: "Arms wide",
  },
  kane: {
    id: "kane", name: "Harry Kane", short: "KANE", number: 9, role: "Complete forward",
    look: { skin: "#f0caa9", hair: "#86664a", hairStyle: "parted", beard: "stubble", height: 1.88, build: 0.74, boots: "#2563eb", kit: kit("#f4f5f8", "#0b1f4b", "#0b1f4b", "#f4f5f8", "#0b1f4b") },
    stats: { speed: 70, shooting: 94, strength: 84, dribbling: 83 },
    foot: "right",
    celebration: "kneeslide", celebrationName: "Knee slide",
  },
  salah: {
    id: "salah", name: "Mohamed Salah", short: "SALAH", number: 11, role: "Cutting inside",
    look: { skin: "#b37d58", hair: "#1c130e", hairStyle: "afro", beard: "full", height: 1.75, build: 0.55, boots: "#8b5cf6", kit: kit("#c8102e", "#111111", "#ffffff", "#111111", "#ffffff") },
    stats: { speed: 90, shooting: 88, strength: 75, dribbling: 88 },
    foot: "left",
    celebration: "airplane", celebrationName: "Airplane run",
  },
  debruyne: {
    id: "debruyne", name: "Kevin De Bruyne", short: "DE BRUYNE", number: 17, role: "Pinpoint playmaker",
    look: { skin: "#f4d6c2", hair: "#c57a3e", hairStyle: "messy", beard: "stubble", height: 1.81, build: 0.58, boots: "#0ea5e9", kit: kit("#c8102e", "#f2c230", "#15171c", "#c8102e", "#f2c230") },
    stats: { speed: 72, shooting: 88, strength: 75, dribbling: 86 },
    foot: "right",
    celebration: "fistpump", celebrationName: "Fist pump",
  },
  yamal: {
    id: "yamal", name: "Lamine Yamal", short: "YAMAL", number: 19, role: "Teenage wizard",
    look: { skin: "#9b6b49", hair: "#16100c", hairStyle: "curlytop", beard: "none", height: 1.8, build: 0.38, boots: "#facc15", kit: kit("#c60b1e", "#ffc400", "#10204a", "#10204a", "#ffc400") },
    stats: { speed: 88, shooting: 80, strength: 58, dribbling: 91 },
    foot: "left",
    celebration: "handsign", celebrationName: "Hand sign",
  },
};

export function isCharacterId(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value);
}

/** A stat from 0 to 99 as 0 to 1, for the engine's formulas. */
export function unit(stat: number): number {
  return Math.max(0, Math.min(1, stat / 99));
}
