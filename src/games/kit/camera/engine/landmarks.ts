/**
 * The pose model's 33 body points, in the kit's own space. Everything the
 * kit hands a game is mirrored like a selfie, so a player who moves to
 * their left moves left on screen, and player one stands on the left.
 */

export interface Landmark {
  /** Across the mirrored picture, 0 at the left edge and 1 at the right. World points: metres, right is positive. */
  x: number;
  /** Down the picture, 0 at the top and 1 at the bottom. World points: metres, down is positive. */
  y: number;
  /** Depth, smaller is nearer the camera, with the hips at 0. World points: metres. */
  z: number;
  /** How likely the point is in view and not hidden, 0 to 1. */
  visibility: number;
}

/** One person in one frame, already mirrored. */
export interface Pose {
  /** 33 points in the mirrored picture. */
  landmarks: Landmark[];
  /** The same 33 points in metres around the middle of the hips. Good for depth. */
  world: Landmark[];
}

export const LANDMARK_COUNT = 33;

/** Names for the points the kit reads. Left and right are the player's own. */
export const LM = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftIndex: 19,
  rightIndex: 20,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFoot: 31,
  rightFoot: 32,
} as const;

/**
 * The bones drawn for a skeleton. The face is left out, since a round
 * head reads better from across the room than eyes and a mouth.
 */
export const BONES: readonly (readonly [number, number])[] = [
  [LM.leftShoulder, LM.rightShoulder],
  [LM.leftShoulder, LM.leftHip],
  [LM.rightShoulder, LM.rightHip],
  [LM.leftHip, LM.rightHip],
  [LM.leftShoulder, LM.leftElbow],
  [LM.leftElbow, LM.leftWrist],
  [LM.leftWrist, LM.leftIndex],
  [LM.rightShoulder, LM.rightElbow],
  [LM.rightElbow, LM.rightWrist],
  [LM.rightWrist, LM.rightIndex],
  [LM.leftHip, LM.leftKnee],
  [LM.leftKnee, LM.leftAnkle],
  [LM.leftAnkle, LM.leftHeel],
  [LM.leftHeel, LM.leftFoot],
  [LM.leftAnkle, LM.leftFoot],
  [LM.rightHip, LM.rightKnee],
  [LM.rightKnee, LM.rightAnkle],
  [LM.rightAnkle, LM.rightHeel],
  [LM.rightHeel, LM.rightFoot],
  [LM.rightAnkle, LM.rightFoot],
];

interface RawPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Turns the model's raw output, which is as the camera sees it, into the
 * mirrored space the whole kit uses. Only x flips: the model's left and
 * right labels are the person's own and stay as they are.
 */
export function mirrorPose(landmarks: readonly RawPoint[], world: readonly RawPoint[]): Pose {
  return {
    landmarks: landmarks.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 })),
    world: world.map((p, i) => ({ x: -p.x, y: p.y, z: p.z, visibility: p.visibility ?? landmarks[i]?.visibility ?? 0 })),
  };
}

/** The mean visibility of the given points, 0 when any is missing. */
export function visibilityOf(landmarks: readonly Landmark[], indices: readonly number[]): number {
  let sum = 0;
  for (const index of indices) sum += landmarks[index]?.visibility ?? 0;
  return indices.length ? sum / indices.length : 0;
}

/** The points a body needs before the kit trusts it: the head, shoulders and hips. */
export const CORE_POINTS = [LM.nose, LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip] as const;

/** Knees and ankles as well, for games that need the whole body in view. */
export const LEG_POINTS = [LM.leftKnee, LM.rightKnee, LM.leftAnkle, LM.rightAnkle] as const;
