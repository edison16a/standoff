import type { RecoilSpec } from "./recoil";

/**
 * The four guns a player can pick. Each wins somewhere and pays for it
 * somewhere else, so the pick shapes how a player fights:
 *
 * The shotgun shreds anything close, even a crowd, but its cone is wide
 * and its pellets fade fast, so far off it barely scratches.
 * The submachine gun sprays a huge magazine and forgives a shaky hand,
 * but light rounds fade with range and bounce off riot vests.
 * The assault rifle hits where you point at any range with a gentle kick,
 * but needs a clean hit or two on the big ones.
 * The AK-47 drops almost anything in one or two rounds and cuts through
 * riot armour, but kicks so hard a held trigger climbs off the target.
 */
export const WEAPON_IDS = ["shotgun", "smg", "rifle", "ak47"] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

/** Full damage out to `full` metres, fading to `floor` of it by `far`. */
export interface RangeSpec {
  full: number;
  far: number;
  floor: number;
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  blurb: string;
  /** Damage of one bullet, or of one pellet for the shotgun, at close range. */
  damage: number;
  pellets: number;
  /** Radius of the cone bullets land in around where the gun points, in radians. */
  spread: number;
  range: RangeSpec;
  recoil: RecoilSpec;
  /** Bullets go through riot armour as if it were not there. */
  pierce: boolean;
  /** Shots per second at most. */
  rate: number;
  magazine: number;
  /** Seconds for a full reload. The shotgun loads shell by shell instead. */
  reload: number;
  /** Holding the trigger keeps firing. */
  auto: boolean;
  style: "magazine" | "shells";
  /** The shotgun's time per shell, after a short start. */
  shell?: number;
}

/** Past every spawn, so these guns hit as hard far off as up close. */
const NO_FALLOFF: RangeSpec = { full: 60, far: 80, floor: 1 };

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    blurb: "Nine pellets in a wide cone. Brutal up close, weak far off.",
    damage: 0.45,
    pellets: 9,
    spread: 0.05,
    range: { full: 9, far: 20, floor: 0.25 },
    // A big kick, but it settles before the pump is racked.
    recoil: { up: 0.07, side: 0.02, settle: 10, max: 0.1 },
    pierce: false,
    rate: 1.7,
    magazine: 8,
    reload: 0.35 + 8 * 0.36,
    auto: false,
    style: "shells",
    shell: 0.36,
  },
  smg: {
    id: "smg",
    name: "Submachine Gun",
    blurb: "Sprays a huge magazine and forgives a shaky hand. Light rounds that fade with range.",
    damage: 0.6,
    pellets: 1,
    spread: 0.022,
    range: { full: 12, far: 26, floor: 0.6 },
    recoil: { up: 0.008, side: 0.01, settle: 22, max: 0.04 },
    pierce: false,
    rate: 13,
    magazine: 42,
    reload: 1.4,
    auto: true,
    style: "magazine",
  },
  rifle: {
    id: "rifle",
    name: "Assault Rifle",
    blurb: "Hits where you point at any range, with a gentle kick.",
    damage: 0.8,
    pellets: 1,
    spread: 0.004,
    range: NO_FALLOFF,
    recoil: { up: 0.011, side: 0.004, settle: 18, max: 0.05 },
    pierce: false,
    rate: 7.5,
    magazine: 30,
    reload: 2.0,
    auto: true,
    style: "magazine",
  },
  ak47: {
    id: "ak47",
    name: "AK-47",
    blurb: "Heavy rounds that punch through armour. Kicks hard, so fire in bursts.",
    damage: 1.6,
    pellets: 1,
    spread: 0.009,
    range: NO_FALLOFF,
    // Slow to settle, so a held trigger walks the gun up off the target.
    recoil: { up: 0.03, side: 0.014, settle: 9, max: 0.11 },
    pierce: true,
    rate: 5.5,
    magazine: 30,
    reload: 2.6,
    auto: true,
    style: "magazine",
  },
};

/** The share of a bullet's damage left after flying this many metres. */
export function falloff(range: RangeSpec, metres: number): number {
  if (metres <= range.full) return 1;
  if (metres >= range.far) return range.floor;
  const t = (metres - range.full) / (range.far - range.full);
  return 1 + (range.floor - 1) * t;
}
