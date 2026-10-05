import { BUILDS } from "../builds";
import type { Athlete } from "./athlete-types";
import { MOVE } from "./tuning";

/**
 * Bodies meeting: shoulder to shoulder, a man running into another. Each
 * player has the mass of his build, braced by his strength, and when two
 * meet the push between them follows their momentum: the heavier,
 * stronger, quicker man moves the other more and is moved less, and a
 * light man running into a big one bounces off him.
 */
export const CONTACT = {
  /** How springy two bodies are against each other. */
  restitution: 0.12,
  /** A hard shove, as a change in speed in m/s, that unsettles a man on the ball. */
  shove: 1.4,
} as const;

/** A build's body mass in kg, from its height and frame: a slight 1.72 m playmaker about 65, a 1.9 m centre back over 90. */
export function bodyMass(a: Pick<Athlete, "build">): number {
  const look = BUILDS[a.build].look;
  return 22 * look.height * look.height * (0.85 + 0.35 * look.build);
}

/** Mass braced by strength: a strong man leans into a challenge and is harder to move. */
export function bracedMass(a: Pick<Athlete, "build" | "attrs">): number {
  return bodyMass(a) * (0.7 + 0.6 * a.attrs.strength);
}

/** Whether a body is upright and in the way: not sliding along the turf or lying on it. */
function upright(a: Athlete): boolean {
  return a.action !== "slide" && a.action !== "getup" && a.action !== "stumble";
}

/**
 * Resolves every pair of bodies that overlap: they are pushed apart by
 * their masses, and if they were closing on each other an impulse along
 * the line between them trades their momentum. Returns the hardest shove
 * each player took this step, as a change in speed, for the dribble.
 */
export function collideBodies(athletes: readonly Athlete[]): Map<number, number> {
  const shoves = new Map<number, number>();
  const space = MOVE.personalSpace;
  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a = athletes[i]!;
      const b = athletes[j]!;
      if (!upright(a) || !upright(b)) continue;
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= space || d < 1e-6) continue;
      const nx = dx / d;
      const nz = dz / d;
      const ia = 1 / bracedMass(a);
      const ib = 1 / bracedMass(b);
      // Out of each other, the lighter man moved further.
      const overlap = space - d;
      a.pos.x -= nx * overlap * (ia / (ia + ib));
      a.pos.z -= nz * overlap * (ia / (ia + ib));
      b.pos.x += nx * overlap * (ib / (ia + ib));
      b.pos.z += nz * overlap * (ib / (ia + ib));
      const closing = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
      if (closing >= 0) continue;
      const j2 = (-(1 + CONTACT.restitution) * closing) / (ia + ib);
      a.vel.x -= j2 * ia * nx;
      a.vel.z -= j2 * ia * nz;
      b.vel.x += j2 * ib * nx;
      b.vel.z += j2 * ib * nz;
      shoves.set(a.id, Math.max(shoves.get(a.id) ?? 0, j2 * ia));
      shoves.set(b.id, Math.max(shoves.get(b.id) ?? 0, j2 * ib));
    }
  }
  return shoves;
}
