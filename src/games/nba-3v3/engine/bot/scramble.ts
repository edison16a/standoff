import { standingReach } from "../athlete";
import { RIM_SPOT } from "../court";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";
import { goTo } from "./util";

/**
 * Where a ball in the air or on the floor is worth chasing: for a shot
 * in flight, the likely rebound spot a couple of metres off the rim on
 * the far side; for a loose ball, a little ahead of where it rolls.
 */
export function chaseSpot(m: Match): V2 {
  const b = m.ball;
  if (b.mode === "flight" && (b.flightKind === "shot" || b.flightKind === "dunk")) {
    const shooter = b.shot ? m.athletes[b.shot.shooter] : null;
    const dx = shooter ? RIM_SPOT.x - shooter.x : 0;
    const dz = shooter ? RIM_SPOT.z - shooter.z : -1;
    const d = Math.hypot(dx, dz) || 1;
    return { x: RIM_SPOT.x + (dx / d) * 0.6, z: Math.max(0.8, RIM_SPOT.z + 1.6 + (dz / d) * 0.4) };
  }
  return { x: b.pos.x + b.vel.x * 0.35, z: b.pos.z + b.vel.z * 0.35 };
}

/**
 * Rebounds and loose balls: the two nearest from each team crash toward
 * the ball and jump for it when it comes down within reach; the rest
 * hold their ground so nobody leaves the floor empty.
 */
export function thinkScramble(m: Match, a: Athlete): void {
  const spot = chaseSpot(m);
  const side = m.athletes.filter((o) => o.team === a.team).sort((p, q) => dist2(p, spot) - dist2(q, spot));
  const rank = side.indexOf(a);
  if (rank > 1) {
    goTo(a, { x: a.x * 0.9, z: Math.max(a.z, 6.5) }, 0.5);
    return;
  }
  goTo(a, spot, 1);
  const b = m.ball;
  const near = Math.hypot(b.pos.x - a.x, b.pos.z - a.z) < 1.1;
  const reach = standingReach(a);
  if (near && b.vel.y < 0 && b.pos.y > reach - 0.1 && b.pos.y < reach + 0.9) m.press(a.id, "defend");
}
