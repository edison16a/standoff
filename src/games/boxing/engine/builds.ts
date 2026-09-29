import type { FootworkName } from "./styles";

/** What a build changes in a fight. 1 is the same as everyone else. */
export interface BuildEffects {
  /** Multiplies every punch's damage. */
  damage: number;
  /** Multiplies how long a punch takes to land and come back. Under 1 is quicker hands. */
  handSpeed: number;
  /** Multiplies how far a punch reaches for a moving head, so slips and ducks must go further. */
  reach: number;
  /** Multiplies how much the gloves cover, so a leaky guard still stops more. */
  guard: number;
  /** Multiplies how long the counter window stays open after a block or a dodge. */
  counterWindow: number;
  /** Multiplies how hard a counter hits. */
  counterPower: number;
  /** Multiplies the stamina each punch costs. */
  staminaCost: number;
  /** Multiplies the stamina won back each second. */
  staminaRegen: number;
  /** How the build moves its feet. */
  footwork: FootworkName;
}

/** The bars on the choice card, 1 to 5. Each one follows from the effects, which a test checks. */
export interface BuildStats {
  power: number;
  speed: number;
  reach: number;
  defense: number;
  stamina: number;
}

export type BuildId = "slugger" | "out-boxer" | "counter-puncher" | "swarmer";

export interface Build {
  id: BuildId;
  name: string;
  /** What it is good at and what it pays for it, in one short line. */
  blurb: string;
  stats: BuildStats;
  effects: BuildEffects;
}

export const NEUTRAL: BuildEffects = {
  damage: 1,
  handSpeed: 1,
  reach: 1,
  guard: 1,
  counterWindow: 1,
  counterPower: 1,
  staminaCost: 1,
  staminaRegen: 1,
  footwork: "boxer-puncher",
};

/**
 * The four ways to box. Picks are builds, not characters: the player's
 * own name is who they are, and the build is how they fight.
 */
export const BUILDS: readonly Build[] = [
  {
    id: "slugger",
    name: "Slugger",
    blurb: "Hits like a truck. Slow hands and a heavy tank.",
    stats: { power: 5, speed: 2, reach: 3, defense: 3, stamina: 2 },
    effects: { ...NEUTRAL, damage: 1.3, handSpeed: 1.18, staminaCost: 1.15, staminaRegen: 0.95, footwork: "pressure" },
  },
  {
    id: "out-boxer",
    name: "Out Boxer",
    blurb: "Fast, long punches from range. Lighter shots.",
    stats: { power: 2, speed: 5, reach: 5, defense: 3, stamina: 3 },
    effects: { ...NEUTRAL, damage: 0.85, handSpeed: 0.8, reach: 1.35, staminaCost: 0.95, footwork: "out-boxer" },
  },
  {
    id: "counter-puncher",
    name: "Counter Puncher",
    blurb: "A tight guard and long counter windows that bite.",
    stats: { power: 3, speed: 3, reach: 3, defense: 5, stamina: 3 },
    effects: { ...NEUTRAL, guard: 1.2, counterWindow: 1.55, counterPower: 1.25, footwork: "boxer-puncher" },
  },
  {
    id: "swarmer",
    name: "Swarmer",
    blurb: "Never stops coming. Endless stamina, short reach.",
    stats: { power: 3, speed: 4, reach: 2, defense: 2, stamina: 5 },
    effects: { ...NEUTRAL, damage: 0.95, handSpeed: 0.9, reach: 0.85, guard: 0.92, staminaCost: 0.72, staminaRegen: 1.45, footwork: "swarmer" },
  },
];

export function buildFor(index: number): Build {
  return BUILDS[((index % BUILDS.length) + BUILDS.length) % BUILDS.length]!;
}

export function buildById(id: BuildId | undefined): Build | undefined {
  return BUILDS.find((b) => b.id === id);
}
