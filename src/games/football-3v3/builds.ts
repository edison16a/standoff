/**
 * The six builds a player picks from. A build is a way to play, not a
 * person: the player's own name is who they are on the field. Each has
 * ratings from 1 to 10 that the engine really uses (see
 * engine/build-effects.ts), a body to match and a touchdown celebration.
 * Edit them here and everything follows.
 */

export const BUILD_IDS = ["gunslinger", "scrambler", "speedster", "powerback", "routerunner", "lockdown"] as const;
export type BuildId = (typeof BUILD_IDS)[number];

export interface Stats {
  /** Top speed. */
  speed: number;
  /** Sharper cuts and quicker jukes. */
  agility: number;
  /** Getting going, tackle reach, and breaking tackles with the ball. */
  power: number;
  /** How far from the body a catch is made, for receivers and for picks. */
  hands: number;
  /** Throw speed and spiral, and how far the kicks go. */
  arm: number;
  /** Reading the throw: jumping routes, picking off and knocking down passes. */
  cover: number;
}

export const STAT_IDS = ["speed", "agility", "power", "hands", "arm", "cover"] as const satisfies readonly (keyof Stats)[];

export const STAT_NAMES: Record<keyof Stats, string> = {
  speed: "Speed", agility: "Agility", power: "Power", hands: "Hands", arm: "Arm", cover: "Cover",
};

export interface Frame {
  /** Height in metres. */
  height: number;
  /** Weight in kilograms, which is the mass the physics pushes around. */
  weight: number;
}

export interface Look {
  skin: string;
  /** The face mask style on the helmet. */
  mask: "open" | "cage" | "visor";
  /** Tinted visor colour, when the mask has one. */
  visor: string | null;
  /** Sleeves, tape and gloves, in one accent colour. */
  accent: string;
  cleats: string;
}

export type Celebration = "spike" | "dance" | "flex" | "salute" | "leap" | "point";

/** Where a build is at its best. The host still puts anyone anywhere. */
export type BestAt = "qb" | "runner" | "defence";

export interface Build {
  id: BuildId;
  /** The full name, like "Gunslinger QB". */
  name: string;
  /** One word, for tight places. */
  short: string;
  /** Printed on the jersey. */
  number: number;
  best: BestAt;
  /** How it plays, in a short line. */
  style: string;
  stats: Stats;
  frame: Frame;
  look: Look;
  celebration: Celebration;
}

export const BUILDS: Record<BuildId, Build> = {
  gunslinger: {
    id: "gunslinger", name: "Gunslinger QB", short: "Gunslinger", number: 12, best: "qb",
    style: "Stands tall in the pocket and fires. The fastest, tightest throws and the longest kicks.",
    stats: { speed: 5, agility: 5, power: 6, hands: 6, arm: 10, cover: 3 },
    frame: { height: 1.95, weight: 104 },
    look: { skin: "#8a5a3c", mask: "open", visor: null, accent: "#ffffff", cleats: "#111111" },
    celebration: "salute",
  },
  scrambler: {
    id: "scrambler", name: "Scrambler QB", short: "Scrambler", number: 7, best: "qb",
    style: "Escapes the rush and makes plays on the run. Quick feet, a good arm.",
    stats: { speed: 8, agility: 9, power: 4, hands: 6, arm: 7, cover: 4 },
    frame: { height: 1.83, weight: 92 },
    look: { skin: "#c68e67", mask: "visor", visor: "#38bdf8", accent: "#ffffff", cleats: "#ef4444" },
    celebration: "leap",
  },
  speedster: {
    id: "speedster", name: "Speedster", short: "Speedster", number: 84, best: "runner",
    style: "Pure speed. Takes the top off the defence and nobody catches him from behind.",
    stats: { speed: 10, agility: 7, power: 3, hands: 7, arm: 3, cover: 6 },
    frame: { height: 1.8, weight: 84 },
    look: { skin: "#5b3a26", mask: "visor", visor: "#f59e0b", accent: "#111111", cleats: "#f5f5f4" },
    celebration: "dance",
  },
  powerback: {
    id: "powerback", name: "Power Back", short: "Power Back", number: 44, best: "runner",
    style: "Runs through arm tackles and hits like a truck. Hard to bring down.",
    stats: { speed: 6, agility: 4, power: 10, hands: 5, arm: 4, cover: 5 },
    frame: { height: 1.88, weight: 116 },
    look: { skin: "#e8c3a2", mask: "cage", visor: null, accent: "#111111", cleats: "#111111" },
    celebration: "flex",
  },
  routerunner: {
    id: "routerunner", name: "Route Runner", short: "Route Runner", number: 88, best: "runner",
    style: "Sharp cuts and sure hands. Open on every route and catches anything near him.",
    stats: { speed: 8, agility: 9, power: 4, hands: 10, arm: 4, cover: 5 },
    frame: { height: 1.86, weight: 90 },
    look: { skin: "#4b2e1e", mask: "open", visor: null, accent: "#f5c518", cleats: "#f5f5f4" },
    celebration: "spike",
  },
  lockdown: {
    id: "lockdown", name: "Lockdown", short: "Lockdown", number: 24, best: "defence",
    style: "A shutdown defender. Reads the throw, jumps the route and finishes every tackle.",
    stats: { speed: 8, agility: 7, power: 8, hands: 7, arm: 3, cover: 10 },
    frame: { height: 1.88, weight: 98 },
    look: { skin: "#f1d2b6", mask: "cage", visor: null, accent: "#111111", cleats: "#111111" },
    celebration: "point",
  },
};

export const BEST_AT: Record<BestAt, string> = { qb: "Quarterback", runner: "Runner", defence: "Defender" };

export function isBuildId(value: unknown): value is BuildId {
  return typeof value === "string" && (BUILD_IDS as readonly string[]).includes(value);
}

/** What a computer player is called wherever a phone's player shows their own name. */
export function computerName(build: BuildId): string {
  return `CPU ${BUILDS[build].short}`;
}

/** The linemen are nobody famous: one big frame, numbered per team and slot. */
export const LINEMAN_FRAME: Frame = { height: 1.96, weight: 140 };
export const LINEMAN_NUMBERS: readonly [readonly number[], readonly number[]] = [
  [62, 70, 75],
  [91, 97, 99],
];
