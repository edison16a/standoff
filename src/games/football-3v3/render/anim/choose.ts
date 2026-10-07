import type { AthleteView, BallView } from "../../engine/view";
import type { Phase, TeamId } from "../../engine/types";
import { BUILDS } from "../../builds";
import { pitchPose, securePose } from "./ball-actions";
import { celebratePose, dejectedPose } from "./celebrations";
import { divePose, downPose } from "./contact";
import type { FootMode } from "./foot-lock";
import { gait, type Carry } from "./gait";
import { jukePose } from "./jukes";
import { clamp01, type Pose } from "./pose";
import { blockPose, breathe, CENTER, KICK_SET, READY, SHOTGUN, snapPose, THREE_POINT, TWO_POINT } from "./stance";
import { stumbleOver, tacklePose } from "./tackle";
import { catchPose } from "./catch/reaching";
import { kickPose } from "./kick";
import { holdingThrow, throwMotion } from "./throw";
import { captainPose, matePose } from "./trophy-poses";

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
  /** Seconds into the trophy presentation, or null outside it. */
  ceremonyT: number | null;
  /** Where the player the ball is going to stands, for the QB to turn and pitch to him. */
  target?: { x: number; z: number } | null;
  /** The QB holding the throw while its meter runs, who brings the ball up ready. */
  holding?: number | null;
}

/** What the figure knows about its own body. */
export interface BodyScene {
  phase: number;
  build: number;
  time: number;
  seed: number;
  /** Acceleration along the facing and to the left, eased, in m/s². */
  push?: number;
  turn?: number;
  /** Seconds since this player took the ball in his hands, or null. */
  secured?: number | null;
}

export interface Chosen {
  pose: Pose;
  /** How quickly the body eases into it, per second. Quick for actions, gentle for the run. */
  rate: number;
  /** Which hand holds the ball, when this player has it. */
  hand: "L" | "R" | "both";
  /** Whether the feet are planted by the stride, held for a push off, or free for a set move. */
  feet: FootMode;
}

/** Speed along the facing: positive running forward, negative backpedalling. */
export function aheadSpeed(a: AthleteView): number {
  return a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw);
}

/** Speed toward the body's left, as when shuffling across. */
export function acrossSpeed(a: AthleteView): number {
  return a.vx * Math.cos(a.yaw) - a.vz * Math.sin(a.yaw);
}

/** Where the target is, in radians to the left of the player's facing. */
function towardTarget(a: AthleteView, s: PoseScene): number {
  if (!s.target) return 0;
  const want = Math.atan2(s.target.x - a.x, s.target.z - a.z);
  return Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw));
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

/** At the trophy presentation: the captain lifts it, the winners jump, the beaten side hangs its heads. */
function ceremonyPose(a: AthleteView, t: number, b: BodyScene): Pose {
  if (a.ceremony === "captain") return captainPose(t);
  if (a.ceremony === "mate") return matePose(t, b.seed, a.role === "lineman");
  return dejectedPose(b.time, b.seed);
}

/**
 * Braking hard while the run bends is a plant and cut: the outside foot
 * sticks in the turf and the body pushes off it the other way.
 */
export function plantFor(a: AthleteView, b: BodyScene): FootMode {
  const push = b.push ?? 0;
  const turn = b.turn ?? 0;
  if (a.speed < 2.5 || push > -3.5 || Math.abs(turn) < 2.5) return "gait";
  return turn > 0 ? "plantR" : "plantL";
}

/** Picks the body's target pose from the engine's view of this player. Pure, so tests can check it. */
export function choosePose(a: AthleteView, s: PoseScene, b: BodyScene): Chosen {
  const carry = carryOf(a, s);
  const securing = a.hasBall && b.secured !== undefined && b.secured !== null && b.secured < 0.5 && carry === "tuck";
  const hand: Chosen["hand"] = carry === "ready" || (securing && b.secured! < 0.3) ? "both" : "R";
  const run = () => gait({
    speed: a.speed, ahead: aheadSpeed(a), across: acrossSpeed(a), push: b.push ?? 0, turn: b.turn ?? 0,
    phase: b.phase, carry, build: b.build, time: b.time, seed: b.seed,
  });
  const t = a.actionT;
  const free = (pose: Pose, rate: number, h: Chosen["hand"] = hand): Chosen => ({ pose, rate, hand: h, feet: "free" });
  if (a.ceremony && s.ceremonyT !== null) return free(ceremonyPose(a, s.ceremonyT, b), 12, "both");
  switch (a.action) {
    case "stance":
      return free(breathe(stance(a, s), b.time, b.seed), 8);
    case "juke": {
      // The push off foot stays planted while the body drives away from it: off the right foot to go left.
      const feet: FootMode = t < a.plant ? (a.side > 0 ? "plantR" : "plantL") : "free";
      return { pose: jukePose(a.juke ?? "side", t, a.actionDur, a.side, run()), rate: 20, hand: "R", feet };
    }
    case "dive":
      return free(divePose(t, a.actionDur), 22, "R");
    case "lunge":
      return free(tacklePose(a, run)!, 24);
    case "throw":
      if (a.lob || !a.throwKind) return free(pitchPose(t, a.actionDur, towardTarget(a, s)), 30, "both");
      // On the run the stride keeps going under the throw; set throws are authored to the feet.
      return { pose: throwMotion(a.throwKind, t, a.actionDur, run), rate: 30, hand: "R", feet: a.throwKind === "run" ? "gait" : "free" };
    case "kick":
      return free(kickPose(t), 26, "both");
    case "down": {
      // Tackles and misses play their authored presets; a dive and anything else lies down plainly.
      const preset = tacklePose(a, run);
      return free(preset ?? downPose(t, a.actionDur, a.downCause ?? "dive", a.id), preset ? 26 : 18, "R");
    }
    case "celebrate": {
      const style = a.build ? BUILDS[a.build].celebration : "point";
      return free(celebratePose(style, t, a.spike), 14, "R");
    }
    case "none":
      break;
  }
  if (s.phase === "over" && s.winner !== null && a.role !== "lineman") {
    const style = a.build ? BUILDS[a.build].celebration : "point";
    return free(s.winner === a.team ? celebratePose(style, s.phaseT, false) : dejectedPose(b.time, b.seed), 8);
  }
  if (s.center && s.ball.state === "snap") return free(snapPose(s.phaseT), 30);
  const fooled = (p: Pose) => (a.stumble ? stumbleOver(p, a.stumble.t, a.stumble.dur, a.stumble.side) : p);
  if (a.role === "lineman" && a.blocked) {
    // Two big men leaning on each other: a shove that drives one back sits him up, the one winning leans in.
    const lurch = Math.max(-1, Math.min(1, (b.push ?? 0) / 4));
    return free(fooled(blockPose(b.time, b.seed, (a.team === s.offense ? -0.2 : 0.2) + lurch)), a.stumble ? 18 : 12);
  }
  // Teammates of the passer leave it to the receiver; only the target and the defence go up for it.
  const { reach, high } = a.targeted || a.team !== s.offense ? reachFor(a, s.ball) : { reach: 0, high: 0 };
  let pose = reach > 0 ? catchPose(run(), reach, high) : run();
  if (carry === "ready" && s.holding === a.id) pose = holdingThrow(pose);
  if (securing) pose = securePose(pose, b.secured! / 0.5);
  pose = fooled(pose);
  // The stride is tracked closely so the planted foot and the legs agree; reaching blends in a touch slower.
  return { pose, rate: reach > 0 ? 18 : 28, hand, feet: plantFor(a, b) };
}
