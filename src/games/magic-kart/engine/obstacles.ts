import type { ObstacleDef } from "../tracks/types";
import type { Emit } from "./events";
import type { Kart } from "./kart";
import type { Track } from "./track";
import { DRIVE } from "./tuning";

export interface Obstacle {
  def: ObstacleDef;
  s: number;
  d: number;
  x: number;
  y: number;
  z: number;
  /** Direction the sweep is heading, for crabs and drones to face. */
  moving: number;
}

export function buildObstacles(track: Track): Obstacle[] {
  return track.def.obstacles.map((def) => {
    const s = track.wrap(def.at * track.length);
    const p = track.pointAt(s, def.offset);
    return { def, s, d: def.offset, x: p.x, y: p.y, z: p.z, moving: 0 };
  });
}

/** Moves the sweeping obstacles to where they are at this race time. */
export function placeObstacles(obstacles: Obstacle[], track: Track, time: number): void {
  for (const o of obstacles) {
    const sweep = o.def.sweep;
    if (!sweep) continue;
    const phase = (time / sweep.period) * Math.PI * 2 + (sweep.phase ?? 0);
    o.d = o.def.offset + Math.sin(phase) * sweep.amplitude;
    o.moving = Math.cos(phase);
    const p = track.pointAt(o.s, o.d);
    o.x = p.x;
    o.y = p.y;
    o.z = p.z;
  }
}

/**
 * Round obstacles push karts out like a barrier would. Moving ones also
 * spin the kart out; a kart just put back on the road, or one jumping
 * clear over the top, is left alone.
 */
export function hitObstacles(kart: Kart, obstacles: readonly Obstacle[], emit: Emit, strike: (kart: Kart) => void): void {
  for (const o of obstacles) {
    const dx = kart.x - o.x;
    const dz = kart.z - o.z;
    const reach = o.def.radius + DRIVE.radius;
    const dist = Math.hypot(dx, dz);
    if (dist >= reach || kart.y > o.y + o.def.radius * 1.6 + 0.4) continue;
    const nx = dist > 1e-3 ? dx / dist : 1;
    const nz = dist > 1e-3 ? dz / dist : 0;
    kart.x = o.x + nx * reach;
    kart.z = o.z + nz * reach;
    const into = -(kart.vx * nx + kart.vz * nz);
    if (into > 0) {
      kart.vx += nx * into * 1.5;
      kart.vz += nz * into * 1.5;
      kart.vx *= 0.8;
      kart.vz *= 0.8;
    }
    if (o.def.sweep) strike(kart);
    else if (into > 3) emit({ type: "bump", kart: kart.id, strength: Math.min(1, into / 15) });
  }
}

/** Karts bump each other apart, the heavier one giving less ground. */
export function bumpKarts(karts: readonly Kart[], emit: Emit): void {
  const reach = DRIVE.radius * 2;
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i]!;
      const b = karts[j]!;
      if (Math.abs(a.y - b.y) > 1.6) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= reach || dist < 1e-4) continue;
      const nx = dx / dist;
      const nz = dz / dist;
      const ma = a.stats.weight;
      const mb = b.stats.weight;
      const overlap = reach - dist;
      a.x -= nx * overlap * (mb / (ma + mb));
      a.z -= nz * overlap * (mb / (ma + mb));
      b.x += nx * overlap * (ma / (ma + mb));
      b.z += nz * overlap * (ma / (ma + mb));
      const closing = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (closing >= 0) continue;
      const impulse = (-(1 + 0.5) * closing) / (1 / ma + 1 / mb);
      a.vx -= (impulse / ma) * nx;
      a.vz -= (impulse / ma) * nz;
      b.vx += (impulse / mb) * nx;
      b.vz += (impulse / mb) * nz;
      if (-closing > 4) {
        const strength = Math.min(1, -closing / 14);
        emit({ type: "bump", kart: a.id, strength });
        emit({ type: "bump", kart: b.id, strength });
      }
    }
  }
}
