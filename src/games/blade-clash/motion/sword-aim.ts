import type { SwordControl } from "@/games/blade-clash/engine/sword";
import { clamp, type Quat } from "@/games/kit/motion/math3d";
import { calibrate, swordPose, type Calibration } from "./sword-pose";

/**
 * Where the blade points on the player's own half of the big screen: x
 * from -1 (left edge) to 1, y from -1 (bottom) to 1. Past the edges it
 * keeps going, which is how a blade is raised straight up or swung wide.
 */
export interface AimPoint {
  x: number;
  y: number;
}

/** How far (radians) this player turns the phone to reach each edge of their view. */
export interface ViewSpans {
  left: number;
  right: number;
  up: number;
  down: number;
}

/** Everything the phone learned while calibrating. */
export interface SwordCalibration {
  /** The grip: which way the phone's blade runs, and which heading is the middle of the screen. */
  grip: Calibration;
  /** How high the blade was when pointing at the middle of the screen. */
  centerPitch: number;
  spans: ViewSpans;
  /** The relaxed guard the player showed, where the arm is at its most bent. */
  guard: AimPoint;
}

/** The blade angle (radians) that reaches each edge of the player's view. */
export const EDGE_YAW = 0.95;
export const EDGE_UP = 1;
export const EDGE_DOWN = 0.95;
/** A relaxed guard for phones that never showed one: low and a little right. */
export const DEFAULT_GUARD: AimPoint = { x: 0.25, y: -0.55 };
/** Spans used for any edge that could not be measured: about right for a TV across a room. */
export const DEFAULT_SPANS: ViewSpans = { left: 0.35, right: 0.35, up: 0.22, down: 0.22 };
/** Pointing this near the middle still stretches the arm all the way. */
const FULL_REACH_ZONE = 0.12;
/** The guard counts as at least this far from the middle, so a guard held near it still leaves room to thrust. */
const MIN_GUARD_DISTANCE = 0.45;

/** Where the blade points on the view, and how the grip is turned, straight from the phone. */
export function aimOf(q: Quat, calibration: SwordCalibration): AimPoint & { roll: number } {
  const pose = swordPose(q, calibration.grip);
  const pitch = pose.pitch - calibration.centerPitch;
  const { spans } = calibration;
  return {
    x: pose.yaw / (pose.yaw < 0 ? spans.left : spans.right),
    y: pitch / (pitch < 0 ? spans.down : spans.up),
    roll: pose.roll,
  };
}

/**
 * Turns an aim into how the sword is held. The blade points where the
 * player points, the view's edges mapping to wide angles so every part of
 * the screen is in reach. The arm is stretched out when pointing at the
 * middle, where the opponent stands, and bent when back at the guard. So a
 * thrust is pointing from the guard at the opponent, quickly.
 */
export function controlFromAim(aim: AimPoint, roll: number, guard: AimPoint = DEFAULT_GUARD): SwordControl {
  const guardDistance = Math.max(MIN_GUARD_DISTANCE, Math.hypot(guard.x, guard.y));
  const fromMiddle = Math.max(0, Math.hypot(aim.x, aim.y) - FULL_REACH_ZONE);
  const reach = clamp(1 - fromMiddle / (guardDistance - FULL_REACH_ZONE), 0, 1);
  return {
    yaw: aim.x * EDGE_YAW,
    pitch: aim.y * (aim.y < 0 ? EDGE_DOWN : EDGE_UP),
    roll,
    reach: reach * reach * (3 - 2 * reach),
  };
}

/** The calibration targets, where on the view each one sits. */
export const CORNER_TARGETS = {
  "top-left": { x: -0.8, y: 0.8 },
  "top-right": { x: 0.8, y: 0.8 },
  "bottom-right": { x: 0.8, y: -0.8 },
  "bottom-left": { x: -0.8, y: -0.8 },
} as const;

export type Corner = keyof typeof CORNER_TARGETS;

/** Smallest believable span, so a sloppy corner never makes the blade twitchy. */
const MIN_SPAN = 0.06;

/**
 * Builds the calibration from the phone's orientation at each target: the
 * middle first, which fixes the grip, then any corners, then the guard.
 * Each edge's span is the average of the two corners on that side, scaled
 * out from the target to the true edge. A corner pointed the wrong way is
 * left out, and an edge with no good corner borrows the opposite edge.
 */
export function buildCalibration(center: Quat, corners: Partial<Record<Corner, Quat>>, guard: Quat | null): SwordCalibration {
  const grip = calibrate(center);
  const centerPitch = swordPose(center, grip).pitch;
  const reads: Record<keyof ViewSpans, number[]> = { left: [], right: [], up: [], down: [] };
  for (const corner of Object.keys(corners) as Corner[]) {
    const pose = swordPose(corners[corner]!, grip);
    const target = CORNER_TARGETS[corner];
    const yawSpan = pose.yaw / target.x;
    const pitchSpan = (pose.pitch - centerPitch) / target.y;
    if (yawSpan >= MIN_SPAN) reads[target.x < 0 ? "left" : "right"].push(yawSpan);
    if (pitchSpan >= MIN_SPAN) reads[target.y < 0 ? "down" : "up"].push(pitchSpan);
  }
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const pick = (own: keyof ViewSpans, other: keyof ViewSpans) => mean(reads[own]) ?? mean(reads[other]) ?? DEFAULT_SPANS[own];
  const spans = { left: pick("left", "right"), right: pick("right", "left"), up: pick("up", "down"), down: pick("down", "up") };
  const calibration: SwordCalibration = { grip, centerPitch, spans, guard: DEFAULT_GUARD };
  if (guard) {
    const at = aimOf(guard, calibration);
    calibration.guard = { x: at.x, y: at.y };
  }
  return calibration;
}
