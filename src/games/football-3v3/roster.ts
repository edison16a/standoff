/**
 * The six players to choose from. Each is a made up athlete with a clear
 * style, and the stats (1 to 10) change how they play: speed and agility
 * for runners, arm for throwing, leg for kicking, power for hitting and
 * breaking through the line. `look` is for the renderer, which may add
 * more detail of its own.
 */

export const CHARACTER_IDS = ["reed", "banks", "kowalski", "ortiz", "lindqvist", "fields"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface Stats {
  speed: number;
  agility: number;
  power: number;
  hands: number;
  arm: number;
  leg: number;
}

export interface Build {
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

export interface Character {
  id: CharacterId;
  name: string;
  /** What the scoreboard calls them. */
  short: string;
  number: number;
  position: string;
  blurb: string;
  stats: Stats;
  build: Build;
  look: Look;
  celebration: Celebration;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  reed: {
    id: "reed", name: "Marcus Reed", short: "Reed", number: 12, position: "Quarterback",
    blurb: "A cannon arm and the calm to use it.",
    stats: { speed: 7, agility: 7, power: 6, hands: 6, arm: 10, leg: 6 },
    build: { height: 1.93, weight: 100 },
    look: { skin: "#8a5a3c", mask: "open", visor: null, accent: "#ffffff", cleats: "#111111" },
    celebration: "spike",
  },
  banks: {
    id: "banks", name: "Tyrell Banks", short: "Banks", number: 84, position: "Receiver",
    blurb: "Pure speed. Nobody catches him from behind.",
    stats: { speed: 10, agility: 8, power: 4, hands: 9, arm: 4, leg: 3 },
    build: { height: 1.85, weight: 86 },
    look: { skin: "#5b3a26", mask: "visor", visor: "#f59e0b", accent: "#111111", cleats: "#f5f5f4" },
    celebration: "dance",
  },
  kowalski: {
    id: "kowalski", name: "Bo Kowalski", short: "Kowalski", number: 44, position: "Fullback",
    blurb: "Runs through tackles and hits like a truck.",
    stats: { speed: 6, agility: 4, power: 10, hands: 6, arm: 5, leg: 5 },
    build: { height: 1.88, weight: 116 },
    look: { skin: "#e8c3a2", mask: "cage", visor: null, accent: "#111111", cleats: "#111111" },
    celebration: "flex",
  },
  ortiz: {
    id: "ortiz", name: "Jalen Ortiz", short: "Ortiz", number: 21, position: "Running back",
    blurb: "Jukes so sharp the defence falls over.",
    stats: { speed: 9, agility: 10, power: 5, hands: 7, arm: 5, leg: 4 },
    build: { height: 1.78, weight: 92 },
    look: { skin: "#c68e67", mask: "visor", visor: "#38bdf8", accent: "#ffffff", cleats: "#ef4444" },
    celebration: "leap",
  },
  lindqvist: {
    id: "lindqvist", name: "Dane Lindqvist", short: "Lindqvist", number: 3, position: "Kicker",
    blurb: "A huge leg. Sixty yards is in range.",
    stats: { speed: 5, agility: 5, power: 6, hands: 5, arm: 8, leg: 10 },
    build: { height: 1.9, weight: 95 },
    look: { skin: "#f1d2b6", mask: "open", visor: null, accent: "#f5c518", cleats: "#f5f5f4" },
    celebration: "salute",
  },
  fields: {
    id: "fields", name: "Andre Fields", short: "Fields", number: 55, position: "Linebacker",
    blurb: "Sees the play first and finishes every tackle.",
    stats: { speed: 7, agility: 6, power: 9, hands: 7, arm: 4, leg: 4 },
    build: { height: 1.91, weight: 110 },
    look: { skin: "#4b2e1e", mask: "cage", visor: null, accent: "#111111", cleats: "#111111" },
    celebration: "point",
  },
};

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && (CHARACTER_IDS as readonly string[]).includes(value);
}

/** Five pips for the lobby and phone cards, from a 1 to 10 stat. */
export function statPips(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value / 2)));
}

/** The linemen are nobody famous: one big build, numbered per team and slot. */
export const LINEMAN_BUILD: Build = { height: 1.96, weight: 140 };
export const LINEMAN_NUMBERS: readonly [readonly number[], readonly number[]] = [
  [62, 70, 75],
  [91, 97, 99],
];
