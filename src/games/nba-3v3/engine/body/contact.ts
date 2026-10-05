import type { Athlete } from "../types";
import { CONTACT } from "./body-spec";
import { contactMass } from "./mass";

export interface BodyHit {
  /** How fast the two were closing along the line between them, metres a second. */
  closing: number;
  /** The change of speed each one took. */
  dvA: number;
  dvB: number;
}

/**
 * Two bodies that overlap: pushed apart by weight, and if they were
 * running into each other, a real exchange of momentum along the line
 * between them. A set, braced player is hard to move, so a guard who
 * runs into a big man's screen stops dead and the big man barely
 * gives; two players brushing past each other rub off a little of the
 * sideways speed. Returns null when they do not touch.
 */
export function collide(a: Athlete, b: Athlete, ra: number, rb: number): BodyHit | null {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = ra + rb;
  if (d >= min || d < 1e-6) return null;
  const ma = contactMass(a);
  const mb = contactMass(b);
  const nx = dx / d;
  const nz = dz / d;
  // The lighter body gives the ground.
  const overlap = min - d;
  const shareA = mb / (ma + mb);
  a.x -= nx * overlap * shareA;
  a.z -= nz * overlap * shareA;
  b.x += nx * overlap * (1 - shareA);
  b.z += nz * overlap * (1 - shareA);
  const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (closing <= 0) return { closing: 0, dvA: 0, dvB: 0 };
  const reduced = 1 / (1 / ma + 1 / mb);
  const j = (1 + CONTACT.restitution) * closing * reduced;
  // Sliding past each other: friction on the sideways part, at most a share of the push.
  const tx = -nz;
  const tz = nx;
  const slip = (a.vx - b.vx) * tx + (a.vz - b.vz) * tz;
  const jt = Math.max(-CONTACT.friction * j, Math.min(CONTACT.friction * j, slip * reduced));
  a.vx -= (nx * j + tx * jt) / ma;
  a.vz -= (nz * j + tz * jt) / ma;
  b.vx += (nx * j + tx * jt) / mb;
  b.vz += (nz * j + tz * jt) / mb;
  return { closing, dvA: Math.hypot(j, jt) / ma, dvB: Math.hypot(j, jt) / mb };
}
