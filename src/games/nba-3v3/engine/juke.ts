import { airborne, buildOf } from "./athlete";
import { readEdge } from "./build-effects";
import type { Match } from "./match";
import { reactFor, SHAKE_TIME, shakeVelocity, turnSide } from "./shake";
import type { Action, Athlete, DribbleMove } from "./types";
import { clamp, dist2 } from "./vec";

export { wrongWay } from "./shake";

type Move = Extract<Action, { kind: "move" }>;

/**
 * What a dribble move does to the defender it beats. Play testers
 * wanted jukes to matter, so every beat leaves the defender stunned for
 * a visible moment, and a hard one sends him staggering the wrong way.
 * They later found a stepback beat anyone, so a defender who stays home
 * now holds most of the time: a move wins on timing, against a man who
 * reached, bit or came flying in, as in NBA 2K.
 */
export const JUKE = {
  /** Base chance each move beats a defender who stays home. */
  beat: { stepback: 0.24, crossover: 0.48, spin: 0.46, hesitation: 0.42, behindBack: 0.4, betweenLegs: 0.4 } satisfies Record<DribbleMove, number>,
  /** Added when he bit (reached or still off balance): a stepback off a man who bit is the counter, so it gains most. */
  bit: 0.3,
  stepbackBit: 0.42,
  /** Added when he comes flying at the handler: easy to go by, and a stepback leaves him lunging at air. */
  lunge: 0.12,
  stepbackLunge: 0.3,
  /**
   * Share of beats that are hard, before a bite on a reach adds to it.
   * A hard cross breaks ankles, so it is kept for a highlight: mostly
   * the man who reached or bit already.
   */
  hard: 0.25,
  /** How long he stays slow after the reaction, in seconds. */
  hardSlow: 0.75,
  softSlow: 0.4,
  maxChance: 0.9,
} as const;

/** The chance this move beats this defender now. */
export function jukeChance(a: Athlete, d: Athlete, act: Move, bit: number): number {
  const ds = buildOf(d).stats;
  const hs = buildOf(a).stats;
  // A defender lunging at the ball handler is easy to go by, and a stepback leaves him reaching at air.
  const toward = (d.vx * (a.x - d.x) + d.vz * (a.z - d.z)) / Math.max(0.3, dist2(a, d));
  const step = act.move === "stepback";
  const lunging = toward > 2 ? (step ? JUKE.stepbackLunge : JUKE.lunge) : 0;
  const tired = Math.max(0, a.moveHeat - 1) * 0.1;
  return clamp(JUKE.beat[act.move] + (hs.speed - ds.speed) * 0.035 - readEdge(ds.defence) + bit + lunging - tired, 0.05, JUKE.maxChance);
}

/** Whether a defender can be beaten at all: not in the air and not already stumbling. */
export function canBeJuked(d: Athlete): boolean {
  return !airborne(d) && d.action.kind !== "stumble";
}

/**
 * The beaten defender plays the reaction the move calls for, is sent
 * off by it and stays slow a beat. `handler` is who beat him, for a
 * bite to lunge at; without one he lunges along the move.
 */
export function stun(d: Athlete, act: Move, hard: boolean, handler: Athlete | null = null): void {
  const react = reactFor(act.move, hard);
  const at = handler ?? { ...d, x: d.x + act.dir.x, z: d.z + act.dir.z };
  const v = shakeVelocity(react, d, at, act, hard);
  d.vx = v.x;
  d.vz = v.z;
  d.action = { kind: "stumble", t: 0, dur: SHAKE_TIME[react][hard ? 1 : 0], react, turn: turnSide(act) };
  d.whiff = Math.max(d.whiff, hard ? JUKE.hardSlow : JUKE.softSlow);
}

/** Checks one move against the defender and applies the result. */
export function tryJuke(m: Match, a: Athlete, d: Athlete, act: Move): void {
  if (!canBeJuked(d)) return;
  const bit = d.action.kind === "steal" || d.whiff > 0 ? (act.move === "stepback" ? JUKE.stepbackBit : JUKE.bit) : 0;
  if (m.rng() >= jukeChance(a, d, act, bit)) return;
  const hard = m.rng() < JUKE.hard + Math.min(bit, JUKE.bit);
  stun(d, act, hard, a);
  m.emit({ type: "shake", id: a.id, victim: d.id, hard, react: reactFor(act.move, hard) });
}
