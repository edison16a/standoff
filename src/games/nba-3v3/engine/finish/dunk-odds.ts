import type { Rng } from "../rng";
import { clamp } from "../vec";
import type { Spot } from "./approach";

/**
 * Whether a dunk goes down, decided before the gather so the fail can
 * be a hand made animation rather than a physics accident. A dunk from
 * a good spot (in range, at speed, square to the rim, on balance, with
 * nobody bigger waiting) almost always lands. From a bad one it fails
 * in one of three ways:
 *
 * - `stuff`: the man at the rim meets the ball on the way down and
 *   throws it back out.
 * - `clang`: up there, but the slam catches the iron and kicks out.
 * - `short`: left the floor too far out, or cannot get up there, and
 *   the ball meets the front of the ring from below.
 */
export type DunkFail = "stuff" | "clang" | "short";

/** The man who can meet the dunk at the rim. */
export interface Stopper {
  dist: number;
  spot: Spot;
  /** Already in the air: he will be on his way down by the slam. */
  up: boolean;
  /** The dunker's strength minus his. */
  edge: number;
  /** His reach past an average man's, metres. */
  reach: number;
  /** His defence rating, 1 to 10. */
  defence: number;
}

export interface DunkRead {
  distance: number;
  speed: number;
  /** How square the run is to the rim, -1 away to 1 straight at it. */
  heading: number;
  /** 0 balanced to 1 stumbling: just landed, or a foot planted hard in a cut. */
  offBalance: number;
  /** The dunk rating, 1 to 10 (see `dunkRating`). */
  rating: number;
  /** Whether the body can get the ball over the ring at all. */
  canDunk: boolean;
  stopper: Stopper | null;
}

export interface DunkOdds {
  make: number;
  stuff: number;
  clang: number;
  short: number;
}

export const DUNK_ODDS = {
  /** Past this far out the last step cannot carry him to the rim. */
  reach: 3.4,
  /** Metres past `reach` that make coming up short certain. */
  shortSpan: 1.2,
  /** Slower than this a dunk is from a standstill. */
  standing: 1.5,
  /** A man this close at the rim can stuff it; nobody past `far`. */
  near: 0.9,
  far: 2.2,
} as const;

/** The dunk rating: spring and strength, and the reach to get over the ring with room. */
export function dunkRating(speed: number, strength: number, headroom: number): number {
  return clamp((speed + strength) / 2 + headroom * 4, 1, 10);
}

export function dunkOdds(r: DunkRead): DunkOdds {
  const far = clamp((r.distance - DUNK_ODDS.reach) / DUNK_ODDS.shortSpan, 0, 1);
  const short = r.canDunk ? far : Math.max(far, 0.9);
  // The iron: a little for anyone, more for a weak dunker, from a standstill out from the rim, on a slant or off balance.
  const still = clamp((DUNK_ODDS.standing - r.speed) / DUNK_ODDS.standing, 0, 1) * clamp((r.distance - 0.9) / 1.2, 0, 1);
  // Running away or across is worse from out; right under, the gather step turns him to it.
  const slant = Math.max(0, 0.35 - r.heading) * 0.45 * clamp((r.distance - 0.8) / 1.2, 0, 1);
  const clang = clamp(0.015 + (10 - r.rating) * 0.01 + still * Math.max(0.12, 0.55 - r.rating * 0.04) + slant + r.offBalance * 0.3, 0, 0.9);
  const stuff = stuffChance(r.stopper);
  const rest = 1 - short;
  return { make: rest * (1 - stuff) * (1 - clang), stuff: rest * stuff, clang: rest * (1 - stuff) * clang, short };
}

/** A bigger, longer man waiting at the rim stuffs it; one the dunker overpowers gets posterized instead. */
function stuffChance(s: Stopper | null): number {
  if (!s || s.up || s.dist > DUNK_ODDS.far) return 0;
  const close = clamp((DUNK_ODDS.far - s.dist) / (DUNK_ODDS.far - DUNK_ODDS.near), 0, 1);
  const where = s.spot === "rim" || s.spot === "path" ? 1 : s.spot === "trail" ? 0.25 : 0.6;
  // Strength decides who wins at the rim: a man the dunker overpowers by three or more is posterized, not a stopper.
  const size = clamp(1 - s.edge * 0.28 + s.reach * 0.7 + (s.defence - 7) * 0.05, 0.02, 1.5);
  return clamp(0.5 * close * where * size, 0, 0.85);
}

/** Rolls the odds: null when it goes down, else how it fails. */
export function rollDunk(rng: Rng, odds: DunkOdds): DunkFail | null {
  let u = rng();
  if ((u -= odds.short) < 0) return "short";
  if ((u -= odds.stuff) < 0) return "stuff";
  if ((u -= odds.clang) < 0) return "clang";
  return null;
}
