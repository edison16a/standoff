/**
 * The four guns. Each trades damage, speed and handling differently, and
 * each makes its fighter play a different game: the rifle and sniper hold
 * long lanes, the SMG roams mid range, the shotgun flanks in close.
 */
export const GUN_IDS = ["rifle", "shotgun", "smg", "sniper"] as const;
export type GunId = (typeof GUN_IDS)[number];

export interface RecoilSpec {
  /** Radians the aim climbs per shot. */
  pitch: number;
  /** Radians of sideways kick per shot, left or right. */
  yaw: number;
  /** How fast the kick settles, per second (exponential). */
  recover: number;
  /** The most the climb can build up to, in radians. */
  max: number;
}

export interface GunSpec {
  id: GunId;
  name: string;
  blurb: string;
  /** Damage of one bullet, or of one pellet for the shotgun, before falloff. */
  damage: number;
  pellets: number;
  /** Shots per second at most. */
  rate: number;
  /** Holding the trigger keeps firing. The others fire once per pull. */
  auto: boolean;
  magazine: number;
  /** Seconds for a full magazine reload. */
  reload: number;
  /** The shotgun loads shell by shell: seconds per shell after a short start. */
  shell: number | null;
  /** Random cone half angle in radians when still. */
  spread: number;
  /** Extra cone while the fighter is running. */
  moveSpread: number;
  /** Cone added per shot, which settles at the recoil rate. */
  bloom: number;
  /** Full damage up to `start` metres, easing down to `min` of it by `end`. */
  falloff: { start: number; end: number; min: number };
  head: number;
  recoil: RecoilSpec;
  /** Running speed with this gun in hand, metres per second. */
  speed: number;
}

export const GUNS: Record<GunId, GunSpec> = {
  rifle: {
    id: "rifle",
    name: "Assault Rifle",
    blurb: "Steady and accurate. Holds the long lanes.",
    damage: 20,
    pellets: 1,
    rate: 8.5,
    auto: true,
    magazine: 30,
    reload: 2.2,
    shell: null,
    spread: 0.006,
    moveSpread: 0.03,
    bloom: 0.004,
    falloff: { start: 28, end: 60, min: 0.7 },
    head: 2,
    recoil: { pitch: 0.016, yaw: 0.007, recover: 5, max: 0.12 },
    speed: 4.9,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    blurb: "Ten pellets a shot. Flanks in and ends fights up close.",
    damage: 11,
    pellets: 10,
    rate: 1.2,
    auto: false,
    magazine: 6,
    reload: 0.4 + 6 * 0.45,
    shell: 0.45,
    spread: 0.075,
    moveSpread: 0.02,
    bloom: 0,
    falloff: { start: 7, end: 22, min: 0.2 },
    head: 1.4,
    recoil: { pitch: 0.09, yaw: 0.02, recover: 3.5, max: 0.14 },
    speed: 5.4,
  },
  smg: {
    id: "smg",
    name: "SMG",
    blurb: "Sprays fast and moves the most. Deadly at mid range.",
    damage: 14,
    pellets: 1,
    rate: 13,
    auto: true,
    magazine: 32,
    reload: 1.7,
    shell: null,
    spread: 0.016,
    moveSpread: 0.018,
    bloom: 0.003,
    falloff: { start: 12, end: 34, min: 0.45 },
    head: 1.6,
    recoil: { pitch: 0.01, yaw: 0.011, recover: 7, max: 0.1 },
    speed: 5.8,
  },
  sniper: {
    id: "sniper",
    name: "Sniper",
    blurb: "One shot to the head ends it. Slow bolt, huge kick.",
    damage: 85,
    pellets: 1,
    rate: 0.75,
    auto: false,
    magazine: 5,
    reload: 3,
    shell: null,
    spread: 0.001,
    moveSpread: 0.07,
    bloom: 0,
    falloff: { start: 80, end: 120, min: 1 },
    head: 2.2,
    recoil: { pitch: 0.12, yaw: 0.015, recover: 2.8, max: 0.16 },
    speed: 4.5,
  },
};

/** Damage of one bullet or pellet at a distance, before the head multiplier. */
export function falloffDamage(spec: GunSpec, distance: number): number {
  const { start, end, min } = spec.falloff;
  if (distance <= start) return spec.damage;
  const t = Math.min(1, (distance - start) / Math.max(0.001, end - start));
  return spec.damage * (1 - (1 - min) * t);
}

/** The bars on the phone's gun card, each from 0 to 1 across the guns. */
export function gunBars(id: GunId): { damage: number; rate: number; magazine: number; range: number } {
  const all = GUN_IDS.map((g) => GUNS[g]);
  const spec = GUNS[id];
  const perShot = (g: GunSpec) => g.damage * g.pellets;
  const scale = (value: number, values: number[]) => Math.min(1, 0.15 + (0.85 * value) / Math.max(...values));
  return {
    damage: scale(perShot(spec), all.map(perShot)),
    rate: scale(spec.rate, all.map((g) => g.rate)),
    magazine: scale(spec.magazine, all.map((g) => g.magazine)),
    range: scale(spec.falloff.start, all.map((g) => g.falloff.start)),
  };
}
