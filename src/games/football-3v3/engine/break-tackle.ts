import { statsOf } from "./body";
import { knockDown } from "./down";
import { headingOf } from "./tackle-preset";
import type { Athlete } from "./types";
import { dot2, type V2 } from "./vec";

/**
 * Breaking a tackle is an authored move too, and only a head on one can
 * be broken. A carrier at speed who meets a tackler square may run
 * through him, more often the stronger, faster and heavier he is: a big
 * back lowers his shoulder and trucks him onto his back; anyone else
 * plants a stiff arm in his facemask and shoves him to the turf. From
 * the side or behind there is nothing to push off: a tackler who gets
 * there brings him down.
 */
export const BREAK_KINDS = ["truck", "stiffarm"] as const;
export type BreakKind = (typeof BREAK_KINDS)[number];

export const BREAK = {
  /** The hit must come at least this square from the front (along his run, -1 dead ahead). */
  front: -0.45,
  /** And he must be going at least this fast into it, metres a second. */
  speed: 4.5,
  /** The odds of running through: a base, then for each point of power over the tackler's, each m/s over `speed` and each kilogram heavier. */
  base: 0.12,
  perPower: 0.05,
  perSpeed: 0.06,
  perKg: 0.006,
  cap: 0.5,
  /** Power, or kilograms over the tackler, that lower the shoulder instead of the arm. */
  truckPower: 8,
  truckHeavier: 6,
  /** Seconds the carrier's move plays, and how long the beaten tackler is on the turf. */
  dur: 0.6,
  truckedDown: 1.6,
  stiffDown: 1.3,
  /** How hard the beaten tackler is thrown back, metres a second, and how much of his run the carrier keeps. */
  truckedBack: 3.2,
  stiffBack: 2.0,
  truckKeeps: 0.7,
  stiffKeeps: 0.85,
} as const;

/**
 * The odds a carrier runs through this tackle: zero unless it comes at
 * him head on (`n` the hit's line from tackler to carrier) while he is
 * going at least BREAK.speed, then more for a stronger, faster, heavier
 * man. Pure, so tests can check it.
 */
export function breakOdds(carrier: Athlete, tackler: Athlete, n: V2, speed: number): number {
  if (dot2(n, headingOf(carrier)) > BREAK.front || speed < BREAK.speed) return 0;
  const power = statsOf(carrier).power - statsOf(tackler).power;
  const odds = BREAK.base + BREAK.perPower * power + BREAK.perSpeed * (speed - BREAK.speed) + BREAK.perKg * (carrier.mass - tackler.mass);
  return Math.max(0, Math.min(BREAK.cap, odds));
}

/** How he breaks it: a big or very strong man trucks him, anyone else stiff arms. */
export function breakKindFor(carrier: Athlete, tackler: Athlete): BreakKind {
  const heavier = carrier.mass - tackler.mass >= BREAK.truckHeavier;
  return heavier || statsOf(carrier).power >= BREAK.truckPower ? "truck" : "stiffarm";
}

/**
 * Plays the break: the carrier runs on with his move and most of the
 * run he had before the hit (`before`), the tackler is put on the turf.
 */
export function breakTackle(kind: BreakKind, carrier: Athlete, tackler: Athlete, n: V2, before: V2): void {
  const keep = kind === "truck" ? BREAK.truckKeeps : BREAK.stiffKeeps;
  carrier.vx = before.x * keep;
  carrier.vz = before.z * keep;
  carrier.breaking = { kind, t: 0, dur: BREAK.dur };
  carrier.stagger = Math.max(carrier.stagger, kind === "truck" ? 0.3 : 0.15);
  const back = kind === "truck" ? BREAK.truckedBack : BREAK.stiffBack;
  // Thrown back down the hit's line: off his feet onto his back, or shoved aside onto his seat.
  knockDown(tackler, kind === "truck" ? BREAK.truckedDown : BREAK.stiffDown, kind === "truck" ? "trucked" : "stiffarmed");
  tackler.vx = -n.x * back;
  tackler.vz = -n.z * back;
  tackler.yaw = Math.atan2(n.x, n.z);
}

/** Moves the break's clock and ends it. */
export function updateBreak(a: Athlete, dt: number): void {
  if (!a.breaking) return;
  a.breaking.t += dt;
  if (a.breaking.t >= a.breaking.dur) a.breaking = null;
}
