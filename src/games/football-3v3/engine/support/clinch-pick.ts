import type { BlockKind } from "../block-preset";

/**
 * A support blocker's block, picked like the linemen's (block-preset.ts)
 * but out in space: the punch as they meet, then a drive block while the
 * blocker wins, an anchor while the defender does, a pancake when the
 * blocker wins big, and a shed when the defender rips free. Out in space
 * a block holds for less time than in the trenches, so a runner behind
 * one has to keep moving.
 */
export const CLINCH = {
  /** Seconds of punch and hand fight as the two meet. */
  engage: 0.4,
  /** Closer than this a blocker gets his hands on his man. */
  reach: 1.05,
  /** The two stand this far apart, chest to chest. */
  gap: 0.86,
  /** A winning shove this strong may put the defender on his back after this long, this often. */
  pancake: -0.5,
  pancakeAfter: 0.6,
  pancakeOdds: 0.2,
  /** A shove this strong the other way may let the defender rip free after this long, this often. */
  shed: 0.45,
  shedAfter: 0.9,
  shedOdds: 0.45,
  /** No block lasts longer than this: the defender always fights off in the end. */
  longest: 3.2,
  /** Seconds a blocker who was shed, or who pancaked his man, waits before he blocks again. */
  rest: 1.1,
  /** Seconds a defender who ripped free cannot be blocked again. */
  free: 1.2,
  /** Sideways drift of a pair as the defender works toward the ball, metres a second at full stick. */
  slide: 1.1,
  /** How hard the pair surges, and the edge a stronger man has per point of power. */
  surge: 0.85,
  perPower: 0.07,
} as const;

/** The move for a shove. Pure: `roll` is a chance from 0 to 1. Positive `surge` is the defender winning. */
export function clinchKindFor(t: number, surge: number, passPro: boolean, roll: number): BlockKind {
  if (t < CLINCH.engage) return "engage";
  if (surge <= CLINCH.pancake && t >= CLINCH.pancakeAfter && roll < CLINCH.pancakeOdds) return "pancake";
  if ((surge >= CLINCH.shed && t >= CLINCH.shedAfter && roll < CLINCH.shedOdds) || t >= CLINCH.longest) return "shed";
  if (surge >= 0.35) return "anchor";
  if (surge <= -0.3) return "drive";
  return passPro ? "pass" : "drive";
}
