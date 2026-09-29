import { isDown } from "./body";
import type { Match } from "./match";
import { MOVE } from "./tuning";
import type { Athlete } from "./types";

const radius = (a: Athlete) => (a.role === "lineman" ? MOVE.radius * 1.3 : MOVE.radius);

/**
 * Pushes overlapping players apart by momentum: the heavier player gives
 * less ground. Linemen locked at the line do not move at all, so runners
 * go round them. Players on the ground are stepped over.
 */
export function separate(m: Match, bumpCd: Map<number, number>): void {
  const list = m.athletes;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      if (a.role === "lineman" && b.role === "lineman") continue;
      if (isDown(a) || isDown(b)) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = radius(a) + radius(b);
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d;
      const nz = dz / d;
      const overlap = min - d;
      const fixedA = a.role === "lineman";
      const fixedB = b.role === "lineman";
      const shareA = fixedA ? 0 : fixedB ? 1 : b.mass / (a.mass + b.mass);
      a.x -= nx * overlap * shareA;
      a.z -= nz * overlap * shareA;
      b.x += nx * overlap * (1 - shareA);
      b.z += nz * overlap * (1 - shareA);
      // Momentum along the hit is shared out, so a big man running into a small one carries on.
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (closing <= 0) continue;
      const total = (fixedA ? 1e6 : a.mass) + (fixedB ? 1e6 : b.mass);
      const ja = fixedA ? 0 : (closing * (fixedB ? 1e6 : b.mass)) / total;
      const jb = fixedB ? 0 : (closing * (fixedA ? 1e6 : a.mass)) / total;
      a.vx -= nx * ja;
      a.vz -= nz * ja;
      b.vx += nx * jb;
      b.vz += nz * jb;
      const key = i * 64 + j;
      if (closing > 3.5 && (bumpCd.get(key) ?? 0) <= m.time) {
        m.emit({ type: "pads", a: a.id, b: b.id, power: Math.min(1, closing / 8) });
        bumpCd.set(key, m.time + 0.6);
      }
    }
  }
}
