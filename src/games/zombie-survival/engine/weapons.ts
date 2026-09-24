/**
 * The four guns a player can pick. Each one trades damage, speed and
 * handling differently, so the choice shapes how a player fights: the
 * shotgun forgives a shaky aim up close, the rifle rewards a steady one.
 */
export const WEAPON_IDS = ["shotgun", "smg", "rifle", "ak47"] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  blurb: string;
  /** Damage of one bullet, or of one pellet for the shotgun. */
  damage: number;
  pellets: number;
  /** Random cone around the aim, in radians. */
  spread: number;
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

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    blurb: "Pump action. Eight pellets per shot. Brutal up close.",
    damage: 0.5,
    pellets: 8,
    spread: 0.018,
    rate: 1.5,
    magazine: 6,
    reload: 0.35 + 6 * 0.42,
    auto: false,
    style: "shells",
    shell: 0.42,
  },
  smg: {
    id: "smg",
    name: "Submachine Gun",
    blurb: "Sprays fast with a big magazine. Light hits, quick reload.",
    damage: 0.8,
    pellets: 1,
    spread: 0.014,
    rate: 12,
    magazine: 35,
    reload: 1.5,
    auto: true,
    style: "magazine",
  },
  rifle: {
    id: "rifle",
    name: "Assault Rifle",
    blurb: "Accurate and steady. Puts every bullet where you point.",
    damage: 1.15,
    pellets: 1,
    spread: 0.004,
    rate: 8,
    magazine: 30,
    reload: 2.0,
    auto: true,
    style: "magazine",
  },
  ak47: {
    id: "ak47",
    name: "AK-47",
    blurb: "Heavy rounds that punch through armour. Kicks hard.",
    damage: 1.7,
    pellets: 1,
    spread: 0.012,
    rate: 6,
    magazine: 30,
    reload: 2.5,
    auto: true,
    style: "magazine",
  },
};

/** The four bars on the weapon card, each from 0 to 1 across the guns. */
export interface WeaponBars {
  damage: number;
  rate: number;
  magazine: number;
  reload: number;
}

export function weaponBars(id: WeaponId): WeaponBars {
  const all = WEAPON_IDS.map((w) => WEAPONS[w]);
  const spec = WEAPONS[id];
  const perShot = (w: WeaponSpec) => w.damage * w.pellets;
  const scale = (value: number, values: number[]) => Math.min(1, 0.2 + (0.8 * value) / Math.max(...values));
  return {
    damage: scale(perShot(spec), all.map(perShot)),
    rate: scale(spec.rate, all.map((w) => w.rate)),
    magazine: scale(spec.magazine, all.map((w) => w.magazine)),
    // Faster reloads fill more of the bar.
    reload: scale(1 / spec.reload, all.map((w) => 1 / w.reload)),
  };
}

/** Plain numbers for the card, like "8 x 0.45" or "12 per second". */
export function weaponFacts(id: WeaponId): { damage: string; rate: string; magazine: string; reload: string } {
  const w = WEAPONS[id];
  return {
    damage: w.pellets > 1 ? `${w.pellets} x ${w.damage}` : `${w.damage}`,
    rate: `${w.rate} per second`,
    magazine: w.style === "shells" ? `${w.magazine} shells` : `${w.magazine} rounds`,
    reload: w.style === "shells" ? `${w.shell}s per shell` : `${w.reload}s`,
  };
}
