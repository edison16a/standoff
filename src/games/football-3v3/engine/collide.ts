import { isDown } from "./body";
import { locked, pairMass } from "./linemen";
import type { Match } from "./match";
import { sameTackle } from "./tackle-bind";
import { MOVE } from "./tuning";
import type { Athlete } from "./types";

/** Body radius: a lineman is broad, a support player a little less, a man on the ground is a low heap. */
export const radiusOf = (a: Athlete) =>
  isDown(a) ? MOVE.radius * 0.9 : a.role === "lineman" ? MOVE.radius * 1.3 : a.role === "support" ? MOVE.radius * 1.12 : MOVE.radius;
const radius = radiusOf;

/** A locked lineman moves with his pair, so a runner hitting him meets both men's mass. */
const massOf = (m: Match, a: Athlete) => (locked(m, a) ? pairMass(m, a.slot) : a.mass);

/**
 * Bodies meeting. Overlaps are pushed apart, the heavier player giving
 * less ground, and the momentum along the hit is shared in a hard,
 * sticky collision, so a big man running into a small one carries on
 * and a hit at speed knocks the lighter man back. A big enough jolt
 * shakes a player's footing for a moment. Locked linemen are moved only
 * through their pair, which takes the push. Players on the ground
 * settle against each other into a pile; men on their feet step over
 * them.
 */
export function separate(m: Match, bumpCd: Map<number, number>): void {
  const list = m.athletes;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      if (a.role === "lineman" && b.role === "lineman") continue;
      const downA = isDown(a);
      if (downA !== isDown(b)) continue;
      // The men of one tackle are posed against each other by its preset.
      if (downA && sameTackle(a, b)) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = radius(a) + radius(b);
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d;
      const nz = dz / d;
      const overlap = min - d;
      if (downA) {
        // A pile settles: the bodies ease apart instead of passing through each other.
        a.x -= nx * overlap * 0.15;
        a.z -= nz * overlap * 0.15;
        b.x += nx * overlap * 0.15;
        b.z += nz * overlap * 0.15;
        continue;
      }
      const fixedA = locked(m, a);
      const fixedB = locked(m, b);
      const ma = massOf(m, a);
      const mb = massOf(m, b);
      const shareA = fixedA ? 0 : fixedB ? 1 : mb / (ma + mb);
      a.x -= nx * overlap * shareA;
      a.z -= nz * overlap * shareA;
      b.x += nx * overlap * (1 - shareA);
      b.z += nz * overlap * (1 - shareA);
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (closing <= 0) continue;
      const impulse = (closing * ma * mb) / (ma + mb);
      push(m, a, -nx * impulse, -nz * impulse, ma);
      push(m, b, nx * impulse, nz * impulse, mb);
      const key = i * 64 + j;
      if (closing > 3.5 && (bumpCd.get(key) ?? 0) <= m.time) {
        m.emit({ type: "pads", a: a.id, b: b.id, power: Math.min(1, closing / 8) });
        bumpCd.set(key, m.time + 0.6);
      }
    }
  }
}

/** Applies an impulse to a player, or to a lineman's pair along the field; a big jolt shakes his footing. */
function push(m: Match, a: Athlete, jx: number, jz: number, mass: number): void {
  if (locked(m, a)) {
    const pair = m.lines[a.slot];
    if (pair?.engaged) pair.v += jx / mass;
    return;
  }
  a.vx += jx / mass;
  a.vz += jz / mass;
  const jolt = Math.hypot(jx, jz) / mass;
  if (jolt > MOVE.jolt) a.stagger = Math.max(a.stagger, Math.min(0.6, (jolt - MOVE.jolt) * 0.25 + 0.2));
}
