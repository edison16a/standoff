import type { Body } from "./body";

/** Where one player should stand, across the mirrored picture. */
export interface Spot {
  slot: number;
  /** The middle of the spot, 0 left to 1 right. */
  x: number;
  /** How far either side of the middle still counts, in picture widths. */
  halfWidth: number;
}

/** One player stands in the middle. Two share the picture, player one on the left. */
export function spotsFor(players: number): Spot[] {
  if (players <= 1) return [{ slot: 1, x: 0.5, halfWidth: 0.2 }];
  return [
    { slot: 1, x: 0.28, halfWidth: 0.16 },
    { slot: 2, x: 0.72, halfWidth: 0.16 },
  ];
}

/**
 * What a spot asks of a player. Only the head and shoulders count, so a
 * player seen from the waist up is enough.
 */
export interface SpotRules {
  /** Shoulder widths, in frame heights, that count as too far away and too near. */
  minShoulder: number;
  maxShoulder: number;
  /** The head must sit at least this far below the top of the picture, so a jump stays in view. */
  headroom: number;
  /** How clearly the head and shoulders must be seen, 0 to 1. */
  minConfidence: number;
}

export const DEFAULT_SPOT_RULES: SpotRules = { minShoulder: 0.07, maxShoulder: 0.6, headroom: 0.12, minConfidence: 0.6 };

/** What stops a player's spot from counting yet. Each has a plain instruction in the calibration screen. */
export type SpotIssue = "missing" | "unclear" | "step-left" | "step-right" | "closer" | "back" | "headroom";

/** The middle of the head and shoulders across the picture: where the player stands. */
export function centreOf(body: Body): number {
  return (body.head.x + body.shoulders.x) / 2;
}

export function checkSpot(body: Body | null, spot: Spot, rules: SpotRules = DEFAULT_SPOT_RULES): SpotIssue | null {
  if (!body) return "missing";
  // Too near comes first, then a head at the top edge: a head cut off by the picture also makes the body unclear.
  if (body.shoulderWidth > rules.maxShoulder) return "back";
  if (body.head.y < rules.headroom) return "headroom";
  if (body.confidence < rules.minConfidence || !body.headSeen) return "unclear";
  const x = centreOf(body);
  if (x < spot.x - spot.halfWidth) return "step-right";
  if (x > spot.x + spot.halfWidth) return "step-left";
  if (body.shoulderWidth < rules.minShoulder) return "closer";
  return null;
}
