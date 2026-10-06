import { palmHold, spinCarry } from "../../engine/dribble-ball";
import type { Athlete, Ball, TeamId } from "../../engine/types";
import type { CeremonyRole } from "../ceremony/ceremony-stage";
import { balance } from "./balance";
import { CHEST_HOLD, RECEIVE, SPIN_PULL } from "./holding";
import { foulPose, lanePose, type LaneStance } from "./line";
import { locomotion, type Stride } from "./locomotion";
import { blend, type Pose, type PosePatch } from "./pose";

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
  /** This player's part in the trophy ceremony, while it runs. */
  ceremony?: CeremonyRole | null;
  /** The ball, given to whoever holds it or has it coming, for the hands to meet. */
  ball?: Ball | null;
  /** The ball in the air, given to a defender up in a block jump, for the hand to go for it. */
  flight?: Ball | null;
  /** 0 to 1 as the man this defender guards rises into a jumper, for the hand up in his face. */
  contest?: number;
  /** Guarding: which side of him the ball is, + his left, - his right. */
  ballSide?: number;
}

/** The contest: up off the stance, one hand straight up in the shooter's face, the other out for balance. */
const CONTEST: PosePatch = {
  armRRaise: 2.9, armRSpread: 0.08, elbowR: 0.12, wristR: -0.25, armLRaise: 0.9, armLSpread: 0.7, elbowL: 0.6,
  torsoX: 0.12, hipY: -0.06, kneeL: 0.6, kneeR: 0.6, legLLift: 0.32, legRLift: 0.32, neckX: -0.3,
};

/** What the view knows of the legs and the body's momentum this frame. */
export interface BodyState {
  speed: number;
  phase: number;
  /** Smoothed acceleration ahead and to the right, m/s². */
  ahead: number;
  side: number;
  time: number;
  seed: number;
  /** The way of travel in the player's own frame, radians: 0 ahead, π/2 to his left. */
  heading: number;
  /** Hip to ankle, metres. */
  leg: number;
  /** Filled in with the running stride's flight, for the placement. */
  stride: Stride;
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
  let p = locomotion(
    { speed: b.speed, phase: b.phase, guarding: s.guarding, ballSide: s.ballSide, dribble: dribbling ? a.dribble : null, dribbleSide: a.dribbleSide, pressure: s.pressure, time: b.time, seed: b.seed, heading: b.heading, leg: b.leg },
    b.stride,
  );
  if (carry) p = blend(p, SPIN_PULL[a.dribbleHand === 1 ? "R" : "L"], 1, p);
  else if (pocket) p = blend(p, CHEST_HOLD, 1, p);
  else if (s.receiving > 0) p = blend(p, RECEIVE, ease(s.receiving), p);
  if (s.contest) p = blend(p, CONTEST, ease(s.contest), p);
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
