import { segment, type Zone } from "./route";
import type { BossKind, ZombieKind } from "./zombie-kinds";

export const STAGE_COUNT = 15;
/** The stage whose fight ends with the helicopter lifting the team off the roof. */
export const CHOPPER_STAGE = 10;

type Mix = Partial<Record<Exclude<ZombieKind, BossKind>, number>>;

/**
 * One fight. Counts are for a single player. The dead come thick and
 * fast, but only so many stand at once, so every one can still be aimed
 * at. The encounter sends a bigger team more of them, and sooner.
 */
export interface StageSpec {
  index: number;
  title: string;
  /** Where the fight happens, which is the road ahead of the checkpoint. */
  zone: Zone;
  /** Ordinary zombies to put down, the boss aside. */
  count: number;
  /** Most ordinary zombies standing at once. */
  maxAlive: number;
  mix: Mix;
  /** Seconds between spawns while there is room. */
  gap: number;
  /** Multiplies every zombie's walking speed. */
  speed: number;
  /** Multiplies ordinary zombies' hit points. Late walkers need two SMG rounds. */
  tough: number;
  /** Multiplies what each swing takes off the team. */
  harm: number;
  /** How far ahead zombies appear, in metres. */
  spawn: [number, number];
  boss?: BossKind;
  /** Chance a spawn brings a second zombie with it, from the third stage on. */
  packs: number;
}

type Row = [title: string, count: number, maxAlive: number, mix: Mix, gap: number, speed: number, tough: number, boss?: BossKind];

const W = (walker: number, runner = 0, brute = 0, armored = 0): Mix => ({ walker, runner, brute, armored });

// Busy from the first street, a boss by the second stage, and a boss to end each act.
const ROWS: readonly Row[] = [
  ["Main Street", 16, 5, W(90, 10), 1.0, 1.0, 1],
  ["The Butcher's Alley", 6, 3, W(1), 1.9, 1.0, 1, "butcher"],
  ["Back Door", 18, 5, W(75, 25), 0.96, 1.05, 1],
  ["Park Gates", 20, 5, W(65, 30, 5), 0.93, 1.09, 1],
  ["The Fountain", 21, 6, W(50, 35, 15), 0.9, 1.13, 1],
  ["The Roadblock", 7, 3, W(40, 0, 0, 60), 1.8, 1.1, 1, "juggernaut"],
  ["Corner of Fifth", 22, 6, W(45, 25, 20, 10), 0.87, 1.18, 1.05],
  ["Ambulance Bay", 23, 6, W(40, 25, 25, 10), 0.85, 1.22, 1.1],
  ["The Parking Ramp", 24, 6, W(35, 25, 25, 15), 0.83, 1.26, 1.15],
  ["Hospital Roof", 9, 3, W(50, 50), 1.7, 1.2, 1.15, "tank"],
  ["The Drop Zone", 24, 7, W(30, 30, 20, 20), 0.81, 1.32, 1.25],
  ["Container Yard", 25, 7, W(25, 30, 25, 20), 0.79, 1.38, 1.32],
  ["The Port Gate", 10, 3, W(40, 30, 30), 1.6, 1.34, 1.35, "tank"],
  ["Crane Yard", 26, 7, W(25, 30, 25, 20), 0.77, 1.44, 1.4],
  ["Pier Nine", 11, 3, W(30, 30, 20, 20), 1.7, 1.42, 1.45, "behemoth"],
];

/** Short fights on the roof and in the alley, where the space ahead is small. */
// Close enough to read on screen from the moment they step out of the fog.
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

export const STAGES: readonly StageSpec[] = ROWS.map(([title, count, maxAlive, mix, gap, speed, tough, boss], i) => {
  const index = i + 1;
  const zone = segment(index + 1).zone;
  // Later stages let the dead get closer before they show, so there is less time to react.
  const near = 1 - i * 0.018;
  const [from, to] = SPAWN_BY_ZONE[zone];
  // Pairs start early, so the middle of the run already feels crowded.
  return { index, title, zone, count, maxAlive, mix, gap, speed, tough, harm: 1 + i * 0.05, spawn: [from * near, to * near], boss, packs: Math.max(0, (index - 2) * 0.02) };
});

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
