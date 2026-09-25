import { charOf } from "./athlete";
import type { Match } from "./match";
import { DEFENCE, JUMP } from "./tuning";
import type { Action, Athlete } from "./types";
import { clamp } from "./vec";

type Block = Extract<Action, { kind: "block" }>;

/** Where a block jump is: crouching to gather, going up, coming down, or back on the floor. */
export type BlockStage = "gather" | "rise" | "fall" | "done";

/**
 * A jump with the arms up, to contest or block a shot or to rebound.
 * A short crouch first loads the legs, so a jump pressed late is late;
 * then a real arc, highest halfway through the air time.
 */
export function startBlock(a: Athlete): void {
  if (a.blockCd > 0) return;
  const s = charOf(a).stats;
  a.action = { kind: "block", t: 0, peak: 0.42 + s.speed * 0.012 + s.strength * 0.008, gather: JUMP.blockGather, air: JUMP.blockAir };
  a.blockCd = DEFENCE.blockCooldown;
}

/** The stage of the jump and how far through it, 0 to 1. The animation reads this too. */
export function blockStage(act: Block): { stage: BlockStage; u: number } {
  if (act.t < act.gather) return { stage: "gather", u: act.t / act.gather };
  const s = (act.t - act.gather) / act.air;
  if (s < 0.5) return { stage: "rise", u: s * 2 };
  if (s < 1) return { stage: "fall", u: (s - 0.5) * 2 };
  return { stage: "done", u: 1 };
}

/**
 * How well timed the jump is right now, 0 to 1: full at the top of the
 * arc with the arms at full stretch, nothing while still crouched.
 */
export function blockTiming(a: Athlete): number {
  const act = a.action;
  if (act.kind !== "block" || act.t < act.gather) return 0;
  const s = (act.t - act.gather) / act.air;
  return clamp(Math.sin(Math.PI * clamp(s, 0, 1)), 0, 1);
}

export function updateBlock(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "block") return;
  act.t += dt;
  const s = (act.t - act.gather) / act.air;
  a.y = s > 0 && s < 1 ? act.peak * 4 * s * (1 - s) : 0;
  if (s < 1) return;
  a.y = 0;
  a.action = { kind: "none" };
  a.recover = JUMP.blockRecover;
  m.emit({ type: "land", id: a.id, hard: false });
}
