import type { Kart } from "./kart";
import type { Track } from "./track";

export type ThrownKind = "orb" | "ice";

export interface Projectile {
  id: number;
  kind: ThrownKind;
  owner: number;
  /** The kart it is chasing, or null to fly straight down the track. */
  target: number | null;
  /** 1 flies with the race, -1 back down the track at a kart behind. */
  dir: 1 | -1;
  s: number;
  d: number;
  x: number;
  y: number;
  z: number;
  /** Direction of flight on the ground, for the model. */
  heading: number;
  age: number;
  alive: boolean;
}

/** Faster than a boosting kart, so a throw always catches up. */
const SPEED: Record<ThrownKind, number> = { orb: 42, ice: 50 };
const LIFE = 7;
const HIT_RADIUS = 1.7;
/** Closer than this along the track, it stops following the road and flies straight at the target. */
const HOMING_RANGE = 16;
const HOVER = 0.9;

/** The kart just ahead in the race that a throw can see: not vanished and still racing. */
export function nearestAhead(user: Kart, karts: readonly Kart[]): Kart | null {
  let best: Kart | null = null;
  for (const kart of karts) {
    if (kart === user || kart.timers.ghost > 0 || kart.race.finished) continue;
    const gap = kart.race.progress - user.race.progress;
    if (gap > 0 && (!best || gap < best.race.progress - user.race.progress)) best = kart;
  }
  return best;
}

export function nearestBehind(user: Kart, karts: readonly Kart[]): Kart | null {
  let best: Kart | null = null;
  for (const kart of karts) {
    if (kart === user || kart.timers.ghost > 0 || kart.race.finished) continue;
    const gap = user.race.progress - kart.race.progress;
    if (gap > 0 && (!best || gap < user.race.progress - best.race.progress)) best = kart;
  }
  return best;
}

export function launch(id: number, kind: ThrownKind, owner: Kart, target: Kart | null, track: Track): Projectile {
  const dir: 1 | -1 = target && target.race.progress < owner.race.progress ? -1 : 1;
  const s = track.wrap(owner.loc.s + dir * 2.5);
  const p = track.pointAt(s, owner.loc.d);
  return {
    id, kind, owner: owner.id, target: target?.id ?? null, dir, s, d: owner.loc.d,
    x: p.x, y: Math.max(p.y, owner.y) + HOVER, z: p.z, heading: owner.heading, age: 0, alive: true,
  };
}

/**
 * Moves a throw one step and returns the kart it struck, if any. It
 * follows the road like a kart would, drifting toward the target's lane,
 * and only cuts straight across once close. That way it never flies
 * through a barrier or across the infield.
 */
export function stepProjectile(p: Projectile, karts: readonly Kart[], track: Track, dt: number): Kart | null {
  p.age += dt;
  if (p.age > LIFE) p.alive = false;
  if (!p.alive) return null;
  const target = p.target !== null ? karts[p.target] : undefined;
  // A kart that vanishes or finishes shakes the throw off. It carries on down the road.
  if (target && (target.timers.ghost > 0 || target.race.finished)) p.target = null;
  const chasing = p.target !== null ? target : undefined;
  const speed = SPEED[p.kind];
  const gap = chasing ? track.forward(p.s, chasing.loc.s) * p.dir : Infinity;

  if (chasing && gap < HOMING_RANGE && gap > -8) {
    const dx = chasing.x - p.x;
    const dz = chasing.z - p.z;
    const dy = chasing.y + 0.6 - p.y;
    const dist = Math.hypot(dx, dz, dy) || 1;
    const step = Math.min(dist, speed * dt);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.z += (dz / dist) * step;
    p.heading = Math.atan2(dx, dz);
    const loc = track.locate(p.x, p.z, track.indexAt(p.s));
    p.s = loc.s;
    p.d = loc.d;
  } else {
    p.s = track.wrap(p.s + p.dir * speed * dt);
    const lane = chasing ? chasing.loc.d : p.d;
    p.d += Math.max(-8 * dt, Math.min(8 * dt, lane - p.d));
    const f = track.frameAt(p.s);
    const pos = track.pointAt(p.s, p.d);
    p.x = pos.x;
    p.z = pos.z;
    p.y = f.y + track.rampHeight(p.s) + HOVER;
    p.heading = Math.atan2(f.tx * p.dir, f.tz * p.dir);
  }

  for (const kart of karts) {
    if (kart.id === p.owner && p.age < 1.5) continue;
    if (Math.hypot(kart.x - p.x, kart.z - p.z) < HIT_RADIUS && Math.abs(kart.y + 0.6 - p.y) < 2) {
      p.alive = false;
      return kart;
    }
  }
  return null;
}
