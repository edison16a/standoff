import { segment, type Zone } from "./route";
import type { BossKind, ZombieKind } from "./zombie-kinds";

export const STAGE_COUNT = 25;
/** The stage whose fight ends at the helicopter. */
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
  /** Chance a spawn brings a second zombie with it, from the middle of the route on. */
  packs: number;
}

type Row = [title: string, count: number, maxAlive: number, mix: Mix, gap: number, speed: number, tough: number, boss?: BossKind];

const W = (walker: number, runner = 0, brute = 0, armored = 0): Mix => ({ walker, runner, brute, armored });

const ROWS: readonly Row[] = [
  ["Main Street", 9, 3, W(1), 1.44, 1.0, 1],
  ["The Pharmacy", 10, 3, W(1), 1.35, 1.02, 1],
  ["Corner of Fifth", 12, 4, W(90, 10), 1.3, 1.05, 1],
  ["Back Door", 14, 4, W(80, 20), 1.26, 1.08, 1],
  ["The Butcher's Alley", 4, 2, W(1), 2.8, 1.05, 1, "butcher"],
  ["Park Gates", 15, 4, W(70, 30), 1.22, 1.12, 1],
  ["The Fountain", 16, 5, W(55, 45), 1.17, 1.15, 1],
  ["Ambulance Bay", 18, 5, W(60, 25, 15), 1.12, 1.18, 1],
  ["The Parking Ramp", 19, 5, W(50, 25, 25), 1.08, 1.2, 1],
  ["Hospital Roof", 6, 2, W(60, 40), 2.6, 1.15, 1, "tank"],
  ["The Long Way Down", 19, 5, W(50, 25, 25), 1.06, 1.24, 1.05],
  ["Downtown", 20, 5, W(45, 25, 30), 1.04, 1.27, 1.1],
  ["The On Ramp", 20, 6, W(40, 25, 35), 1.03, 1.3, 1.15],
  ["Highway Pileup", 21, 6, W(40, 25, 20, 15), 1.01, 1.33, 1.2],
  ["The Roadblock", 7, 3, W(40, 0, 0, 60), 2.2, 1.3, 1.2, "juggernaut"],
  ["Riot Line", 21, 6, W(30, 25, 20, 25), 0.99, 1.37, 1.25],
  ["The Overpass", 22, 6, W(30, 25, 20, 25), 0.97, 1.4, 1.3],
  ["Jackknifed Trucks", 22, 6, W(30, 30, 20, 20), 0.95, 1.43, 1.35],
  ["Port Exit", 24, 6, W(30, 30, 20, 20), 0.94, 1.46, 1.4],
  ["The Port Gate", 9, 3, W(40, 30, 30), 2.0, 1.4, 1.4, "tank"],
  ["Container Yard", 24, 7, W(30, 30, 20, 20), 0.92, 1.5, 1.42],
  ["Stacks", 25, 7, W(25, 30, 25, 20), 0.9, 1.54, 1.45],
  ["Warehouse Row", 25, 7, W(25, 30, 25, 20), 0.88, 1.58, 1.48],
  ["Crane Yard", 26, 7, W(25, 30, 25, 20), 0.86, 1.62, 1.5],
  ["Pier Nine", 11, 3, W(30, 30, 20, 20), 1.8, 1.5, 1.5, "behemoth"],
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
  const near = 1 - i * 0.011;
  const [from, to] = SPAWN_BY_ZONE[zone];
  return { index, title, zone, count, maxAlive, mix, gap, speed, tough, harm: 1 + i * 0.03, spawn: [from * near, to * near], boss, packs: Math.max(0, (index - 10) * 0.025) };
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
