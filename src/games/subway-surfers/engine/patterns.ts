import type { Block } from "./block";
import type { Rng } from "./rng";
import { LANES, MOVE_GAP_S, RAMP_LENGTH, TRAIN, trainLength, type Lane } from "./tuning";

/**
 * The course is strung together from these patterns. Each lays out one
 * challenge from the start of a fresh stretch, and each can be passed
 * from any lane, given the clear run up the generator leaves before it.
 * Distances come from `b.sec`, seconds of running, so they stay fair at
 * any speed.
 */
export type Pattern = (b: Block, rng: Rng, level: number) => void;

function others(lane: Lane): Lane[] {
  return LANES.filter((l) => l !== lane);
}

function cars(rng: Rng, min: number, max: number): number {
  return rng.int(min, max);
}

/** One barrier in one lane, coins showing how to pass it. */
const single: Pattern = (b, rng) => {
  const lane = rng.pick(LANES);
  const high = rng.chance(0.45);
  b.barrier(lane, 0, high);
  if (high) b.coinLine(lane, -b.sec(0.5), b.sec(0.5), 0.55);
  else b.coinArc(lane, 0);
  const free = rng.pick(others(lane));
  if (rng.chance(0.5)) b.coinLine(free, b.sec(0.4), b.sec(1.4));
};

/** Barriers in two lanes, the third left open. */
const pair: Pattern = (b, rng) => {
  const open = rng.pick(LANES);
  for (const lane of others(open)) b.barrier(lane, 0, rng.chance(0.5));
  b.coinLine(open, -b.sec(0.6), b.sec(0.6));
};

/** A barrier in every lane: jump or roll, everyone. */
const wall: Pattern = (b, rng) => {
  const mix = rng.int(0, 2);
  const arc = rng.pick(LANES);
  for (const lane of LANES) {
    const high = mix === 0 ? false : mix === 1 ? true : rng.chance(0.5);
    b.barrier(lane, 0, high);
    if (lane === arc) {
      if (high) b.coinLine(lane, -b.sec(0.4), b.sec(0.4), 0.55);
      else b.coinArc(lane, 0);
    }
  }
};

/** Standing trains in two lanes, sometimes with a ramp up onto one. */
const twoTrains: Pattern = (b, rng) => {
  const open = rng.pick(LANES);
  const [a, c] = others(open) as [Lane, Lane];
  const rampOn = rng.chance(0.4) ? rng.pick([a, c]) : null;
  const start = rampOn !== null ? RAMP_LENGTH : 0;
  for (const lane of [a, c]) {
    const z = start + rng.range(0, 8);
    const end = b.train(lane, z, cars(rng, 1, 3), lane === rampOn);
    if (lane === rampOn) b.roofCoins(lane, z - RAMP_LENGTH + 2, end - 2);
  }
  b.coinLine(open, 0, b.end - 2);
};

/** Trains in all three lanes, and one ramp: the only way on is up. */
const bridge: Pattern = (b, rng) => {
  const rampLane = rng.pick(LANES);
  const length = cars(rng, 2, 3);
  for (const lane of LANES) {
    const z = RAMP_LENGTH + (lane === rampLane ? 0 : rng.range(0, 6));
    const end = b.train(lane, z, lane === rampLane ? length : cars(rng, 1, length), lane === rampLane);
    if (lane === rampLane) b.roofCoins(lane, 2, end - 2);
  }
};

/** Side trains overlapping in turn, with a roll in the middle where both are alongside. */
const slalom: Pattern = (b, rng) => {
  const first = rng.pick([-1, 1] as const);
  // They overlap long enough that the roll comes well after the last moment to step out of the second train's lane.
  const overlap = Math.max(b.sec(2 * (MOVE_GAP_S + 0.1)), trainLength(1) * 0.7);
  const endA = b.train(first, 0, Math.max(cars(rng, 1, 2), Math.ceil((overlap + b.sec(0.6)) / (TRAIN.car + TRAIN.gap))));
  const startC = endA - overlap;
  const endC = b.train(-first as Lane, startC, cars(rng, 1, 2));
  const overlapMid = (startC + endA) / 2;
  b.high(0, overlapMid);
  b.coinLine(0, overlapMid - b.sec(0.4), overlapMid + b.sec(0.4), 0.55);
  b.coinLine(-first as Lane, 0, startC - b.sec(0.4));
  b.coinLine(first, endA + 3, endC);
};

/** A corridor between two trains: jump the first barrier, then roll under the next. */
const jumpRoll: Pattern = (b, rng) => {
  // The jump comes a full move after the last moment to step into the corridor.
  const first = b.sec(MOVE_GAP_S + 0.15);
  const second = first + b.sec(1.45);
  const length = Math.max(2, Math.ceil((second + b.sec(0.6)) / (TRAIN.car + TRAIN.gap)));
  b.train(-1, 0, length);
  b.train(1, rng.range(0, 3), length);
  b.low(0, first);
  b.coinArc(0, first);
  b.high(0, second);
  b.coinLine(0, second - b.sec(0.3), second + b.sec(0.4), 0.55);
};

/** A train coming the other way, with something to dodge in another lane. */
const oncoming: Pattern = (b, rng, level) => {
  const lane = rng.pick(LANES);
  const meet = b.sec(1.6);
  b.moving(lane, meet, cars(rng, 2, 3), 0.35 + 0.3 * level);
  const [a, c] = others(lane) as [Lane, Lane];
  const blocked = rng.pick([a, c]);
  const free = blocked === a ? c : a;
  if (rng.chance(0.5)) b.train(blocked, meet - b.sec(0.6), cars(rng, 1, 2));
  else b.barrier(blocked, meet, rng.chance(0.5));
  b.coinLine(free, meet - b.sec(1), meet + b.sec(1));
};

/** Two trains coming at once. One lane is safe. */
const twoOncoming: Pattern = (b, rng, level) => {
  const open = rng.pick(LANES);
  const meet = b.sec(1.8);
  const drift = 0.35 + 0.25 * level;
  const [a, c] = others(open) as [Lane, Lane];
  b.moving(a, meet, cars(rng, 1, 3), drift);
  b.moving(c, meet + b.sec(0.5), cars(rng, 1, 3), drift);
  b.coinLine(open, meet - b.sec(1.2), meet + b.sec(0.8));
  if (rng.chance(0.5)) {
    // Well after the last moment to step into the open lane, so the two moves never crowd each other.
    b.barrier(open, meet + b.sec(MOVE_GAP_S + 0.15), rng.chance(0.5));
  }
};

/** A ramp up the middle with barriers either side. */
const rampRun: Pattern = (b, rng) => {
  const lane = rng.pick(LANES);
  const end = b.train(lane, RAMP_LENGTH, cars(rng, 1, 3), true);
  b.roofCoins(lane, 2, end - 2);
  for (const other of others(lane)) b.barrier(other, RAMP_LENGTH + rng.range(0, 4), rng.chance(0.5));
};

/** A breather: a snaking line of coins. */
const coinsOnly: Pattern = (b, rng) => {
  const from = rng.pick(LANES);
  const to = rng.pick(others(from));
  b.coinWeave(from, to, 0, b.sec(2.2));
};

export interface PatternEntry {
  name: string;
  make: Pattern;
  /** How likely it is at a difficulty from 0 to 1, and from how far along it may appear. */
  weight: (level: number) => number;
  from: number;
}

export const PATTERNS: readonly PatternEntry[] = [
  { name: "single", make: single, weight: (l) => 3 - 2 * l, from: 0 },
  { name: "pair", make: pair, weight: () => 2, from: 0 },
  { name: "wall", make: wall, weight: (l) => 1 + l, from: 120 },
  { name: "twoTrains", make: twoTrains, weight: () => 3, from: 0 },
  { name: "bridge", make: bridge, weight: (l) => 1 + l, from: 150 },
  { name: "slalom", make: slalom, weight: (l) => 0.5 + 1.5 * l, from: 350 },
  { name: "jumpRoll", make: jumpRoll, weight: (l) => l * 2, from: 600 },
  { name: "oncoming", make: oncoming, weight: (l) => 1 + l, from: 250 },
  { name: "twoOncoming", make: twoOncoming, weight: (l) => l * 1.5, from: 900 },
  { name: "rampRun", make: rampRun, weight: () => 1.2, from: 60 },
  { name: "coinsOnly", make: coinsOnly, weight: () => 0.7, from: 0 },
];

/** Coins the run starts with, down the middle while the guard gives chase. */
export function openingCoins(b: Block): void {
  b.coinLine(0, 14, 44);
}

