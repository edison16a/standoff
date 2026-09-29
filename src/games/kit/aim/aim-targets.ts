import { wrapAngle } from "@/games/kit/motion/math3d";
import { TARGET_INSET, type Pointing, type ScreenPoint } from "./aim-math";

/** The calibration targets a game can ask for, each a fixed spot on the player's screen or zone. */
export const AIM_TARGETS = ["center", "top-left", "top-right", "bottom-right", "bottom-left"] as const;
export type AimTarget = (typeof AIM_TARGETS)[number];

export const TARGET_POINTS: Record<AimTarget, ScreenPoint> = {
  center: { x: 0, y: 0 },
  "top-left": { x: -TARGET_INSET, y: TARGET_INSET },
  "top-right": { x: TARGET_INSET, y: TARGET_INSET },
  "bottom-right": { x: TARGET_INSET, y: -TARGET_INSET },
  "bottom-left": { x: -TARGET_INSET, y: -TARGET_INSET },
};

/**
 * How many targets a game asks for, four to six, which is where accuracy
 * tops out: the fit learns only the middle and four edge spans, so more
 * holds add waiting, not precision. A shooter takes the middle and every
 * corner, so each edge is measured twice and one shaky hold counts half.
 * A sword swings all over the screen, so it also takes the middle again
 * last, which averages out a shaky first one and any drift in between.
 */
export const AIM_PLANS = {
  shooter: ["center", "top-left", "top-right", "bottom-right", "bottom-left"],
  sword: ["center", "top-left", "top-right", "bottom-right", "bottom-left", "center"],
} as const satisfies Record<string, readonly AimTarget[]>;
export type AimPlan = keyof typeof AIM_PLANS;

/** The angle between two pointings, radians, allowing for the heading narrowing toward straight up. */
export function pointingDistance(a: Pointing, b: Pointing): number {
  return Math.hypot(wrapAngle(a.yaw - b.yaw) * Math.cos((a.pitch + b.pitch) / 2), a.pitch - b.pitch);
}

/**
 * The phone must turn at least this far from the last target taken before
 * a new one fills, so a player still pointing at the old target never
 * has it taken again as the new one.
 */
export const MOVE_TO_NEXT = (2.5 * Math.PI) / 180;

export function movedOn(reading: Pointing, last: Pointing | null): boolean {
  return !last || pointingDistance(reading, last) >= MOVE_TO_NEXT;
}
