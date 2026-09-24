/**
 * Where each player's gun stands along the bottom of the screen. Plain
 * numbers, so it can be tested without three.js.
 *
 * Each gun turns about a point on its barrel, just behind the pump, not
 * about the receiver. The barrels then stay in their own lane at the
 * bottom of the picture however far a player swings, and only the stocks,
 * mostly out of view below the frame, sweep sideways. That is what keeps
 * two guns from crossing when their players aim at the same duck.
 */

/** Where along the gun, in its own metres from the receiver, it turns. */
export const GUN_PIVOT_Z = 0.3;

/** Height and depth of the pivots: low in front of the camera, so only the front of each gun shows. */
export const GUN_Y = 1.12;
export const GUN_Z = 4.15;

/**
 * Half the width the pivots spread across, in metres at GUN_Z. Wider
 * with more players, but the outer guns stay clear of the screen edge.
 */
const SPREAD: Record<number, number> = { 1: 0, 2: 0.62, 3: 0.9, 4: 1.02 };

/** A lone gun sits off to the right like the cover, which keeps the middle of the booth clear. */
const SOLO_X = 0.62;

/**
 * In the lobby the panel covers the right of the screen, so the guns
 * gather to the left of it, then glide back out when the round starts.
 */
const LOBBY_RIGHT = 0.42;

/** Drawn larger than life so they read from across a room, and smaller when four share the counter. */
const SCALE: Record<number, number> = { 1: 2.4, 2: 2.1, 3: 1.9, 4: 1.75 };

export interface GunSpot {
  x: number;
  y: number;
  z: number;
  scale: number;
}

export function gunSpot(index: number, count: number, lobby: boolean): GunSpot {
  const n = Math.max(1, Math.min(4, count));
  const half = SPREAD[n]!;
  let left = -half;
  let right = half;
  if (n === 1) left = right = SOLO_X;
  if (lobby) {
    // Squeeze the row into the space left of the panel, keeping its left edge.
    right = Math.min(right, LOBBY_RIGHT);
    left = Math.min(left, right);
  }
  const x = n === 1 ? left : left + ((right - left) * index) / (n - 1);
  return { x, y: GUN_Y, z: GUN_Z, scale: SCALE[n]! };
}
