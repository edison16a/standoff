import { segment, type Zone } from "./route";
import type { BossKind, ZombieKind } from "./zombie-kinds";

export const STAGE_COUNT = 15;
/** The stage whose fight ends with the helicopter lifting the team off the roof. */
export const CHOPPER_STAGE = 10;
/** A big boss every this many stages. */
export const BOSS_EVERY = 5;

type Mix = Partial<Record<Exclude<ZombieKind, BossKind>, number>>;

/** A plain fight, a mini boss with a crowd, or a big boss with runners rushing in behind it. */
export type Tier = "plain" | "mini" | "boss";

/** Runners that charge in behind a big boss, a few at a time. */
export interface Rush {
  /** Runners in each rush, for one player. */
  size: number;
  /** Seconds between rushes. */
  every: number;
}

/**
 * One fight. Counts are for a single player. Fights are short, and what
 * makes them hard is speed: every stage the dead come ten percent faster,
 * up to twice the pace of the first. The encounter sends a bigger team a
 * few more of them, and sooner.
 */
export interface StageSpec {
  index: number;
  title: string;
  /** Where the fight happens, which is the road ahead of the checkpoint. */
  zone: Zone;
  tier: Tier;
  /** Ordinary zombies to put down, the bosses aside. On a big boss stage they are all rushers. */
  count: number;
  /** Most ordinary zombies standing at once, rushers aside. */
  maxAlive: number;
  mix: Mix;
  /** Seconds between spawns while there is room. */
  gap: number;
  /** Multiplies every zombie's walking speed. */
  speed: number;
  /** Multiplies ordinary zombies' hit points. */
  tough: number;
  /** Multiplies what each swing takes off the team. */
  harm: number;
  /** How far ahead zombies appear, in metres. */
  spawn: [number, number];
  /** The bosses in the order they come. Empty on a plain stage. */
  bosses: readonly BossKind[];
  /** How many ordinary zombies have come when each boss steps out. */
  bossAt: readonly number[];
  rush: Rush | null;
  /** Chance a spawn brings a second zombie with it, from the third stage on. */
  packs: number;
}

interface Row {
  title: string;
  count: number;
  maxAlive?: number;
  mix?: Mix;
  gap?: number;
  bosses?: BossKind[];
  bossAt?: number[];
  rush?: Rush;
}

const W = (walker: number, runner = 0, brute = 0, armored = 0): Mix => ({ walker, runner, brute, armored });

// Plain, mini boss, plain, mini boss, big boss: three times over, each lap faster.
const ROWS: readonly Row[] = [
  { title: "Main Street", count: 8, maxAlive: 4, mix: W(90, 10), gap: 1.1 },
  { title: "The Butcher's Alley", count: 6, maxAlive: 3, mix: W(80, 20), gap: 1.2, bosses: ["butcher"], bossAt: [2] },
  { title: "Back Door", count: 10, maxAlive: 5, mix: W(70, 25, 5), gap: 1 },
  { title: "Park Gates", count: 8, maxAlive: 4, mix: W(60, 30, 10), gap: 1, bosses: ["surgeon"], bossAt: [3] },
  { title: "The Fountain", count: 6, bosses: ["juggernaut"], rush: { size: 3, every: 9 } },
  { title: "The Roadblock", count: 13, maxAlive: 6, mix: W(45, 25, 10, 20), gap: 0.85 },
  { title: "Corner of Fifth", count: 11, maxAlive: 5, mix: W(45, 30, 15, 10), gap: 0.9, bosses: ["hook"], bossAt: [3] },
  { title: "Ambulance Bay", count: 15, maxAlive: 6, mix: W(40, 30, 20, 10), gap: 0.8 },
  { title: "The Parking Ramp", count: 12, maxAlive: 5, mix: W(40, 30, 20, 10), gap: 0.85, bosses: ["surgeon"], bossAt: [3] },
  { title: "Hospital Roof", count: 9, bosses: ["tank"], rush: { size: 3, every: 8 } },
  { title: "The Drop Zone", count: 17, maxAlive: 7, mix: W(35, 35, 15, 15), gap: 0.75 },
  { title: "Container Yard", count: 15, maxAlive: 6, mix: W(35, 35, 15, 15), gap: 0.8, bosses: ["hook"], bossAt: [3] },
  { title: "The Port Gate", count: 19, maxAlive: 7, mix: W(30, 35, 20, 15), gap: 0.72 },
  { title: "Crane Yard", count: 16, maxAlive: 6, mix: W(30, 35, 20, 15), gap: 0.78, bosses: ["butcher", "hook"], bossAt: [2, 9] },
  { title: "Pier Nine", count: 16, bosses: ["behemoth"], rush: { size: 4, every: 7 } },
];

/** Close enough to read on screen from the moment they step out of the fog. The roof and the alley are short. */
const SPAWN_BY_ZONE: Record<Zone, [number, number]> = {
  street: [21, 28],
  alley: [18, 26],
  park: [21, 29],
  hospital: [21, 28],
  ramp: [20, 28],
  roof: [14, 25],
  highway: [22, 30],
  docks: [21, 29],
};

/** The first stage walks at the kinds' own pace, each stage after it ten percent faster, up to twice as fast. */
export function stageSpeed(index: number): number {
  return Math.min(2, 1 + 0.1 * (index - 1));
}

function tierOf(row: Row): Tier {
  if (row.rush) return "boss";
  return row.bosses?.length ? "mini" : "plain";
}

export const STAGES: readonly StageSpec[] = ROWS.map((row, i) => {
  const index = i + 1;
  const bosses = row.bosses ?? [];
  return {
    index,
    title: row.title,
    zone: segment(index + 1).zone,
    tier: tierOf(row),
    count: row.count,
    maxAlive: row.maxAlive ?? 0,
    // A big boss's company is all runners, and they come in rushes.
    mix: row.mix ?? W(0, 1),
    gap: row.gap ?? 0,
    speed: stageSpeed(index),
    tough: 1,
    harm: 1 + i * 0.05,
    spawn: SPAWN_BY_ZONE[segment(index + 1).zone],
    bosses,
    bossAt: row.bossAt ?? bosses.map(() => 0),
    rush: row.rush ?? null,
    // Pairs start early, so the middle of the run already feels crowded.
    packs: Math.max(0, (index - 2) * 0.02),
  };
});

/**
 * The most zombies a stage ever sends, bosses included, whatever the size
 * of the team: ten early on, rising to about twenty at the end. More guns
 * make a round quicker, never longer.
 */
export function roundCap(index: number): number {
  return index <= BOSS_EVERY ? 10 : Math.min(22, Math.round(10 + (10 * (index - BOSS_EVERY)) / 8));
}

/** Fights that end in a big moment of the story: the chopper on the roof and the ship at the pier. */
export function storyBeat(index: number): boolean {
  return index === CHOPPER_STAGE || index === STAGE_COUNT;
}

export function stage(index: number): StageSpec {
  const found = STAGES[Math.max(1, Math.min(STAGE_COUNT, index)) - 1];
  if (!found) throw new Error(`No stage ${index}.`);
  return found;
}

/** How wide the road ahead is, so zombies stay on it. Metres either side of the middle. */
export const HALF_WIDTH: Record<Zone, number> = {
  street: 5,
  alley: 2.2,
  park: 6,
  hospital: 5.5,
  ramp: 3.5,
  roof: 6,
  highway: 7,
  docks: 5.5,
};
