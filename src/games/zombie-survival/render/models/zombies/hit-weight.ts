import type { WeaponId } from "../../../engine/weapons";
import { isBoss, isMiniBoss, type HitPart, type ZombieKind } from "../../../engine/zombie-kinds";

/**
 * How hard one bullet of each gun shoves what it hits, on a scale where
 * an AK round is 1. The 7.62 round carries the most energy of the lot.
 * A single buckshot pellet is lighter, but nine land together, so the
 * shotgun hits hardest of all up close. A 9 mm round barely rocks a body.
 */
export const PUNCH: Record<WeaponId, number> = { ak47: 1, rifle: 0.55, smg: 0.32, shotgun: 0.3 };

/** A limb hit spins the body less than a hit to its middle. */
const PART: Record<HitPart, number> = { head: 1, body: 1, limb: 0.6, weak: 0.8 };

/** How much a zombie resists being shoved, with a walker as 1. Bosses barely rock. */
export function heft(kind: ZombieKind): number {
  if (isMiniBoss(kind)) return 2.6;
  if (isBoss(kind)) return 5;
  if (kind === "brute") return 2;
  if (kind === "armored") return 1.3;
  return kind === "runner" ? 0.9 : 1;
}

/**
 * The weight of one hit's reaction: the gun's punch, where it struck and
 * how heavy the target is. A blow the riot vest stopped still rocks the
 * zombie, but less.
 */
export function hitWeight(weapon: WeaponId, part: HitPart, kind: ZombieKind, blocked: boolean): number {
  return (PUNCH[weapon] * PART[part] * (blocked ? 0.45 : 1)) / heft(kind);
}
