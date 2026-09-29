import { airborne, buildOf } from "./athlete";
import { readEdge } from "./build-effects";
import type { Match } from "./match";
import type { Action, Athlete, DribbleMove } from "./types";
import { clamp, dist2, type V2 } from "./vec";

type Move = Extract<Action, { kind: "move" }>;

/**
 * What a dribble move does to the defender it beats. Play testers
 * wanted jukes to matter, so every beat leaves the defender stunned for
 * a visible moment, and a hard one sends him staggering the wrong way.
 */
export const JUKE = {
  /** Base chance each move beats a defender who stays home. */
  beat: { stepback: 0.58, crossover: 0.62, spin: 0.58, hesitation: 0.52, behindBack: 0.5 } satisfies Record<DribbleMove, number>,
  /** Share of beats that are hard, before a bite on a reach adds to it. */
  hard: 0.45,
  /** How long the stumble lasts, in seconds, and how long he stays slow after. */
  hardStun: 0.95,
  softStun: 0.5,
  hardSlow: 0.9,
  softSlow: 0.55,
  /** How fast the beaten defender is thrown the wrong way, in metres a second. */
  hardShove: 2.6,
  softShove: 1.4,
  maxChance: 0.9,
} as const;

/** The chance this move beats this defender now. */
export function jukeChance(a: Athlete, d: Athlete, act: Move, bit: number): number {
  const ds = buildOf(d).stats;
  const hs = buildOf(a).stats;
  // A defender lunging at the ball handler is easy to go by, unless the move is a stepback away from him.
  const toward = (d.vx * (a.x - d.x) + d.vz * (a.z - d.z)) / Math.max(0.3, dist2(a, d));
  const lunging = toward > 2 && act.move !== "stepback" ? 0.12 : 0;
  const tired = Math.max(0, a.moveHeat - 1) * 0.1;
  return clamp(JUKE.beat[act.move] + (hs.speed - ds.speed) * 0.035 - readEdge(ds.defence) + bit + lunging - tired, 0.05, JUKE.maxChance);
}

/** Whether a defender can be beaten at all: not in the air and not already stumbling. */
export function canBeJuked(d: Athlete): boolean {
  return !airborne(d) && d.action.kind !== "stumble";
}

/** The beaten defender stumbles, slides the wrong way and stays slow a beat. */
export function stun(d: Athlete, act: Move, hard: boolean): void {
  const away = wrongWay(act);
  const shove = hard ? JUKE.hardShove : JUKE.softShove;
  d.vx = away.x * shove;
  d.vz = away.z * shove;
  d.action = { kind: "stumble", t: 0, dur: hard ? JUKE.hardStun : JUKE.softStun };
  d.whiff = Math.max(d.whiff, hard ? JUKE.hardSlow : JUKE.softSlow);
}

/** He bit on the fake: across from a sideways move, off to the side of one that goes straight by. */
export function wrongWay(act: Move): V2 {
  const forward = act.move === "spin" || act.move === "hesitation";
  if (!forward) return { x: -act.dir.x, z: -act.dir.z };
  const s = -act.side;
  return { x: -act.dir.z * s, z: act.dir.x * s };
}

/** Checks one move against the defender and applies the result. */
export function tryJuke(m: Match, a: Athlete, d: Athlete, act: Move): void {
  if (!canBeJuked(d)) return;
  const bit = d.action.kind === "steal" || d.whiff > 0 ? 0.3 : 0;
  if (m.rng() >= jukeChance(a, d, act, bit)) return;
  const hard = m.rng() < JUKE.hard + bit;
  stun(d, act, hard);
  m.emit({ type: "shake", id: a.id, victim: d.id, hard });
}
