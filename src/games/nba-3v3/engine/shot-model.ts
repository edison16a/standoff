import { SHOT } from "./tuning";
import { clamp } from "./vec";

/**
 * How likely a shot is to go in. The meter timing, the distance, the
 * shooter's shooting stat and the nearest defender's contest set the
 * chance. The chance only sets how far off the release is: the ball
 * physics decides each shot (see `shot-error.ts`), and names how it
 * went in or out with the outcomes below.
 */

/** Gold is the small heart of the green: it always swishes, even with a hand in the face. */
export type Grade = "gold" | "perfect" | "good" | "early" | "late";

/** A green release, gold included. */
export function isGreen(grade: Grade): boolean {
  return grade === "gold" || grade === "perfect";
}
/** A free throw is a set shot from the line, worth one. */
export type ShotKind = "jumper" | "layup" | "dunk" | "free";
export const MAKES = ["swish", "bank", "roll", "bounce"] as const;
export const MISSES = ["rimOut", "boardOut", "inOut", "airball"] as const;
export type MakeOutcome = (typeof MAKES)[number];
export type MissOutcome = (typeof MISSES)[number];
export type Outcome = MakeOutcome | MissOutcome;

export function isMake(outcome: Outcome): outcome is MakeOutcome {
  return (MAKES as readonly string[]).includes(outcome);
}

/** Half the green window, in milliseconds. Better shooters, anyone on fire, and a free throw at the line get more. */
export function greenHalfMs(shooting: number, onFire = false, free = false): number {
  const base = SHOT.greenBase + shooting * SHOT.greenPerShooting;
  return base * (onFire ? 1.5 : 1) * (free ? SHOT.freeGreen : 1);
}

/** Half the gold window inside the green, in milliseconds: a small share of it, but never under a frame and a half. */
export function goldHalfMs(shooting: number, onFire = false, free = false): number {
  return Math.max(SHOT.goldMinMs, greenHalfMs(shooting, onFire, free) * SHOT.goldShare);
}

/** When the green window is centred, in milliseconds after the press. */
export const GREEN_MS = SHOT.meterMs * SHOT.greenAt;

/** Grades a release from how long Shoot was held. */
export function gradeRelease(heldMs: number, shooting: number, onFire = false, free = false): { grade: Grade; offsetMs: number } {
  const offsetMs = heldMs - GREEN_MS;
  const half = greenHalfMs(shooting, onFire, free);
  if (Math.abs(offsetMs) <= goldHalfMs(shooting, onFire, free)) return { grade: "gold", offsetMs };
  if (Math.abs(offsetMs) <= half) return { grade: "perfect", offsetMs };
  if (Math.abs(offsetMs) <= half * SHOT.goodSpread) return { grade: "good", offsetMs };
  return { grade: offsetMs < 0 ? "early" : "late", offsetMs };
}

export interface ShotContext {
  kind: ShotKind;
  grade: Grade;
  /** Horizontal distance to the rim in metres. */
  distance: number;
  shooting: number;
  /** 0 wide open to 1 a hand right in the face. */
  contest: number;
  /** The shooter's strength minus the contesting defender's, for layups and dunks. */
  strengthEdge: number;
  onFire: boolean;
  /** A floater: a soft, high one hander off the run, released early over a big man. */
  floater?: boolean;
}

/** The chance the shot goes in, from 0.02 to 0.99. */
export function makeChance(c: ShotContext): number {
  if (c.kind === "dunk") return clamp(0.97 - c.contest * Math.max(0, 0.3 - c.strengthEdge * 0.05), 0.5, 0.99);
  if (c.kind === "layup") return clamp(0.8 + c.strengthEdge * 0.03 + c.shooting * 0.01 - c.contest * 0.45, 0.2, 0.97);
  // Released high and early, a floater beats the contest more than a jumper but is never easy.
  if (c.floater) return clamp(0.36 + c.shooting * 0.035 + (c.onFire ? 0.1 : 0) - c.contest * 0.2, 0.15, 0.85);
  // Gold is a sure swish, guarded or not.
  if (c.grade === "gold") return 1;
  let chance: number;
  if (c.grade === "perfect") chance = (c.onFire ? 0.99 : 0.96) - c.contest * 0.28;
  else if (c.grade === "good") chance = (0.42 + c.shooting * 0.035 + (c.onFire ? 0.15 : 0)) * (1 - c.contest * 0.5);
  else chance = (0.08 + c.shooting * 0.012) * (1 - c.contest * 0.4);
  // Deep heaves fall away fast, short jumpers are a touch easier.
  // Nobody guards a free throw, and the line is short.
  if (c.kind === "free") return clamp(chance + 0.04, 0.02, 0.99);
  if (c.distance > 7.4) chance -= (c.distance - 7.4) * (c.grade === "perfect" ? 0.05 : 0.09);
  if (c.distance < 3) chance += 0.05;
  return clamp(chance, 0.02, 0.99);
}

/**
 * How suited the spot is to a bank shot: the wings at mid range, where
 * players aim for the square, rather than straight on or from the corner.
 */
export function bankAngle(side: number, distance: number): number {
  const angle = Math.abs(side);
  const wing = angle > 0.35 && angle < 1.2 ? 1 : 0.25;
  return distance < 6.2 ? wing : wing * 0.35;
}
