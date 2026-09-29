import type { AttributeId, Attributes } from "./attributes";
import { kit, type Celebration, type Look } from "./looks";

/**
 * The six builds a player picks from. A pick is a way to play, not a
 * person: the player's own name is who they are on the pitch. Each build
 * has its ratings, a body to match and a goal celebration. Edit them
 * here and everything follows.
 */
export const BUILD_IDS = ["striker", "playmaker", "winger", "defender", "keeper", "allrounder"] as const;
export type BuildId = (typeof BUILD_IDS)[number];

export interface Build {
  id: BuildId;
  name: string;
  /** How it plays, in a short line or two for the picker. */
  style: string;
  /** The two ratings the build is made around. The All Rounder has none. */
  key: readonly AttributeId[];
  /** Its place in the side's shape when the other side has the ball: metres further up the pitch, or back when negative. */
  depth: number;
  /** Printed on the back of the shirt. */
  number: number;
  look: Look;
  ratings: Attributes;
  /** The stronger foot, which takes every shot and pass. */
  foot: "left" | "right";
  celebration: Celebration;
  celebrationName: string;
}

const SUI = { celebration: "sui", celebrationName: "The SUI jump" } as const;
const SLIDE = { celebration: "kneeslide", celebrationName: "Knee slide" } as const;

export const BUILDS: Record<BuildId, Build> = {
  striker: {
    id: "striker", name: "Striker", number: 9, key: ["finishing", "power"], depth: 2,
    style: "Lives in the box. The best finisher, with the hardest shot.",
    look: { skin: "#d9a57e", hair: "#1a1410", hairStyle: "slick", beard: "none", height: 1.86, build: 0.72, boots: "#ff3b5c", kit: kit("#d62839", "#ffffff", "#15171c", "#d62839", "#ffffff") },
    ratings: { finishing: 95, power: 94, passing: 70, vision: 72, pace: 84, dribbling: 80, tackling: 50, strength: 82, reach: 62, reflexes: 74 },
    foot: "right",
    ...SUI,
  },
  playmaker: {
    id: "playmaker", name: "Playmaker", number: 10, key: ["passing", "vision"], depth: 0.5,
    style: "Runs the game. Passes land on a boot, and it sees runs nobody else does.",
    look: { skin: "#e2b48e", hair: "#4a2f1d", hairStyle: "swept", beard: "full", height: 1.72, build: 0.42, boots: "#f5c518", kit: kit("#f2b705", "#1b2a4a", "#1b2a4a", "#f2b705", "#1b2a4a") },
    ratings: { finishing: 78, power: 72, passing: 96, vision: 95, pace: 78, dribbling: 90, tackling: 62, strength: 60, reach: 60, reflexes: 76 },
    foot: "left",
    ...SLIDE,
  },
  winger: {
    id: "winger", name: "Winger", number: 7, key: ["pace", "dribbling"], depth: 1,
    style: "The quickest on the pitch. Beats a man with the ball glued to the boot.",
    look: { skin: "#4d2e20", hair: "#120c0a", hairStyle: "twists", beard: "none", height: 1.76, build: 0.48, boots: "#22d3ee", kit: kit("#16b8d8", "#0b1f3a", "#0b1f3a", "#16b8d8", "#0b1f3a") },
    ratings: { finishing: 82, power: 74, passing: 78, vision: 74, pace: 97, dribbling: 95, tackling: 52, strength: 60, reach: 62, reflexes: 84 },
    foot: "right",
    ...SLIDE,
  },
  defender: {
    id: "defender", name: "Defender", number: 4, key: ["tackling", "strength"], depth: -2.5,
    style: "Wins the ball back. Clean tackles, and a frame nobody gets past.",
    look: { skin: "#6e4631", hair: "#130c09", hairStyle: "buzz", beard: "stubble", height: 1.9, build: 0.92, boots: "#e9eef5", kit: kit("#1b2a4a", "#c9d3e0", "#1b2a4a", "#1b2a4a", "#c9d3e0") },
    ratings: { finishing: 58, power: 80, passing: 72, vision: 70, pace: 80, dribbling: 64, tackling: 96, strength: 95, reach: 82, reflexes: 76 },
    foot: "right",
    ...SUI,
  },
  keeper: {
    id: "keeper", name: "Sweeper Keeper", number: 1, key: ["reach", "reflexes"], depth: -4,
    style: "A keeper's gloves out on the pitch. Blocks shots and cuts out passes nobody else can reach.",
    look: { skin: "#f1cfb6", hair: "#e3c47e", hairStyle: "bun", beard: "none", height: 1.95, build: 0.8, boots: "#1f2937", gloves: true, kit: kit("#1fbf6a", "#0b3d24", "#0b3d24", "#1fbf6a", "#0b3d24") },
    ratings: { finishing: 55, power: 78, passing: 76, vision: 80, pace: 72, dribbling: 58, tackling: 76, strength: 84, reach: 97, reflexes: 95 },
    foot: "left",
    ...SUI,
  },
  allrounder: {
    id: "allrounder", name: "All Rounder", number: 8, key: [], depth: 0,
    style: "Good at everything and best at nothing. Fits any place in the side.",
    look: { skin: "#9b6b49", hair: "#16100c", hairStyle: "curlytop", beard: "none", height: 1.8, build: 0.6, boots: "#facc15", kit: kit("#6d3fd1", "#ffffff", "#ffffff", "#6d3fd1", "#ffffff") },
    ratings: { finishing: 80, power: 78, passing: 80, vision: 78, pace: 82, dribbling: 80, tackling: 74, strength: 76, reach: 72, reflexes: 76 },
    foot: "left",
    ...SLIDE,
  },
};

export function isBuildId(value: string): value is BuildId {
  return (BUILD_IDS as readonly string[]).includes(value);
}

/** What a computer player is called wherever a phone's player shows their own name. */
export function computerName(build: BuildId): string {
  return `CPU ${BUILDS[build].name}`;
}
