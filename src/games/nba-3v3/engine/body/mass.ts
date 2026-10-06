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

/** Leg power per kilogram: quick builds have more, and heavy bodies less for their weight. */
export function powerPerKg(a: Pick<Athlete, "build">): number {
  const speed = BUILDS[a.build].stats.speed;
  return (BODY.power + speed * BODY.powerPerSpeed) * Math.sqrt(BODY.refMass / bodyMass(a));
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
