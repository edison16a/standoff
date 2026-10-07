import { BUILDS } from "../../builds";
import type { Athlete } from "../types";
import { BODY, CONTACT } from "./body-spec";

/**
 * Body weight in kilograms from the build's frame: height squared for
 * the size, and the bulk of the limbs and the width of the chest on
 * top. A 1.88 m shooter comes out near 80 kg, a 2.2 m big man near 120.
 */
export function bodyMass(a: Pick<Athlete, "build">): number {
  const b = BUILDS[a.build].body;
  return 23.5 * b.height * b.height * (0.55 + 0.25 * b.bulk + 0.2 * b.width);
}

/**
 * How much quicker than average a body is for its size, about 1: a small
 * guard is up to a tenth faster and a big man a little slower, whatever
 * his speed rating. This is the small player's edge on the floor.
 */
export function sizeEdge(a: Pick<Athlete, "build">): number {
  const h = BUILDS[a.build].body.height;
  return Math.min(BODY.sizeMax, Math.max(BODY.sizeMin, 1 + (BODY.sizeRef - h) * BODY.sizePerMetre));
}

/** Share of the shoes' grip a body can use: quick small feet cut a little sharper. */
export function footGrip(a: Pick<Athlete, "build">): number {
  return 1 + (sizeEdge(a) - 1) * 0.5;
}

/** Leg power per kilogram: quick builds and small bodies have more, and heavy bodies less for their weight. */
export function powerPerKg(a: Pick<Athlete, "build">): number {
  const speed = BUILDS[a.build].stats.speed;
  const edge = sizeEdge(a);
  return (BODY.power + speed * BODY.powerPerSpeed) * Math.sqrt(BODY.refMass / bodyMass(a)) * edge * edge;
}

/**
 * How heavy a player is to move in a collision. A set player braces
 * with the legs, and strong legs brace harder; one in the air has
 * nothing to push against and counts only his weight.
 */
export function contactMass(a: Athlete): number {
  const m = bodyMass(a);
  const set = a.y < 0.02 && Math.hypot(a.vx, a.vz) < CONTACT.setSpeed;
  return set ? m * (1 + BUILDS[a.build].stats.strength * CONTACT.bracePerStrength) : m;
}
