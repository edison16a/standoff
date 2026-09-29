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
  /** A lip this high is stepped onto rather than run into. */
  stepUp: 0.5,
};

/**
 * A lane change: flat out across most of the gap, then easing into the
 * new track, so it snaps like the real game and still lands softly. A
 * lane takes about 0.15 seconds. See `sideStep` in `motion.ts`.
 */
export const SIDE = {
  maxSpeed: 26,
  /** Near the new track the speed is this many times the distance left. */
  rate: 26,
  /** The last few centimetres still close quickly. */
  minSpeed: 4,
};

/**
 * The jump. Gravity is gentler on the way up than on the way down, so a
 * jump pops, hangs for a moment at the top, then snaps back down, about
 * 0.7 seconds in all. It clears a low barrier and, from a ramp or with
 * super sneakers, lands on a train roof.
 */
export const JUMP = {
  rise: 20,
  fall: 30,
  height: 1.5,
  /** Super sneakers clear a train and come down on its roof. */
  bootsHeight: 4,
  /** Ducking in the air drops back down at this speed. */
  slam: 30,
  /** A jump asked for this long before landing still happens on landing. */
  bufferS: 0.2,
  /** A jump asked for this soon after running off an edge still happens, as if the foot were still on it. */
  coyoteS: 0.1,
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
  start: 12,
  /** The cap. Fast enough to be a real test, and the course still leaves time for every move. */
  max: 36,
  /** Metres over which the speed rises most of the way to the top: about 23 m/s after a minute, 31 after two. */
  rise: 1400,
  /** At GO the runner bursts from this share of the pace up to all of it, over `burstS` seconds. */
  burstFrom: 0.4,
  burstS: 0.6,
};

/** The speed is a function of distance, so a run keeps the same pace at the same place however it is drawn. */
export function speedAt(distance: number): number {
  return SPEED.start + (SPEED.max - SPEED.start) * (1 - Math.exp(-Math.max(0, distance) / SPEED.rise));
}

/**
 * What a person in front of a camera can do. The course never asks for
 * two moves closer together than `gapS` plus the camera's lag, at any
 * speed: a head line move takes a camera frame or two and the head
 * clearing its band before the game sees it.
 */
export const REACTION = {
  gapS: 0.45,
  cameraS: 0.2,
};

/** The least time between two moves the course asks for. */
export const MOVE_GAP_S = REACTION.gapS + REACTION.cameraS;

export const COIN = {
  /** The coin as drawn: its radius and half its thickness. */
  radius: 0.38,
  halfThick: 0.05,
  /** A coin is taken when its edge meets the body, across and along the track, and not a moment sooner. */
  reachX: RUNNER.halfWidth + 0.38,
  reachZ: RUNNER.halfDepth + 0.05,
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
  /** Bumps this soon after a stumble are the same stumble. */
  graceS: 1,
  /** Seconds they keep up at the start of a run. */
  startS: 3.5,
};

/** Simulation step. Fixed, so a run plays out the same however fast the machine draws. */
export const STEP_S = 1 / 120;
