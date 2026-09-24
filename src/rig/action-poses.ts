import type { FencerAction } from "@/game/frames";
import { v2 } from "./geometry";
import type { Pose } from "./skeleton";

/**
 * The canned poses layered over live tracking. Each takes the live pose
 * and returns where the body should be at the peak of the action. The
 * animator blends toward these and back, so the live sword angle still
 * leaks through the edges of every action.
 */
export type ActionPose = (live: Pose) => Pose;

/** A lunge: front foot shoots out, hips drop, the sword arm locks straight. */
const lunge: ActionPose = (live) => ({
  ...live,
  hips: v2(live.hips.x + 0.36, live.hips.y - 0.12),
  lean: 0.34,
  nod: -0.2,
  frontFoot: v2(live.frontFoot.x + 0.62, 0),
  backFoot: v2(live.backFoot.x - 0.06, 0),
  hand: v2(0.57, -0.02),
  // Aim mostly along the line, keeping a little of where the phone points.
  bladeAngle: -0.06 + (live.bladeAngle - 0.16) * 0.35,
  backHand: v2(-0.5, -0.02),
});

/** A quarte parry: blade snaps near vertical in front of the chest. */
const parry: ActionPose = (live) => ({
  ...live,
  lean: 0.02,
  hand: v2(0.2, -0.08),
  bladeAngle: 1.12 + (live.bladeAngle - 0.16) * 0.25,
  bladeYaw: live.bladeYaw * 0.3,
  wrist: 0.5,
});

/** Blade knocked high and wide after being parried. */
const deflected: ActionPose = (live) => ({
  ...live,
  lean: -0.06,
  hand: v2(0.2, 0.06),
  bladeAngle: 1.4,
  bladeYaw: 0.6,
});

/** Recoil from a touch: chest pulled back, arm dropping. */
const hit: ActionPose = (live) => ({
  ...live,
  hips: v2(live.hips.x - 0.1, live.hips.y + 0.02),
  lean: -0.28,
  nod: 0.25,
  hand: v2(0.2, -0.34),
  bladeAngle: -0.55,
  backHand: v2(-0.24, 0.05),
});

/** Standing tall, sword thrown up. */
const victory: ActionPose = (live) => ({
  ...live,
  hips: v2(0, 0.93),
  lean: -0.04,
  nod: -0.18,
  frontFoot: v2(0.2, 0),
  backFoot: v2(-0.18, 0),
  hand: v2(0.1, 0.52),
  bladeAngle: 1.35,
  bladeYaw: 0,
  backHand: v2(-0.08, -0.5),
});

/** Slumped, tip on the floor. */
const defeat: ActionPose = (live) => ({
  ...live,
  hips: v2(0, 0.8),
  lean: 0.42,
  nod: 0.5,
  frontFoot: v2(0.26, 0),
  backFoot: v2(-0.24, 0),
  hand: v2(0.16, -0.46),
  bladeAngle: -1.15,
  bladeYaw: 0,
  backHand: v2(0.02, -0.52),
});

export const ACTION_POSES: Record<Exclude<FencerAction, "idle">, ActionPose> = {
  jab: lunge,
  parry,
  deflected,
  hit,
  victory,
  defeat,
};
