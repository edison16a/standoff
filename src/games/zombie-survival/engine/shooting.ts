import type { Encounter } from "./encounter";
import type { GameEvent } from "./events";
import type { Offset } from "./recoil";
import type { Member } from "./squad";
import { recordShot } from "./stats";
import { falloff, type WeaponSpec } from "./weapons";
import { hitZombie } from "./zombie";
import { isBoss, type HitPart } from "./zombie-kinds";

export type { Offset } from "./recoil";

/** Shotgun pellets that land on a weak point count this many times over. */
export const WEAK_PELLET_BONUS = 2.5;

/** What one bullet or pellet struck, as the renderer's raycast found it. */
export interface PelletHit {
  zombie: number;
  part: HitPart;
  /** Index into the kind's weak points, for weak point hits. */
  weak: number | null;
}

/** Finds what each bullet hits, one answer per offset from the aim, null for a miss. */
export type CastFn = (offsets: readonly Offset[]) => readonly (PelletHit | null)[];

/**
 * Where each bullet of one shot goes, around where the gun points.
 * Pellets spread evenly over a disc so a shotgun blast has a steady
 * pattern with a little jitter, and single bullets wander inside the
 * gun's small cone.
 */
export function pelletOffsets(spec: WeaponSpec, random: () => number): Offset[] {
  if (spec.pellets === 1) {
    const r = spec.spread * Math.sqrt(random());
    const a = random() * Math.PI * 2;
    return [{ x: Math.cos(a) * r, y: Math.sin(a) * r }];
  }
  const out: Offset[] = [];
  const turn = random() * Math.PI * 2;
  for (let i = 0; i < spec.pellets; i++) {
    // A sunflower pattern: even coverage, no clumps, no holes in the middle. None strays past the cone, which the crosshair's ring shows.
    const r = Math.min(spec.spread, spec.spread * Math.sqrt((i + 0.5) / spec.pellets) * (0.85 + random() * 0.3));
    const a = turn + i * 2.39996;
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return out;
}

/** Damage of one bullet or pellet from this gun at this range and on this part. */
export function bulletDamage(spec: WeaponSpec, part: HitPart, metres: number): number {
  // Buckshot tears a weak point open: each pellet there counts for more, or the shotgun could never drop a boss.
  const bonus = part === "weak" && spec.pellets > 1 ? WEAK_PELLET_BONUS : 1;
  return spec.damage * bonus * falloff(spec.range, metres);
}

/**
 * Applies one shot's bullets to the fight, keeping the shooter's stats.
 * The shot leaves where the gun points now, the player's aim plus any
 * kick still in it, and then kicks the gun again.
 * `scored` is false between fights, where shooting the scenery should not cost anyone their accuracy.
 */
export function resolveShot(member: Member, encounter: Encounter | null, cast: CastFn, random: () => number, scored = true): GameEvent[] {
  const { seat, stats, gun } = member;
  const events: GameEvent[] = [];
  const kick = gun.recoil.offset;
  const hits = cast(pelletOffsets(gun.spec, random).map((o) => ({ x: o.x + kick.x, y: o.y + kick.y })));
  gun.recoil.kick(random);
  let struck = false;
  let headThisShot = false;
  for (const hit of hits) {
    const z = hit && encounter?.find(hit.zombie);
    if (!hit || !z || z.state === "dead") continue;
    struck = true;
    const result = hitZombie(z, hit.part, hit.weak, bulletDamage(gun.spec, hit.part, z.ahead), gun.spec.pierce);
    stats.damage += result.damage;
    if (hit.part === "weak" && result.damage > 0) stats.weakHits += 1;
    if (hit.part === "head" && result.damage > 0 && !headThisShot) {
      headThisShot = true;
      stats.headshots += 1;
    }
    events.push({ type: "hit", seat, zombie: z.id, kind: z.kind, part: hit.part, weak: hit.weak, blocked: result.blocked, damage: result.damage, killed: result.killed });
    if (result.broke !== null) {
      events.push({ type: "weak-broken", seat, zombie: z.id, weak: result.broke, left: z.weak.filter((hp) => hp > 0).length });
    }
    if (result.killed) {
      if (z.death) z.death.seat = seat;
      stats.kills += 1;
      if (isBoss(z.kind)) stats.bossKills += 1;
      events.push({ type: "kill", seat, zombie: z.id, kind: z.kind, head: hit.part === "head" });
    }
  }
  if (scored) recordShot(stats, struck);
  return events;
}
