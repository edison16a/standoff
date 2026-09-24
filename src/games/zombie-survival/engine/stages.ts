import { segment, type Zone } from "./route";
import type { BossKind, ZombieKind } from "./zombie-kinds";

export const STAGE_COUNT = 25;
/** The stage whose fight ends at the helicopter. */
export const CHOPPER_STAGE = 10;

type Mix = Partial<Record<Exclude<ZombieKind, BossKind>, number>>;

/**
 * One fight. Counts are for a single player. The encounter adds more
 * zombies for a bigger team, but never lets many stand at once: this is
 * a game of aim, not of crowds.
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
  ["Main Street", 3, 2, W(1), 3.6, 1.0, 1],
  ["The Pharmacy", 4, 2, W(1), 3.2, 1.0, 1],
  ["Corner of Fifth", 5, 2, W(1), 3.0, 1.05, 1],
  ["Back Door", 6, 3, W(85, 15), 2.8, 1.05, 1],
  ["The Butcher's Alley", 3, 2, W(1), 3.5, 1.05, 1, "butcher"],
  ["Park Gates", 7, 3, W(70, 30), 2.6, 1.1, 1],
  ["The Fountain", 8, 3, W(55, 45), 2.4, 1.12, 1],
  ["Ambulance Bay", 9, 3, W(60, 25, 15), 2.3, 1.15, 1],
  ["The Parking Ramp", 10, 4, W(50, 25, 25), 2.2, 1.18, 1],
  ["Hospital Roof", 5, 2, W(60, 40), 3.0, 1.15, 1, "tank"],
  ["The Long Way Down", 10, 4, W(50, 25, 25), 2.0, 1.22, 1.05],
  ["Downtown", 11, 4, W(45, 25, 30), 1.9, 1.26, 1.1],
  ["The On Ramp", 12, 4, W(40, 25, 35), 1.8, 1.3, 1.15],
  ["Highway Pileup", 12, 5, W(40, 25, 20, 15), 1.7, 1.34, 1.2],
  ["The Roadblock", 6, 3, W(40, 0, 0, 60), 2.6, 1.3, 1.2, "juggernaut"],
  ["Riot Line", 13, 5, W(30, 25, 20, 25), 1.6, 1.4, 1.25],
  ["The Overpass", 13, 5, W(30, 25, 20, 25), 1.5, 1.44, 1.3],
  ["Jackknifed Trucks", 14, 5, W(30, 30, 20, 20), 1.45, 1.48, 1.35],
  ["Port Exit", 14, 5, W(30, 30, 20, 20), 1.4, 1.52, 1.4],
  ["The Port Gate", 8, 3, W(40, 30, 30), 2.2, 1.4, 1.4, "tank"],
  ["Container Yard", 15, 5, W(30, 30, 20, 20), 1.3, 1.56, 1.42],
  ["Stacks", 15, 6, W(25, 30, 25, 20), 1.25, 1.6, 1.45],
  ["Warehouse Row", 16, 6, W(25, 30, 25, 20), 1.2, 1.64, 1.48],
  ["Crane Yard", 16, 6, W(25, 30, 25, 20), 1.1, 1.7, 1.5],
  ["Pier Nine", 10, 3, W(30, 30, 20, 20), 2.0, 1.5, 1.5, "behemoth"],
];

/** Short fights on the roof and in the alley, where the space ahead is small. */
const SPAWN_BY_ZONE: Record<Zone, [number, number]> = {
  street: [26, 34],
  alley: [22, 32],
  park: [26, 36],
  hospital: [26, 34],
  ramp: [24, 34],
  roof: [16, 30],
  highway: [28, 38],
  docks: [26, 36],
};

export const STAGES: readonly StageSpec[] = ROWS.map(([title, count, maxAlive, mix, gap, speed, tough, boss], i) => {
  const index = i + 1;
  const zone = segment(index + 1).zone;
  // Later stages let the dead get closer before they show, so there is less time to react.
  const near = 1 - i * 0.011;
  const [from, to] = SPAWN_BY_ZONE[zone];
  return { index, title, zone, count, maxAlive, mix, gap, speed, tough, harm: 1 + i * 0.03, spawn: [from * near, to * near], boss, packs: Math.max(0, (index - 10) * 0.025) };
});

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
