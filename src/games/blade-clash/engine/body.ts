import type { Capsule } from "./geometry";

/** The body parts a blade can hit, for reporting where it landed. */
export type BodyPart = "head" | "torso" | "legs";

export interface Hurtbox extends Capsule {
  part: BodyPart;
}

/**
 * Where a fighter can be hit, standing at `x` on the line. Rounded shapes
 * a little bigger than the drawn body, so a blade that looks like it
 * touched always counts. The sword arm is not a target, since it is
 * always the nearest thing to the other blade and would soak up every
 * swing.
 */
export function hurtboxes(x: number): Hurtbox[] {
  return [
    { part: "head", a: { x, y: 1.66, z: 0 }, b: { x, y: 1.74, z: 0 }, radius: 0.14 },
    { part: "torso", a: { x, y: 0.98, z: 0 }, b: { x, y: 1.44, z: 0 }, radius: 0.22 },
    { part: "legs", a: { x, y: 0.12, z: 0 }, b: { x, y: 0.9, z: 0 }, radius: 0.17 },
  ];
}
