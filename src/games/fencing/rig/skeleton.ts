import { add, polar, solveTwoBone, v2, type Vec2 } from "./geometry";

/** Bone lengths, shared by every character. One skeleton, many skins. */
export const BONES = {
  thigh: 0.42,
  shin: 0.42,
  torso: 0.52,
  neck: 0.07,
  headRadius: 0.135,
  upperArm: 0.3,
  forearm: 0.28,
} as const;

/**
 * The handful of numbers that describe a body position. Everything else
 * (knees, elbows, where the head sits) is solved from these, so a pose is
 * small enough to blend field by field.
 */
export interface Pose {
  /** Hip joint position relative to the fencer's floor origin. */
  hips: Vec2;
  /** Torso tilt away from vertical. Positive leans toward the opponent. */
  lean: number;
  /** Extra nod of the head on top of the lean. */
  nod: number;
  /** Where each foot touches (or hovers over) the floor. */
  frontFoot: Vec2;
  backFoot: Vec2;
  /** Sword hand, relative to the front shoulder. */
  hand: Vec2;
  /** Blade direction on screen, radians from horizontal. */
  bladeAngle: number;
  /** How far the blade swings toward or away from the camera, radians. */
  bladeYaw: number;
  /** Wrist twist, used to turn the guard art. */
  wrist: number;
  /** Free hand, relative to the back shoulder. */
  backHand: Vec2;
}

/** Every joint of a solved pose, ready for the art pieces to hang on. */
export interface Joints {
  hips: Vec2;
  shoulder: Vec2;
  backShoulder: Vec2;
  neck: Vec2;
  head: Vec2;
  headAngle: number;
  torsoAngle: number;
  frontKnee: Vec2;
  frontAnkle: Vec2;
  backKnee: Vec2;
  backAnkle: Vec2;
  elbow: Vec2;
  hand: Vec2;
  backElbow: Vec2;
  backHand: Vec2;
  bladeAngle: number;
  /** Visible share of the blade after the yaw foreshortens it. */
  bladeReach: number;
  /** Small vertical shift of the tip, which is how yaw shows up in a side view. */
  bladeDip: number;
  wrist: number;
}

/** Height of the ankle joint above the sole. */
const ANKLE_HEIGHT = 0.07;

/** Turns a pose into joint positions with plain forward and inverse kinematics. */
export function solve(pose: Pose): Joints {
  const torsoAngle = Math.PI / 2 - pose.lean;
  const top = add(pose.hips, polar(torsoAngle, BONES.torso));
  const shoulder = add(top, v2(0.02, -0.04));
  const backShoulder = add(top, v2(-0.05, -0.03));
  const neck = add(top, polar(torsoAngle, BONES.neck));
  const headAngle = torsoAngle - pose.nod;
  const head = add(neck, polar(headAngle, BONES.headRadius));

  // Knees fold toward the opponent: counter clockwise from hip to ankle.
  const frontAnkleTarget = add(pose.frontFoot, v2(0, ANKLE_HEIGHT));
  const backAnkleTarget = add(pose.backFoot, v2(0, ANKLE_HEIGHT));
  const front = solveTwoBone(pose.hips, frontAnkleTarget, BONES.thigh, BONES.shin, 1);
  const back = solveTwoBone(pose.hips, backAnkleTarget, BONES.thigh, BONES.shin, 1);

  // The sword elbow hangs below the arm line, the free elbow sits out back.
  const arm = solveTwoBone(shoulder, add(shoulder, pose.hand), BONES.upperArm, BONES.forearm, -1);
  const freeArm = solveTwoBone(backShoulder, add(backShoulder, pose.backHand), BONES.upperArm, BONES.forearm, 1);

  return {
    hips: pose.hips,
    shoulder,
    backShoulder,
    neck,
    head,
    headAngle,
    torsoAngle,
    frontKnee: front.joint,
    frontAnkle: front.end,
    backKnee: back.joint,
    backAnkle: back.end,
    elbow: arm.joint,
    hand: arm.end,
    backElbow: freeArm.joint,
    backHand: freeArm.end,
    bladeAngle: pose.bladeAngle,
    bladeReach: Math.max(0.35, Math.cos(pose.bladeYaw)),
    bladeDip: Math.sin(pose.bladeYaw) * 0.22,
    wrist: pose.wrist,
  };
}

/** Where the blade tip ends up, used by effects that sparkle at the tip. */
export function bladeTip(joints: Joints, bladeLength: number): Vec2 {
  const along = polar(joints.bladeAngle, bladeLength * joints.bladeReach);
  return add(joints.hand, v2(along.x, along.y - joints.bladeDip * bladeLength));
}
