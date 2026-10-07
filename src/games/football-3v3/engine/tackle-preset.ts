import { isDown } from "./body";
import type { Athlete } from "./types";
import { dist2, dot2, norm2, type V2 } from "./vec";

/**
 * Tackles are authored moves, not ragdolls. The game logic picks one
 * before the bodies meet, and the drawing plays it: a diving wrap from
 * the side or behind that rolls both men over, a head on hit that drives
 * the carrier back, a low cut at the ankles, a shoestring dive at the
 * heels of a man pulling away, and a pile when a second defender arrives.
 */
export const TACKLE_KINDS = ["wrap", "drive", "ankle", "shoestring", "gang"] as const;
export type TackleKind = (typeof TACKLE_KINDS)[number];

/** How a lunge comes in. Picked as it starts, so the leap itself already looks like the tackle it will be. */
export type ApproachKind = Exclude<TackleKind, "gang">;

export const PICK = {
  /** Meeting him this square from the front is head on, and this close it is a drive. */
  headOn: -0.55,
  driveRange: 2.0,
  /** Chasing from this far behind, or slower than him, only the heels are in reach. */
  behind: 0.35,
  heelRange: 1.9,
  /** Kilograms lighter than the carrier that make a tackler go low: head on, and from the side. */
  lowFront: 4,
  lowSide: 8,
  /** A second defender this close to the carrier joins the tackle and makes it a pile. */
  helpRange: 1.7,
  /** Driven back: the carrier's speed away from the tackler after the hit, metres a second. */
  driven: 0.5,
} as const;

/** The way the carrier is going: his run, or his facing when he is nearly still. */
export function headingOf(a: Athlete): V2 {
  const speed = Math.hypot(a.vx, a.vz);
  return speed > 0.5 ? { x: a.vx / speed, z: a.vz / speed } : { x: Math.sin(a.yaw), z: Math.cos(a.yaw) };
}

/**
 * Picks the approach from where the tackler comes from, how far he has
 * to go and the two men's sizes. `along` is above zero from behind the
 * runner and below it from in front of him.
 */
export function approachFor(tackler: Athlete, carrier: Athlete): ApproachKind {
  const n = norm2({ x: carrier.x - tackler.x, z: carrier.z - tackler.z });
  const along = dot2(n, headingOf(carrier));
  const d = dist2(tackler, carrier);
  const lighter = carrier.mass - tackler.mass;
  if (along < PICK.headOn) {
    // Head on a smaller man cuts the legs; a big one runs through him; from farther out he has to leap.
    if (lighter > PICK.lowFront) return "ankle";
    return d < PICK.driveRange ? "drive" : "wrap";
  }
  if (along > PICK.behind) {
    const pulling = Math.hypot(carrier.vx, carrier.vz) > Math.hypot(tackler.vx, tackler.vz) - 0.5;
    return d > PICK.heelRange || pulling ? "shoestring" : "wrap";
  }
  return lighter > PICK.lowSide ? "ankle" : "wrap";
}

/** Defenders close enough to the carrier to pile in on a tackle, nearest first, at most two. */
export function helpersFor(list: readonly Athlete[], carrier: Athlete, tackler: Athlete): Athlete[] {
  return list
    .filter((a) => a !== tackler && a.team !== carrier.team && a.role !== "lineman" && !isDown(a))
    .filter((a) => a.action.kind === "none" || a.action.kind === "lunge")
    .filter((a) => dist2(a, carrier) < PICK.helpRange)
    .sort((a, b) => dist2(a, carrier) - dist2(b, carrier))
    .slice(0, 2);
}

/**
 * The tackle that plays once the momentum says the carrier goes down.
 * More bodies make a pile. A head on approach only drives him back if
 * the hit actually moved him backward; otherwise he falls forward over
 * the tackler, which is a wrap.
 */
export function finishFor(approach: ApproachKind, helpers: number, drivenBack: number): TackleKind {
  if (helpers > 0) return "gang";
  if (approach === "drive" && drivenBack < PICK.driven) return "wrap";
  return approach;
}
