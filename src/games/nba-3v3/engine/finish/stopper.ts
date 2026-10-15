import { blockPeak, startBlock } from "../block";
import { hangTime } from "../body/jump";
import { RIM_SPOT } from "../court";
import type { Match } from "../match";
import { BOARD, JUMP } from "../tuning";
import type { Athlete } from "../types";
import { dir2, dist2, type V2 } from "../vec";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/**
 * The man who stuffs a dunk, played as part of the preset rather than
 * left to chance: he steps in to the spot under the slam and goes up so
 * his peak, and his hands, meet the ball as it comes over the ring. His
 * jump carries a block plan, so the drawn hand strikes the ball on the
 * frame of the stuff.
 */

/** Where he meets it: under the front of the ring, just off the glass. */
export function meetSpot(act: Pick<Drive, "to">): V2 {
  const back = dir2(RIM_SPOT, act.to);
  return { x: RIM_SPOT.x + back.x * 0.1, z: Math.max(BOARD.face + 0.3, RIM_SPOT.z + back.z * 0.1) };
}

/**
 * Moves every planned stuff along one step: the walk in, then the jump
 * timed to the slam. It runs after the computer and the phones have set
 * where everyone goes, so the stuff, once decided, plays out.
 */
export function guideStoppers(m: Match): void {
  for (const a of m.athletes) if (a.action.kind === "drive") guideStopper(m, a.action);
}

function guideStopper(m: Match, act: Drive): void {
  if (act.fail !== "stuff" || act.stopper === null || act.stopper === undefined || act.released) return;
  const man = m.athletes[act.stopper];
  if (!man || (man.action.kind !== "none" && man.action.kind !== "pass")) return;
  const spot = meetSpot(act);
  const gap = dist2(man, spot);
  const go = gap > 0.1 ? dir2(man, spot) : { x: 0, z: 0 };
  const pace = Math.min(1, gap / 0.5);
  man.move = { x: go.x * pace, z: go.z * pace };
  // From the press to the top of his jump: the crouch and half the time in the air.
  const lead = JUMP.blockGather + hangTime(blockPeak(man, "stand")) / 2;
  if (act.finish - act.t > lead) return;
  man.blockCd = 0;
  startBlock(man, "stand");
  // Read back fresh: the jump has just replaced his action.
  const jump = man.action as Athlete["action"];
  if (jump.kind !== "block") return;
  jump.plan = { at: act.finish - act.t, point: { ...act.release }, hit: "swat" };
  man.move = { x: 0, z: 0 };
}
