import type { AthleteView, BallView } from "../../engine/view";
import type { Phase, TeamId } from "../../engine/types";
import { CHARACTERS } from "../../roster";
import { celebratePose, dejectedPose } from "./celebrations";
import { divePose, downPose, lungePose } from "./contact";
import { gait, type Carry } from "./gait";
import { jukePose } from "./jukes";
import { clamp01, type Pose } from "./pose";
import { blockPose, breathe, CENTER, KICK_SET, READY, SHOTGUN, snapPose, THREE_POINT, TWO_POINT } from "./stance";
import { catchPose, kickPose, throwPose } from "./throwing";

/** What a figure knows about the play around it this frame. */
export interface PoseScene {
  phase: Phase;
  phaseT: number;
  offense: TeamId;
  ball: BallView;
  winner: TeamId | null;
  /** The offensive lineman over the ball, who snaps it. */
  center: boolean;
  /** Who is lined up to kick, if anyone. */
  kicker: number | null;
}

/** What the figure knows about its own legs. */
export interface BodyScene {
  phase: number;
  build: number;
  time: number;
  seed: number;
}

export interface Chosen {
  pose: Pose;
  /** How quickly the body eases into it, per second. Quick for actions, gentle for the run. */
  rate: number;
  /** Which hand holds the ball, when this player has it. */
  hand: "L" | "R" | "both";
}

/** Speed along the facing: positive running forward, negative backpedalling. */
export function aheadSpeed(a: AthleteView): number {
  return a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw);
}

/** The QB holds the ball in both hands, ready to throw, until he tucks it and runs. */
function carryOf(a: AthleteView, s: PoseScene): Carry {
  if (!a.hasBall) return "none";
  const passer = a.role === "qb" && a.team === s.offense && s.phase === "live" && s.ball.state === "held";
  return passer && a.speed < 5.5 ? "ready" : "tuck";
}

function stance(a: AthleteView, s: PoseScene): Pose {
  if (a.id === s.kicker) return KICK_SET;
  const onOffense = a.team === s.offense;
  if (a.role === "lineman") return onOffense && s.center ? CENTER : THREE_POINT;
  if (a.role === "qb") return onOffense ? SHOTGUN : READY;
  return onOffense ? TWO_POINT : READY;
}

/**
 * How far a pass has come toward this receiver, 0 to 1, and how high
 * it will arrive, for raising the hands in time. Only the target and
 * players right under the ball reach for it.
 */
export function reachFor(a: AthleteView, ball: BallView): { reach: number; high: number } {
  if (ball.state !== "pass") return { reach: 0, high: 0 };
  const dx = ball.x - a.x;
  const dz = ball.z - a.z;
  const d = Math.hypot(dx, dz);
  const closing = -(dx * ball.vx + dz * ball.vz) / Math.max(0.1, d);
  if (!a.targeted && d > 2.5) return { reach: 0, high: 0 };
  if (closing <= 0 && d > 1.5) return { reach: 0, high: 0 };
  const eta = d / Math.max(4, closing);
  return { reach: clamp01(1 - (eta - 0.15) / 0.5), high: clamp01((ball.y - 1.6) / 0.9) };
}

/** Picks the body's target pose from the engine's view of this player. Pure, so tests can check it. */
export function choosePose(a: AthleteView, s: PoseScene, b: BodyScene): Chosen {
  const carry = carryOf(a, s);
  const hand: Chosen["hand"] = carry === "ready" ? "both" : "R";
  const run = () => gait({ speed: a.speed, ahead: aheadSpeed(a), phase: b.phase, carry, build: b.build, time: b.time, seed: b.seed });
  const t = a.actionT;
  switch (a.action) {
    case "stance":
      return { pose: breathe(stance(a, s), b.time, b.seed), rate: 8, hand };
    case "juke":
      return { pose: jukePose(a.juke ?? "side", t, a.actionDur, a.side, run()), rate: 20, hand: "R" };
    case "dive":
      return { pose: divePose(t, a.actionDur), rate: 22, hand: "R" };
    case "lunge":
      return { pose: lungePose(t, a.actionDur), rate: 22, hand };
    case "throw":
      return { pose: throwPose(t, a.actionDur), rate: 30, hand: "R" };
    case "kick":
      return { pose: kickPose(t), rate: 26, hand: "both" };
    case "down":
      return { pose: downPose(t, a.actionDur, a.downCause ?? "dive", a.id), rate: 18, hand: "R" };
    case "celebrate": {
      const style = a.character ? CHARACTERS[a.character].celebration : "point";
      return { pose: celebratePose(style, t, a.spike), rate: 14, hand: "R" };
    }
    case "none":
      break;
  }
  if (s.phase === "over" && s.winner !== null && a.role !== "lineman") {
    const style = a.character ? CHARACTERS[a.character].celebration : "point";
    return { pose: s.winner === a.team ? celebratePose(style, s.phaseT, false) : dejectedPose(b.time, b.seed), rate: 8, hand };
  }
  if (s.center && s.ball.state === "snap") return { pose: snapPose(s.phaseT), rate: 30, hand };
  if (a.role === "lineman" && a.blocked) {
    return { pose: blockPose(b.time, b.seed, a.team === s.offense ? -0.2 : 0.2), rate: 12, hand };
  }
  // Teammates of the passer leave it to the receiver; only the target and the defence go up for it.
  const { reach, high } = a.targeted || a.team !== s.offense ? reachFor(a, s.ball) : { reach: 0, high: 0 };
  const pose = reach > 0 ? catchPose(run(), reach, high) : run();
  return { pose, rate: reach > 0 ? 18 : 14, hand };
}
