/**
 * The builds a player picks from: fighting styles, not characters. The
 * player's own name is who they are; the build is how they fight. Each
 * changes real numbers in the fight, and its bars on the pick screen
 * show the same numbers.
 */
export const BUILD_IDS = ["slugger", "out-boxer", "counter-puncher", "swarmer"] as const;
export type BuildId = (typeof BUILD_IDS)[number];

/** What a build changes, as factors on the rules. 1 changes nothing. */
export interface BuildMods {
  /** Damage of every punch that lands. */
  damage: number;
  /** How long a punch takes to land and come home. Lower is faster. */
  punchTime: number;
  /** Metres more a punch reaches before it falls short. */
  reach: number;
  /** How wide a straight punch finds the head: longer arms are harder to slip. */
  aim: number;
  /** Cover of the gloves: more turns partial cover into a full block. */
  guard: number;
  /** How long a counter chance stays open after a block or a dodge. */
  counterWindow: number;
  /** Damage of a counter, on top of the usual counter bonus. */
  counterDamage: number;
  /** Stamina each punch costs. */
  staminaCost: number;
  /** Stamina back each second while resting the gloves. */
  staminaRegen: number;
}

/** 1 to 5 on the pick screen. */
export interface BuildBars {
  power: number;
  speed: number;
  reach: number;
  defence: number;
  stamina: number;
}

export interface Build {
  id: BuildId;
  name: string;
  /** One short line on how it fights. */
  blurb: string;
  /** Its strengths, in two or three words each. */
  traits: readonly string[];
  bars: BuildBars;
  mods: BuildMods;
}

const EVEN: BuildMods = { damage: 1, punchTime: 1, reach: 0, aim: 1, guard: 1, counterWindow: 1, counterDamage: 1, staminaCost: 1, staminaRegen: 1 };

export const BUILDS: Record<BuildId, Build> = {
  slugger: {
    id: "slugger",
    name: "Slugger",
    blurb: "Heavy hands. Every punch hurts, but they take longer to land.",
    traits: ["Hardest punches", "Stuns sooner", "Slow hands"],
    bars: { power: 5, speed: 2, reach: 3, defence: 3, stamina: 3 },
    mods: { ...EVEN, damage: 1.3, punchTime: 1.18, staminaCost: 1.1 },
  },
  "out-boxer": {
    id: "out-boxer",
    name: "Out Boxer",
    blurb: "Fast and long. Pick them off from range and keep moving.",
    traits: ["Fastest hands", "Longest reach", "Lighter punches"],
    bars: { power: 2, speed: 5, reach: 5, defence: 3, stamina: 3 },
    mods: { ...EVEN, damage: 0.85, punchTime: 0.8, reach: 0.25, aim: 1.2 },
  },
  "counter-puncher": {
    id: "counter-puncher",
    name: "Counter Puncher",
    blurb: "Patient and tight. Block or slip, then make them pay.",
    traits: ["Best guard", "Long counter chance", "Big counters"],
    bars: { power: 3, speed: 3, reach: 3, defence: 5, stamina: 3 },
    mods: { ...EVEN, guard: 1.15, counterWindow: 1.6, counterDamage: 1.25 },
  },
  swarmer: {
    id: "swarmer",
    name: "Swarmer",
    blurb: "Relentless pressure. Throw all night and never tire.",
    traits: ["Most stamina", "Quick hands", "Short reach"],
    bars: { power: 3, speed: 4, reach: 2, defence: 2, stamina: 5 },
    mods: { ...EVEN, punchTime: 0.92, reach: -0.1, aim: 0.92, guard: 0.95, staminaCost: 0.65, staminaRegen: 1.4 },
  },
};

export const BUILD_LIST: readonly Build[] = BUILD_IDS.map((id) => BUILDS[id]);

/** The build for an id, or the middle of the road for anything unknown. */
export function modsFor(id: string | undefined): BuildMods {
  return (id && (BUILDS as Record<string, Build>)[id]?.mods) || EVEN;
}

export function buildAt(index: number): Build {
  return BUILD_LIST[((index % BUILD_LIST.length) + BUILD_LIST.length) % BUILD_LIST.length]!;
}
