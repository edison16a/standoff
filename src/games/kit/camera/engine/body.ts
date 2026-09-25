import { distance3, mid, span, type Point } from "./geometry";
import { LM, UPPER_POINTS, visibilityOf, type Landmark, type Pose } from "./landmarks";
import { headOf, hipsOf, hipsSeen, shoulderWidthOf } from "./upper-body";

export type Hand = "left" | "right";

/** One arm, read from the picture and from the world points together. */
export interface Arm {
  /** The wrist in the mirrored picture. */
  wrist: Point;
  /** The wrist from its own shoulder, in torso lengths: x to the right, y down. */
  offset: Point;
  /** Shoulder to wrist in the picture, in torso lengths. An arm pointed at the camera looks short here. */
  reach: number;
  /**
   * How straight the arm is, from 3D points: 1 fully straight, about 0.7
   * bent square, lower folded. It does not care which way the arm points.
   */
  extension: number;
  /** How far the wrist is in front of its shoulder, toward the camera, in metres. */
  forward: number;
  /** Shoulder, elbow and wrist are all clearly seen. */
  visible: boolean;
}

/** How fast parts move, in torso lengths per second: x to the right, y down. */
export interface Velocity {
  torso: Point;
  head: Point;
  left: Point;
  right: Point;
}

/**
 * One player's body in one frame. Picture points are 0 to 1 in the
 * mirrored picture. Lengths are in frame heights. Gesture maths divides
 * by `scale` so it works for tall and short players, near or far. All of
 * it comes from the head and shoulders, so the player only needs to be
 * seen from the waist up.
 */
export interface Body {
  /** When the frame was taken, on the performance.now clock. */
  time: number;
  /** The picture's width over its height. */
  aspect: number;
  landmarks: readonly Landmark[];
  world: readonly Landmark[];
  /** How clearly the head and shoulders are seen, 0 to 1. */
  confidence: number;
  /** Shoulder to shoulder as if facing the camera, so turning never changes it. Only distance does. */
  shoulderWidth: number;
  /** Shoulders to hips. A guess from the shoulders when the hips are out of view. */
  torsoLength: number;
  /** The unit for gestures: about one torso length, from the shoulder width, so it needs no hips. */
  scale: number;
  /** The middle of the face points seen. */
  head: Point;
  /** Some of the face was clearly seen. When not, as when a jump takes the head out of the picture, `head` is a guess. */
  headSeen: boolean;
  shoulders: Point;
  /** Seen when `hipsSeen`, else a guess one torso length below the shoulders. */
  hips: Point;
  hipsSeen: boolean;
  /** Halfway between the shoulders and the hips. */
  torso: Point;
  arms: Record<Hand, Arm>;
  velocity: Velocity;
}

/** A torso is about this many shoulder widths long, which makes the unit about one torso length. */
export const TORSO_PER_SHOULDER = 1.45;
/** Velocities are eased a little, since one noisy frame should not look like a punch. */
const VELOCITY_EASE = 0.6;
/** A gap longer than this means the player was away, so speeds start again from rest. */
const MAX_GAP_MS = 250;

export function deriveBody(pose: Pose, time: number, aspect: number, previous: Body | null): Body {
  const at = (i: number) => pose.landmarks[i]!;
  const shoulders = mid(at(LM.leftShoulder), at(LM.rightShoulder));
  const shoulderWidth = shoulderWidthOf(pose, aspect);
  const scale = Math.max(shoulderWidth * TORSO_PER_SHOULDER, 1e-3);
  const hips = hipsOf(pose.landmarks, aspect, scale);
  const torsoLength = span(shoulders, hips, aspect);
  const head = headOf(pose.landmarks);
  const torso = mid(shoulders, hips);
  const arms = {
    left: readArm(pose, "left", aspect, scale),
    right: readArm(pose, "right", aspect, scale),
  };
  const body: Body = {
    time,
    aspect,
    landmarks: pose.landmarks,
    world: pose.world,
    confidence: visibilityOf(pose.landmarks, UPPER_POINTS),
    shoulderWidth,
    torsoLength,
    scale,
    head: head.point,
    headSeen: head.seen,
    shoulders,
    hips,
    hipsSeen: hipsSeen(pose.landmarks),
    torso,
    arms,
    velocity: { torso: { x: 0, y: 0 }, head: { x: 0, y: 0 }, left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
  };
  if (previous) body.velocity = velocityFrom(previous, body);
  return body;
}

function readArm(pose: Pose, hand: Hand, aspect: number, scale: number): Arm {
  const [s, e, w] =
    hand === "left" ? [LM.leftShoulder, LM.leftElbow, LM.leftWrist] : [LM.rightShoulder, LM.rightElbow, LM.rightWrist];
  const shoulder = pose.landmarks[s]!;
  const wrist = pose.landmarks[w]!;
  const S = pose.world[s]!;
  const E = pose.world[e]!;
  const W = pose.world[w]!;
  const length = distance3(S, E) + distance3(E, W);
  return {
    wrist: { x: wrist.x, y: wrist.y },
    offset: { x: ((wrist.x - shoulder.x) * aspect) / scale, y: (wrist.y - shoulder.y) / scale },
    reach: span(shoulder, wrist, aspect) / scale,
    extension: length > 1e-4 ? Math.min(1, distance3(S, W) / length) : 0,
    forward: S.z - W.z,
    visible: Math.min(shoulder.visibility, pose.landmarks[e]!.visibility, wrist.visibility) >= 0.5,
  };
}

function velocityFrom(previous: Body, body: Body): Velocity {
  const dt = (body.time - previous.time) / 1000;
  if (dt <= 0 || dt * 1000 > MAX_GAP_MS) return body.velocity;
  const k = body.scale;
  const rate = (now: Point, before: Point, eased: Point): Point => ({
    x: eased.x + VELOCITY_EASE * (((now.x - before.x) * body.aspect) / k / dt - eased.x),
    y: eased.y + VELOCITY_EASE * ((now.y - before.y) / k / dt - eased.y),
  });
  return {
    torso: rate(body.torso, previous.torso, previous.velocity.torso),
    head: rate(body.head, previous.head, previous.velocity.head),
    left: rate(body.arms.left.wrist, previous.arms.left.wrist, previous.velocity.left),
    right: rate(body.arms.right.wrist, previous.arms.right.wrist, previous.velocity.right),
  };
}
