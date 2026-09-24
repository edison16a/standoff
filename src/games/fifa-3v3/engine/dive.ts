import { KEEPER } from "./tuning";
import type { Dive } from "./types";
import { clamp } from "./vec";

export interface DiveLayout {
  /** How far the boots travel toward the ball. */
  feet: number;
  /** Radians the body leans over from upright toward the ball. */
  lean: number;
  /** Height the body leaves the ground by. */
  leap: number;
  /** 0 fully stretched to about 0.5 curled round a close ball. */
  curl: number;
}

/**
 * How a dive reaches its target. The keeper leans over toward the ball
 * with the arms above the head, so the gloves travel on a circle round
 * the boots: low balls are taken nearly flat, high ones need a leap,
 * and a ball close to the body is smothered in a curl. The boots push
 * off toward the ball for whatever the lean cannot reach.
 */
export function diveLayout(dive: Pick<Dive, "fromZ" | "gloveZ" | "height">): DiveLayout {
  const lateral = Math.abs(dive.gloveZ - dive.fromZ);
  const h = clamp(dive.height, 0.1, 2.6);
  const stretch = clamp(Math.hypot(lateral, h), KEEPER.reach * 0.5, KEEPER.reach);
  const lean = clamp(Math.atan2(lateral, Math.max(0.05, h)), 0, 1.5);
  return {
    feet: clamp(lateral - Math.sin(lean) * stretch, -0.3, 2.2),
    lean,
    leap: clamp(h - Math.cos(lean) * stretch, 0, 0.9),
    curl: 1 - stretch / KEEPER.reach,
  };
}
