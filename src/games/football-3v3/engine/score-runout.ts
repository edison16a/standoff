import { BUILDS } from "../builds";
import { attackSign } from "../teams";
import { topSpeed } from "./body";
import type { Match } from "./match";
import { RULES } from "./tuning";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/**
 * A scorer does not freeze on the goal line. Before this he went
 * straight into his dance the step he scored, so a catch for six never
 * showed the catch and a runner stopped dead on the paint. Now he runs
 * on the way he was going and eases off to a stop, any catch plays out
 * in his hands, and only once he has pulled up, on his feet, does he
 * celebrate. The break after the score waits for his celebration.
 * The filmed showcase game keeps the old instant dance, so the trailer
 * plays as it was recorded.
 */
export const RUNOUT = {
  /** Seconds his legs take to ease from his pace at the line to a stop. */
  ease: 1.5,
  /** Slower than this, metres a second, he has pulled up. */
  still: 1.2,
  /** Seconds after the score he celebrates anyway, if he is on his feet and still has not pulled up. */
  latest: 2.4,
  /** How long his own celebration runs. */
  celebrate: 2.6,
  /** Seconds after the score the break ends even if he never got to celebrate, say still down on the turf. */
  giveUp: 4,
} as const;

export interface Runout {
  id: number;
  /** The way he was running as he scored, and his pace then as a share of his top speed. */
  dir: V2;
  pace: number;
  /** Seconds into the touchdown break his celebration started, or null while he pulls up. */
  at: number | null;
}

/** The touchdown: the scorer runs it out, or in the filmed game dances at once. */
export function startRunout(m: Match, scorer: Athlete): void {
  if (!m.play) return;
  const speed = Math.hypot(scorer.vx, scorer.vz);
  const dir = speed > 0.3 ? { x: scorer.vx / speed, z: scorer.vz / speed } : { x: attackSign(scorer.team), z: 0 };
  m.play.runout = { id: scorer.id, dir, pace: Math.min(1, speed / topSpeed(scorer, true)), at: null };
  if (m.filmed) celebrateNow(m, scorer, RULES.touchdownSeconds);
}

/** His legs while he pulls up: the way he was going, easing off to nothing, then still for his dance. Null for anyone else. */
export function runoutLegs(m: Match, a: Athlete): V2 | null {
  const r = m.play?.runout;
  if (m.phase !== "touchdown" || m.filmed || !r || r.id !== a.id) return null;
  // A thumb still on the stick does not drag him off across the end zone mid dance.
  if (r.at !== null) return { x: 0, z: 0 };
  const s = Math.min(1, m.phaseT / RUNOUT.ease);
  // A cosine ease: he comes off the gas, brakes, and settles, with no jolt at either end.
  const k = r.pace * 0.5 * (1 + Math.cos(Math.PI * s));
  return { x: r.dir.x * k, z: r.dir.z * k };
}

/** Each step of the break: once he has pulled up on his feet and the catch has played, he celebrates. */
export function stepRunout(m: Match): void {
  const r = m.play?.runout;
  if (m.phase !== "touchdown" || !r || r.at !== null) return;
  const a = m.athlete(r.id);
  if (!a || a.action.kind !== "none" || a.catching !== null) return;
  const speed = Math.hypot(a.vx, a.vz);
  if (speed < RUNOUT.still || m.phaseT >= RUNOUT.latest) celebrateNow(m, a, RUNOUT.celebrate);
}

function celebrateNow(m: Match, a: Athlete, dur: number): void {
  const spike = a.build !== null && BUILDS[a.build].celebration === "spike";
  a.action = { kind: "celebrate", t: 0, dur, spike };
  if (m.play?.runout) m.play.runout.at = m.phaseT;
}

/** Seconds into the touchdown break that it ends: the usual time, or later for a scorer who celebrated late. */
export function touchdownEnd(m: Match): number {
  const r = m.play?.runout;
  if (!r || m.filmed) return RULES.touchdownSeconds;
  return Math.max(RULES.touchdownSeconds, r.at !== null ? r.at + RUNOUT.celebrate : RUNOUT.giveUp);
}
