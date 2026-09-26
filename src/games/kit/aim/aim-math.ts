import { clamp, rotate, wrapAngle, type Quat } from "@/games/kit/motion/math3d";

/**
 * Where the phone's top edge points, as a compass heading and an
 * elevation, both in radians. Only the top edge matters, so twisting the
 * phone in the hand never moves the aim.
 */
export interface Pointing {
  /** Clockwise from the phone's idea of north. Only differences matter. */
  yaw: number;
  /** Up from level. */
  pitch: number;
}

/**
 * The phone's aim, turned into screen space. The centre reading is where
 * the player pointed at the middle of the screen. The four spans are how
 * far they turned to reach each edge, measured separately because people
 * rarely sit square to the screen.
 */
export interface AimCalibration {
  center: Pointing;
  left: number;
  right: number;
  up: number;
  down: number;
}

/** A point on the big screen: x from -1 (left edge) to 1, y from -1 (bottom) to 1, like WebGL clip space. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * The part of the big screen a player aims inside, as fractions of it
 * from the top left, the same shape as a split screen view. A game with
 * one view per player gives each their own zone; calibration targets
 * then show inside it, and the -1 to 1 aim spans the zone, not the screen.
 */
export interface AimZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The whole screen, which is every player's zone unless a game says otherwise. */
export const WHOLE_SCREEN: AimZone = { x: 0, y: 0, w: 1, h: 1 };

export function sameZone(a: AimZone, b: AimZone): boolean {
  return a === b || (a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);
}

/**
 * A point in one zone, as the same spot on the screen in another zone's
 * terms. It lets a player keep aiming where they really point after the
 * split screen changes shape, without calibrating again.
 */
export function rezone(point: ScreenPoint, from: AimZone, to: AimZone): ScreenPoint {
  if (sameZone(from, to)) return point;
  const sx = from.x + ((point.x + 1) / 2) * from.w;
  const sy = from.y + ((1 - point.y) / 2) * from.h;
  return { x: ((sx - to.x) / to.w) * 2 - 1, y: 1 - ((sy - to.y) / to.h) * 2 };
}

/**
 * Spans measured across a zone, scaled to what they would be across the
 * whole screen, or back with `inverse`. Saved spans are kept whole screen
 * so any game can reuse them, whatever zone it measured them in.
 */
export function scaleSpans(calibration: AimCalibration, zone: AimZone, inverse = false): AimCalibration {
  const sx = inverse ? zone.w : 1 / zone.w;
  const sy = inverse ? zone.h : 1 / zone.h;
  return { ...calibration, left: calibration.left * sx, right: calibration.right * sx, up: calibration.up * sy, down: calibration.down * sy };
}

/** Corner targets sit this far in from the edges, in screen units, so they are easy to see. */
export const TARGET_INSET = 0.8;

/** Spans used before the corners are measured: about right for a TV across a room. */
export const DEFAULT_SPAN = { x: 0.34, y: 0.2 };

/** Smallest believable span, so a sloppy corner never makes the aim twitchy. */
const MIN_SPAN = 0.05;

/** How far past the edge the aim may wander before it is held at the edge. */
const OVERSHOOT = 1.15;

export function pointing(q: Quat): Pointing {
  const top = rotate(q, { x: 0, y: 1, z: 0 });
  return { yaw: Math.atan2(top.x, top.y), pitch: Math.asin(clamp(top.z, -1, 1)) };
}

/** A calibration from the centre alone, with default spans. */
export function quickCalibration(center: Pointing): AimCalibration {
  return { center, left: DEFAULT_SPAN.x, right: DEFAULT_SPAN.x, up: DEFAULT_SPAN.y, down: DEFAULT_SPAN.y };
}

/**
 * The full calibration, from the centre and the two corner targets. Each
 * corner reading is scaled out from the target's inset to the true edge.
 * A corner pointed the wrong way (left of centre for the right corner,
 * say) is ignored in favour of the opposite side's span.
 */
export function cornerCalibration(center: Pointing, topLeft: Pointing, bottomRight: Pointing): AimCalibration {
  const span = (value: number) => value / TARGET_INSET;
  const left = span(-wrapAngle(topLeft.yaw - center.yaw));
  const right = span(wrapAngle(bottomRight.yaw - center.yaw));
  const up = span(topLeft.pitch - center.pitch);
  const down = span(center.pitch - bottomRight.pitch);
  const pick = (own: number, other: number, fallback: number) => (own >= MIN_SPAN ? own : other >= MIN_SPAN ? other : fallback);
  return {
    center,
    left: pick(left, right, DEFAULT_SPAN.x),
    right: pick(right, left, DEFAULT_SPAN.x),
    up: pick(up, down, DEFAULT_SPAN.y),
    down: pick(down, up, DEFAULT_SPAN.y),
  };
}

/** Keeps the spans and moves the centre, for when the gyro drifts during play. */
export function recenter(calibration: AimCalibration, center: Pointing): AimCalibration {
  return { ...calibration, center };
}

export function toScreen(reading: Pointing, calibration: AimCalibration): ScreenPoint {
  const yaw = wrapAngle(reading.yaw - calibration.center.yaw);
  const pitch = reading.pitch - calibration.center.pitch;
  const x = yaw / (yaw < 0 ? calibration.left : calibration.right);
  const y = pitch / (pitch < 0 ? calibration.down : calibration.up);
  return { x: clamp(x, -OVERSHOOT, OVERSHOOT), y: clamp(y, -OVERSHOOT, OVERSHOOT) };
}
