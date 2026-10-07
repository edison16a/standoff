import type { Entry as MatchEntry } from "../engine/match-options";
import type { Athlete } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";

/**
 * Who plays in the trailer's films. The Playmaker, the Dunker and the
 * Shooter are the team that wins the trophy; the Lockdown defender, the
 * Big Man and the All Rounder are the men they beat.
 */
export const CAST = { playmaker: 0, dunker: 1, shooter: 2, lockdown: 3, big: 4, allround: 5 } as const;

export const TRAILER_LINEUP: readonly MatchEntry[] = [
  { team: 0, build: "playmaker", seat: null },
  { team: 0, build: "dunker", seat: null },
  { team: 0, build: "shooter", seat: null },
  { team: 1, build: "lockdown", seat: null },
  { team: 1, build: "big", seat: null },
  { team: 1, build: "allround", seat: null },
];

/** The stick pushed toward a spot, at a share of full speed, and let go once he is there. */
export function toward(a: Athlete, spot: V2, pace: number, stopWithin = 0.15): V2 {
  if (Math.hypot(a.x - spot.x, a.z - spot.z) < stopWithin) return { x: 0, z: 0 };
  const d = dir2(a, spot);
  return { x: d.x * pace, z: d.z * pace };
}
