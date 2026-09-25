import type { Landmark, Pose } from "./landmarks";
import { LM, LOWER_START } from "./landmarks";
import { add, ARM_SHAPES, blend, FOREARM, rotate, STANDING, STANDING_HEIGHT, UPPER_ARM, type Vec } from "./synthetic-body";

export const DEFAULT_HEIGHT = 1.9;
export const DEFAULT_HEAD = 0.32;

/**
 * Made up poses, described in a few numbers instead of 33 points. Unit
 * tests build movement from them, and browser tests inject them in place
 * of the camera so a game can be played without a person. By default the
 * player stands close to a computer camera, seen from the waist up, and
 * the model sees nothing of the hips or legs.
 */

/** One arm. Each is 0 to 1 and they stack: a punch from the guard is `{ guard: 1, punch: 1 }`. */
export interface ArmSpec {
  /** Fist up by the chin, elbow bent. */
  guard?: number;
  /** Straight out toward the camera. */
  punch?: number;
  /** Elbow up and out to the side, fist forward: the wind up for a hook. */
  wide?: number;
  /** The fist swung in across the front of the face. */
  hook?: number;
  /** Straight up overhead. */
  raise?: number;
}

export interface PoseSpec {
  /** The middle of the hips across the mirrored picture, 0 to 1. Default 0.5. */
  x?: number;
  /** How much of the picture's height the whole person would fill, feet to crown. Default 1.9: close up, waist up. */
  height?: number;
  /** Where the nose sits when standing tall, 0 at the top of the picture to 1 at the bottom. Default 0.32. */
  head?: number;
  /** Size about the middle of the picture, as when walking nearer (above 1) or further (below 1). Default 1. */
  near?: number;
  /** The model sees the hips and legs. Default false: waist up, so nothing below the waist is ever seen. */
  legs?: boolean;
  /** Metres off the floor, for a jump. */
  lift?: number;
  /** 0 to 1, bending the knees down toward a squat. */
  crouch?: number;
  /** 0 to 1, bending forward at the hips toward the camera. */
  bow?: number;
  /** -1 to 1, tipping the upper body to the left or right of the picture. */
  lean?: number;
  left?: ArmSpec;
  right?: ArmSpec;
  /** How sure the model is about every point. Default 0.98. */
  visibility?: number;
}

const CAMERA_DISTANCE = 2.6;
/** The nose's height standing tall, in metres. */
const NOSE_HEIGHT = STANDING[LM.nose]![1];
const CROUCH_DROP = 0.42;
const BOW_ANGLE = Math.PI / 3;
const LEAN_ANGLE = (25 * Math.PI) / 180;
/** Points above the hips: the face, shoulders and arms. They move with a bow or a lean. */
const UPPER = LM.leftHip;

/** Builds the 33 points of a pose, mirrored like everything the kit hands out. */
export function syntheticPose(spec: PoseSpec = {}, aspect = 16 / 9): Pose {
  const joints = STANDING.map((p) => [...p] as Vec);
  placeArm(joints, "left", spec.left ?? {});
  placeArm(joints, "right", spec.right ?? {});
  const crouch = spec.crouch ?? 0;
  for (let i = 0; i < joints.length; i++) {
    if (i <= LM.rightHip) joints[i]![1] -= crouch * CROUCH_DROP;
    else if (i <= LM.rightKnee) joints[i] = add(joints[i]!, [0, -0.18 * crouch, -0.22 * crouch]);
  }
  const hips = midpoint(joints[LM.leftHip]!, joints[LM.rightHip]!);
  for (let i = 0; i < UPPER; i++) {
    joints[i] = rotate(joints[i]!, hips, 1, 2, -(spec.bow ?? 0) * BOW_ANGLE);
    joints[i] = rotate(joints[i]!, hips, 0, 1, -(spec.lean ?? 0) * LEAN_ANGLE);
  }
  const lift = spec.lift ?? 0;
  for (const joint of joints) joint[1] += lift;
  return project(joints, spec, aspect);
}

function placeArm(joints: Vec[], side: "left" | "right", arm: ArmSpec): void {
  const out = side === "left" ? -1 : 1;
  let upper = ARM_SHAPES.down.upper as Vec;
  let fore = ARM_SHAPES.down.fore as Vec;
  for (const name of ["guard", "raise", "wide", "punch", "hook"] as const) {
    const shape = ARM_SHAPES[name];
    upper = blend(upper, shape.upper as Vec, arm[name] ?? 0);
    fore = blend(fore, shape.fore as Vec, arm[name] ?? 0);
  }
  const flip = (v: Vec): Vec => [v[0] * out, v[1], v[2]];
  const [shoulder, elbow, wrist, pinky, index, thumb] =
    side === "left"
      ? [LM.leftShoulder, LM.leftElbow, LM.leftWrist, 17, LM.leftIndex, 21]
      : [LM.rightShoulder, LM.rightElbow, LM.rightWrist, 18, LM.rightIndex, 22];
  joints[elbow] = add(joints[shoulder]!, flip(upper), UPPER_ARM);
  joints[wrist] = add(joints[elbow]!, flip(fore), FOREARM);
  joints[index] = add(joints[wrist]!, flip(fore), 0.08);
  joints[pinky] = add(add(joints[wrist]!, flip(fore), 0.06), [0.02 * out, 0, 0]);
  joints[thumb] = add(add(joints[wrist]!, flip(fore), 0.04), [-0.02 * out, 0, 0]);
}

function midpoint(a: Vec, b: Vec): Vec {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/** A simple camera: nearer points spread out a little, as through a real lens. */
function project(joints: readonly Vec[], spec: PoseSpec, aspect: number): Pose {
  const perMetre = (spec.height ?? DEFAULT_HEIGHT) / STANDING_HEIGHT;
  const floor = (spec.head ?? DEFAULT_HEAD) + NOSE_HEIGHT * perMetre;
  const centre = spec.x ?? 0.5;
  const near = spec.near ?? 1;
  const visibility = spec.visibility ?? 0.98;
  const hips = midpoint(joints[LM.leftHip]!, joints[LM.rightHip]!);
  const landmarks: Landmark[] = [];
  const world: Landmark[] = [];
  joints.forEach((p, i) => {
    const spread = CAMERA_DISTANCE / (CAMERA_DISTANCE + (p[2] - hips[2]));
    // Walking nearer spreads the whole picture out from its middle, as through a lens.
    const x = 0.5 + (centre + ((hips[0] + (p[0] - hips[0]) * spread) * perMetre) / aspect - 0.5) * near;
    const y = 0.5 + (floor - (hips[1] + (p[1] - hips[1]) * spread) * perMetre - 0.5) * near;
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    const hidden = !spec.legs && i >= LOWER_START;
    const seen = hidden ? 0 : inside ? visibility : 0.1;
    landmarks.push({ x, y, z: ((p[2] - hips[2]) * perMetre * near) / aspect, visibility: seen });
    world.push({ x: p[0] - hips[0], y: -(p[1] - hips[1]), z: p[2] - hips[2], visibility: seen });
  });
  return { landmarks, world };
}
