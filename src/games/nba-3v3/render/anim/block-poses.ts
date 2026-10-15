import type { Action } from "../../engine/types";
import { leapKeys } from "./blocks/leaps";
import { STRIKES } from "./blocks/strikes";
import { blend, keyed, mirrorPatch, type Pose, type PosePatch } from "./pose";

export { blockLandPose } from "./blocks/landings";

type Block = Extract<Action, { kind: "block" }>;

/** The strike comes in over this long before its windup key, and goes out over this long before the feet touch down. */
const IN = 0.08;
const OUT = 0.14;

/**
 * A block, the whole body: the leap of the jump style (the plant, the
 * takeoff, the rise and the fall, `blocks/leaps.ts`) with the strike of
 * the preset over it (`blocks/strikes.ts`) once the block math has
 * picked the play, keyed on the planned contact so the windup, the hit
 * and the follow through fall on the engine's own clock.
 *
 * `left` is + when a help leap comes across to his left; `speed` is how
 * fast he left the floor, for the plant step.
 */
export function blockPose(act: Block, base: Pose, left: number, speed: number): Pose {
  const { gather: g, air } = act;
  let keys = leapKeys(act.style, g, air, speed);
  if (act.style === "help" && left < 0) keys = keys.map(([t, p]) => [t, mirrorPatch(p)] as const);
  const leap = keyed(keys, act.t, base);
  const plan = act.plan;
  if (!plan) return leap;
  const s = STRIKES[plan.preset];
  // A help leap strikes the way it travels; every other play strikes with the hand on the ball's side.
  const mirror = plan.preset === "help" ? left < 0 : plan.hand === "L";
  const m = (p: PosePatch) => (mirror ? mirrorPatch(p) : p);
  const c = plan.at;
  const strike = keyed(
    [
      [c - s.windup, m(s.keys.windup)],
      [c, m(s.keys.contact)],
      [c + s.follow, m(s.keys.follow)],
    ],
    act.t,
    leap,
  );
  // In ahead of the windup, held through the follow, and out as the feet reach for the floor.
  const land = g + air;
  const w = smooth((act.t - (c - s.windup - IN)) / IN) * smooth((land - act.t) / OUT);
  return blend(leap, strike, w, { ...leap });
}

const smooth = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};
