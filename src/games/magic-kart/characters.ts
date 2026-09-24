/**
 * The four drivers. Each has a kart of their own, built in
 * render/models, and a small lean in how it drives. The differences are
 * a few percent on purpose: enough to feel, never enough to decide a
 * race on its own.
 */

export const CHARACTER_IDS = ["blaze", "pip", "nova", "mochi"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface KartStats {
  /** Multiplies the base top speed. */
  speed: number;
  /** Multiplies how quickly the kart gets up to speed. */
  accel: number;
  /** Multiplies the turn rate. */
  handling: number;
  /** Heavier karts shove lighter ones aside in a bump. */
  weight: number;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** Who they are, in a few words, for the picker. */
  title: string;
  kart: string;
  /** The kart's main paint, also used for its dot when a computer drives it. */
  color: string;
  stats: KartStats;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  blaze: {
    id: "blaze",
    name: "Blaze",
    title: "Speedy fox",
    kart: "Flame Rod",
    color: "#ff5a2c",
    stats: { speed: 1.05, accel: 0.95, handling: 0.95, weight: 1 },
  },
  pip: {
    id: "pip",
    name: "Pip",
    title: "Bouncy frog",
    kart: "Lily Buggy",
    color: "#43c95a",
    stats: { speed: 0.96, accel: 1.1, handling: 1.08, weight: 0.85 },
  },
  nova: {
    id: "nova",
    name: "Nova",
    title: "Space robot",
    kart: "Comet Glider",
    color: "#4aa8ff",
    stats: { speed: 1, accel: 1.02, handling: 1.04, weight: 0.95 },
  },
  mochi: {
    id: "mochi",
    name: "Mochi",
    title: "Big panda",
    kart: "Dumpling Tank",
    color: "#ff7eb6",
    stats: { speed: 1.03, accel: 0.92, handling: 0.94, weight: 1.3 },
  },
};

/** Stat bars on the picker, as 1 to 5 pips. */
export function statPips(value: number): number {
  return Math.max(1, Math.min(5, Math.round(3 + (value - 1) * 25)));
}
