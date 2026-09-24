import type { Body } from "./body";
import { LEG_POINTS, LM, visibilityOf } from "./landmarks";

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

export interface SpotRules {
  /** "upper" needs the head, shoulders and hips in view. "full" needs the knees and feet too. */
  needs: "upper" | "full";
  /** Torso lengths, in frame heights, that count as too far away and too near. */
  minScale: number;
  maxScale: number;
  /** How clearly the head, shoulders and hips must be seen, 0 to 1. */
  minConfidence: number;
}

export const DEFAULT_SPOT_RULES: SpotRules = { needs: "upper", minScale: 0.09, maxScale: 0.4, minConfidence: 0.6 };

/** What stops a player's spot from counting yet. Each has a plain instruction in the calibration screen. */
export type SpotIssue = "missing" | "unclear" | "step-left" | "step-right" | "closer" | "back" | "legs";

export function checkSpot(body: Body | null, spot: Spot, rules: SpotRules = DEFAULT_SPOT_RULES): SpotIssue | null {
  if (!body) return "missing";
  // Too near comes first: a head cut off by the top of the picture also makes the body unclear.
  if (body.scale > rules.maxScale || body.landmarks[LM.nose]!.y < 0.02) return "back";
  if (body.confidence < rules.minConfidence) return "unclear";
  if (body.hips.x < spot.x - spot.halfWidth) return "step-right";
  if (body.hips.x > spot.x + spot.halfWidth) return "step-left";
  if (body.scale < rules.minScale) return "closer";
  if (rules.needs === "full" && visibilityOf(body.landmarks, LEG_POINTS) < 0.5) return "legs";
  return null;
}
