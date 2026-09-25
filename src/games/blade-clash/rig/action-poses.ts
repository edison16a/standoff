import type { FencerAction } from "@/games/blade-clash/engine/frames";
import { v2 } from "./geometry";
import type { Pose } from "./skeleton";

/**
 * The canned poses layered over live tracking. Each takes the live pose
 * and returns where the body should be at the peak of the action. The
 * animator blends toward these and back, so the live sword angle still
 * leaks through the edges of every action.
 */
export type ActionPose = (live: Pose, room: number) => Pose;

/**
 * A lunge: the front foot shoots out, the hips drop, the sword arm locks
 * straight and the back arm flies back. `room` is how much of a full lunge
 * fits before the opponent's chest, 0 to 1. Close in, the lunge is shorter,
 * the arm stays bent and the point angles down, so the tip lands on the
 * jacket instead of passing through it.
 */
const lunge: ActionPose = (live, room) => ({
  ...live,
  hips: v2(live.hips.x + 0.42 * room, live.hips.y - 0.17),
  lean: 0.1 + 0.2 * room,
  twist: 0.78,
  nod: -0.16,
  frontFoot: v2(live.frontFoot.x + 0.2 + 0.46 * room, 0),
  backFoot: v2(live.backFoot.x - 0.08, 0),
  hand: v2(0.3 + 0.26 * room, 0.02 + 0.08 * (1 - room)),
  // Aim mostly along the line, keeping a little of where the phone points.
  bladeAngle: -0.05 - 0.5 * (1 - room) + (live.bladeAngle - 0.14) * 0.3,
  bladeYaw: live.bladeYaw * 0.3,
  backHand: v2(-0.5, -0.1),
});

/** A parry: the blade snaps up and across in front of the chest. */
const parry: ActionPose = (live) => ({
  ...live,
  lean: 0.02,
  twist: 0.36,
  hand: v2(0.24, -0.08),
  bladeAngle: 1.08 + (live.bladeAngle - 0.14) * 0.25,
  bladeYaw: live.bladeYaw * 0.3 - 0.18,
  wrist: 0.6,
});

/** Blade knocked high and wide after being parried. */
const deflected: ActionPose = (live) => ({
  ...live,
  lean: -0.08,
  twist: 0.3,
  hand: v2(0.2, 0.06),
  bladeAngle: 1.3,
  bladeYaw: 0.75,
  wrist: -0.4,
});

/** Recoil from a touch: chest pulled back, arm dropping. */
const hit: ActionPose = (live) => ({
  ...live,
  hips: v2(live.hips.x - 0.12, live.hips.y + 0.02),
  lean: -0.3,
  twist: 0.2,
  nod: 0.3,
  hand: v2(0.2, -0.36),
  bladeAngle: -0.6,
  backHand: v2(-0.3, 0.02),
});

/** Standing tall, sword thrown up. */
const victory: ActionPose = (live) => ({
  ...live,
  hips: v2(0, 0.93),
  lean: -0.05,
  twist: 0.2,
  nod: -0.25,
  frontFoot: v2(0.2, 0),
  backFoot: v2(-0.18, 0),
  hand: v2(0.08, 0.5),
  bladeAngle: 1.35,
  bladeYaw: 0,
  backHand: v2(-0.06, -0.5),
});

/** Slumped, tip on the floor. */
const defeat: ActionPose = (live) => ({
  ...live,
  hips: v2(0, 0.76),
  lean: 0.45,
  twist: 0.3,
  nod: 0.55,
  frontFoot: v2(0.26, 0),
  backFoot: v2(-0.24, 0),
  hand: v2(0.14, -0.46),
  bladeAngle: -1.1,
  bladeYaw: 0,
  backHand: v2(0.02, -0.52),
});

export const ACTION_POSES: Record<Exclude<FencerAction, "idle" | "scored">, ActionPose> = {
  jab: lunge,
  parry,
  deflected,
  hit,
  victory,
  defeat,
};
