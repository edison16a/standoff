import { isDown, statsOf } from "./body";
import type { Athlete } from "./types";
import { dist2, dot2, norm2, type V2 } from "./vec";

/**
 * Tackles are authored moves, not ragdolls. The game logic picks one
 * before the bodies meet, and the drawing plays it: a diving wrap from
 * the side or behind that rolls both men over and up again, a head on
 * hit that drives the carrier back, a full power slam that blows him off
 * his feet, a low cut at the ankles, a shoestring dive at the heels of a
 * man pulling away, and a pile when a second defender arrives. A QB
 * caught with the ball in the pocket is sacked: swung round in a bear
 * hug and thrown down, or blindsided from behind and driven face first.
 */
export const TACKLE_KINDS = ["wrap", "drive", "slam", "ankle", "shoestring", "gang", "spin", "blindside"] as const;
export type TackleKind = (typeof TACKLE_KINDS)[number];

/** How a lunge comes in. Picked as it starts, so the leap itself already looks like the tackle it will be. */
export type ApproachKind = Extract<TackleKind, "wrap" | "drive" | "slam" | "ankle" | "shoestring">;

/** Where the tackler meets the carrier from, against the carrier's run. */
export type From = "front" | "side" | "behind";

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
  /** Arriving this fast he lunges at full power: a slam. From the side only a hitter this strong does. */
  slamSpeed: 4.5,
  slamPower: 6,
  /** A second defender this close to the carrier joins the tackle and makes it a pile. */
  helpRange: 1.7,
  /** Driven back: the carrier's speed away from the tackler after the hit, metres a second; past `blownBack` a big hit blows him off his feet. */
  driven: 0.5,
  blownBack: 2.5,
} as const;

/** The way the carrier is going: his run, or his facing when he is nearly still. */
export function headingOf(a: Athlete): V2 {
  const speed = Math.hypot(a.vx, a.vz);
  return speed > 0.5 ? { x: a.vx / speed, z: a.vz / speed } : { x: Math.sin(a.yaw), z: Math.cos(a.yaw) };
}

/** How far along the carrier's run the tackler comes from: above zero from behind him, below it from in front. */
export function alongOf(tackler: Athlete, carrier: Athlete): number {
  return dot2(norm2({ x: carrier.x - tackler.x, z: carrier.z - tackler.z }), headingOf(carrier));
}

export function fromOf(along: number): From {
  return along < PICK.headOn ? "front" : along > PICK.behind ? "behind" : "side";
}

/**
 * Picks the approach from where the tackler comes from, how fast and
 * how far he has to go and the two men's sizes.
 */
export function approachFor(tackler: Athlete, carrier: Athlete): ApproachKind {
  const from = fromOf(alongOf(tackler, carrier));
  const d = dist2(tackler, carrier);
  const lighter = carrier.mass - tackler.mass;
  const speed = Math.hypot(tackler.vx, tackler.vz);
  if (from === "front") {
    // Head on a smaller man cuts the legs; close in, a big one drives him back; at full speed he slams him.
    if (lighter > PICK.lowFront) return "ankle";
    if (d < PICK.driveRange) return "drive";
    return speed >= PICK.slamSpeed ? "slam" : "wrap";
  }
  if (from === "behind") {
    const pulling = Math.hypot(carrier.vx, carrier.vz) > speed - 0.5;
    return d > PICK.heelRange || pulling ? "shoestring" : "wrap";
  }
  if (lighter > PICK.lowSide) return "ankle";
  return speed >= PICK.slamSpeed && statsOf(tackler).power >= PICK.slamPower ? "slam" : "wrap";
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

/** What the contact settled, for picking how the tackle finishes. */
export interface Contact {
  /** Defenders piling on. */
  helpers: number;
  /** The carrier's speed away from the tackler after the hit, metres a second. */
  drivenBack: number;
  /** The hit took his legs whatever the grip (hit.ts). */
  big: boolean;
  /** He is a QB with the ball in the pocket: a sack. */
  sack: boolean;
  from: From;
}

/**
 * The tackle that plays once the momentum says the carrier goes down.
 * More bodies make a pile. A sack has its own: a blindside from behind,
 * a slam for a big full speed hit, otherwise the bear hug spin. A head
 * on approach only drives him back if the hit actually moved him
 * backward; a big hit that did is a slam, and one that did not is a wrap.
 */
export function finishFor(approach: ApproachKind, c: Contact): TackleKind {
  if (c.helpers > 0) return "gang";
  if (c.sack) {
    if (c.from === "behind") return "blindside";
    return c.big && approach === "slam" ? "slam" : "spin";
  }
  if (approach === "drive") return c.drivenBack < PICK.driven ? "wrap" : c.big && c.drivenBack >= PICK.blownBack ? "slam" : "drive";
  return approach;
}
