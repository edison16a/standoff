/**
 * How everything moves, in blocks and seconds. The cube's jump lasts
 * about half a second, so at a normal tempo one jump spans one beat.
 */

/** Physics runs in fixed steps, fine enough that a fast cube never passes through a spike. */
export const STEP = 1 / 240;

/** Half the player's size. The drawn cube is a full block. */
export const HALF = 0.46;
/** Spikes only hurt this far into the player, so a graze is forgiven. */
export const HAZARD_HALF = 0.34;
/** A block kills only if it reaches this far into the player from the side. */
export const CORE_HALF = 0.26;
/** A landing this far below a block's top still snaps onto it. */
export const SNAP = 0.3;

/** The dangerous part of a spike, from its middle across and from its base up. */
export const SPIKE_HALF_WIDTH = 0.18;
export const SPIKE_HEIGHT = 0.56;

export const CUBE = {
  gravity: 80,
  jump: 19.5,
  maxFall: 30,
};

export const UFO = {
  gravity: 24,
  flap: 9.5,
  maxFall: 11,
  maxRise: 14,
};

export const BALL = {
  gravity: 55,
  /** A small push toward the new side, so a flip leaves the surface at once. */
  kick: 4,
  maxFall: 24,
};

/** Launch speeds for pads and orbs, by mode. */
export const PAD = { cube: 27, ufo: 17, ball: 17 };
export const ORB = { cube: 19.5, ufo: 11.5, ball: 15 };
/** How near the player's middle must be to an orb's, on each axis. */
export const ORB_REACH = 0.95;

/** A jump pressed this long before landing still happens on landing. */
export const JUMP_BUFFER = 0.12;
/** A jump pressed this long after running off an edge still counts. */
export const COYOTE = 0.07;

/** Falling this far below the floor, into a pit, ends the attempt. */
export const FALL_LIMIT = -4;

/** How long the explosion shows before the player comes back. */
export const DEATH_PAUSE = 0.7;
