import type { Piece } from "./arena";
import type { BattleEvent, Trace } from "./events";
import { eyeOf, type Fighter } from "./fighter";
import { falloffDamage, type GunSpec } from "./guns";
import { castRay } from "./hit";
import type { Rng } from "./rng";
import { dir3, len } from "./vec";

/** A bullet's angle off the aim, in radians: x to the right, y up. */
export interface Offset {
  x: number;
  y: number;
}

/** A crouched shooter braces, which tightens the cone by this much. */
const CROUCH_STEADY = 0.7;

/** The cone half angle for a shot right now, from the gun, the bloom and the legs. */
export function coneOf(f: Fighter): number {
  const spec = f.gun.spec;
  const moving = Math.min(1, len(f.vel) / spec.speed);
  const cone = spec.spread + f.gun.bloom + spec.moveSpread * moving;
  return cone * (1 - (1 - CROUCH_STEADY) * f.crouch);
}

/**
 * Where each bullet of one shot goes. Pellets spread evenly over a disc
 * so a shotgun blast has a steady pattern with a little jitter, and single
 * bullets wander inside the cone, more often near its middle.
 */
export function pelletOffsets(spec: GunSpec, cone: number, rng: Rng): Offset[] {
  if (spec.pellets === 1) {
    const r = cone * Math.sqrt(rng.next()) * rng.range(0.5, 1);
    const a = rng.next() * Math.PI * 2;
    return [{ x: Math.cos(a) * r, y: Math.sin(a) * r }];
  }
  const out: Offset[] = [];
  const turn = rng.next() * Math.PI * 2;
  for (let i = 0; i < spec.pellets; i++) {
    const r = cone * Math.sqrt((i + 0.5) / spec.pellets) * rng.range(0.85, 1.15);
    const a = turn + i * 2.39996;
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return out;
}

export interface ShotWorld {
  pieces: readonly Piece[];
  fighters: readonly Fighter[];
  rng: Rng;
  now: number;
}

/**
 * One shot from `f` along `aim` (the player's aim plus the kick as it was
 * when the trigger went). Every pellet is cast, damage is summed per
 * fighter so a shotgun blast is one hit, and friendly fire does nothing.
 */
export function resolveShot(f: Fighter, aim: { yaw: number; pitch: number }, cone: number, world: ShotWorld): BattleEvent[] {
  const spec = f.gun.spec;
  const from = eyeOf(f);
  const traces: Trace[] = [];
  const dealt = new Map<number, { damage: number; head: boolean }>();
  for (const off of pelletOffsets(spec, cone, world.rng)) {
    const d = dir3(aim.yaw + off.x, aim.pitch + off.y);
    const hit = castRay(from, d, world.pieces, world.fighters, f.id);
    traces.push(hit.trace);
    if (hit.trace.hit.type !== "fighter") continue;
    const { id, head } = hit.trace.hit;
    const damage = falloffDamage(spec, hit.t) * (head ? spec.head : 1);
    const sum = dealt.get(id) ?? { damage: 0, head: false };
    dealt.set(id, { damage: sum.damage + damage, head: sum.head || head });
  }
  f.shotAt = world.now;
  const events: BattleEvent[] = [{ type: "shot", shooter: f.id, gun: f.gun.id, from, traces }];
  for (const [id, hit] of dealt) {
    const target = world.fighters.find((o) => o.id === id);
    if (!target || !target.alive || target.team === f.team) continue;
    const damage = Math.min(target.health, Math.round(hit.damage));
    target.health -= damage;
    target.hitAt = world.now;
    f.damage += damage;
    if (hit.head) f.headshots += 1;
    events.push({ type: "hit", shooter: f.id, target: id, damage, head: hit.head, health: target.health });
    if (target.health <= 0) {
      target.alive = false;
      target.diedAt = world.now;
      target.deaths += 1;
      target.trigger.held = false;
      f.kills += 1;
      events.push({ type: "kill", killer: f.id, victim: id, gun: f.gun.id, head: hit.head });
    }
  }
  return events;
}
