/**
 * Every number the run is built on, in metres and seconds. The runner
 * heads down +z along three tracks. Lane -1 is on the left of the screen.
 */

export const LANES = [-1, 0, 1] as const;
export type Lane = (typeof LANES)[number];

export const LANE_WIDTH = 2.6;

export function laneX(lane: number): number {
  return lane * LANE_WIDTH;
}

export function clampLane(lane: number): Lane {
  return (lane < 0 ? -1 : lane > 0 ? 1 : 0) as Lane;
}

export const RUNNER = {
  /** Half the body's width and depth, a little slimmer than it looks, to be kind. */
  halfWidth: 0.3,
  halfDepth: 0.28,
  height: 1.7,
  rollHeight: 0.8,
  /** Sideways speed while changing lanes: a lane in about 0.16 seconds. */
  sideSpeed: 16,
  /** A lip this high is stepped onto rather than run into. */
  stepUp: 0.5,
};

export const JUMP = {
  gravity: 20,
  /** An ordinary jump clears the low barriers, and lasts long enough for a camera to catch up. */
  height: 1.6,
  /** Jump boots reach a train roof. */
  bootsHeight: 3.9,
  /** Ducking in the air slams back down at this speed. */
  slam: 24,
  /** A jump asked for this long before landing still happens on landing. */
  bufferS: 0.25,
};

export const ROLL = {
  /** A roll lasts at least this long, and longer while the player stays down. */
  minS: 0.7,
  maxS: 1.4,
};

export const TRAIN = {
  width: 2.3,
  /** The roof, which the runner can stand on. */
  height: 3.4,
  car: 13,
  /** The coupling gap between cars. It is solid, so the roof runs straight across. */
  gap: 0.6,
};

export function trainLength(cars: number): number {
  return cars * TRAIN.car + (cars - 1) * TRAIN.gap;
}

export const BARRIER = {
  depth: 0.35,
  /** The top of a low barrier: jump it. */
  lowTop: 1.05,
  /** The bottom and top of a high barrier's board: roll under it. */
  highBottom: 1.15,
  highTop: 2.9,
};

export const RAMP_LENGTH = 7;

export const SPEED = {
  start: 11,
  max: 21,
  /** Metres over which the speed rises most of the way to the top. */
  rise: 3200,
};

/** The speed is a function of distance, so two players on one seed face the same pace at the same place. */
export function speedAt(distance: number): number {
  return SPEED.start + (SPEED.max - SPEED.start) * (1 - Math.exp(-Math.max(0, distance) / SPEED.rise));
}

export const COIN = {
  /** How near the runner's middle a coin must pass, across and along. */
  reachX: 0.95,
  reachZ: 0.9,
  /** Height of coins on the ground. */
  y: 0.95,
  points: 10,
  /** A coin within this long of the last one keeps the streak going. */
  streakS: 0.7,
};

export const ZONE_LENGTH = 700;
export const MAX_LEVEL = 5;

/** The guard and his dog: how near they start, and how long they stay close after a stumble. */
export const CHASE = {
  startGap: 2.2,
  closeGap: 2.6,
  farGap: 26,
  /** A second stumble within this many seconds means they catch you. */
  memoryS: 7,
  /** Seconds they keep up at the start of a run. */
  startS: 3.5,
};

/** Simulation step. Fixed, so a run plays out the same however fast the machine draws. */
export const STEP_S = 1 / 120;
