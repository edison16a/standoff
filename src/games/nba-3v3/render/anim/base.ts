import { palmHold, spinCarry } from "../../engine/dribble-ball";
import type { Athlete, TeamId } from "../../engine/types";
import { balance } from "./balance";
import { CHEST_HOLD, RECEIVE, SPIN_PULL } from "./holding";
import { foulPose, lanePose, type LaneStance } from "./line";
import { locomotion } from "./locomotion";
import { blend, type Pose } from "./pose";

export interface AthleteScene {
  /** Holding the ball right now. */
  holding: boolean;
  /** Holding it in both hands at the chest, as the ball is checked, rather than dribbling. */
  chest: boolean;
  /** 0 to 1 as a ball thrown to this player comes in, for reaching out to catch it. */
  receiving: number;
  /** Down in a stance, guarding the player with the ball. */
  guarding: boolean;
  /** 0 to 1 as a defender closes in on this ball handler. */
  pressure: number;
  /** Along the lane at the free throws, or null. */
  lane: LaneStance | null;
  /** 0 to 1 while owning up to a foul at the whistle. */
  fouled: number;
  /** Set once the game is won: winners celebrate, losers hang their heads. */
  winner: TeamId | null;
}

/** What the view knows of the legs and the body's momentum this frame. */
export interface BodyState {
  speed: number;
  phase: number;
  /** Smoothed acceleration ahead and to the right, m/s². */
  ahead: number;
  side: number;
  time: number;
  seed: number;
}

const ease = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};

/**
 * Everything under the actions: the run or the stance, the dribble and
 * the off arm, the ball held in the pocket or pulled through a spin,
 * the body's balance, and the free throw lane stances.
 */
export function basePose(a: Athlete, s: AthleteScene, b: BodyState): Pose {
  const kind = a.action.kind;
  const free = kind === "none" || kind === "move";
  const carry = s.holding && spinCarry(a);
  const pocket = s.holding && !carry && (s.chest || palmHold(a));
  const dribbling = s.holding && free && !pocket && !carry;
  let p = locomotion({ speed: b.speed, phase: b.phase, guarding: s.guarding, dribble: dribbling ? a.dribble : null, dribbleSide: a.dribbleSide, pressure: s.pressure, time: b.time, seed: b.seed });
  if (carry) p = blend(p, SPIN_PULL[a.dribbleHand === 1 ? "R" : "L"], 1, p);
  else if (pocket) p = blend(p, CHEST_HOLD, 1, p);
  else if (s.receiving > 0) p = blend(p, RECEIVE, ease(s.receiving), p);
  if (kind === "none") {
    balance(p, {
      ahead: b.ahead, side: b.side, time: b.time,
      plant: Math.min(1, a.plant / 0.08), whiff: Math.min(1, a.whiff / 0.3), recover: Math.min(1, a.recover / 0.12),
    });
    if (s.lane && !s.holding) p = lanePose(p, s.lane, b.time, b.seed);
    if (s.fouled > 0) p = foulPose(p, s.fouled);
  }
  return p;
}
