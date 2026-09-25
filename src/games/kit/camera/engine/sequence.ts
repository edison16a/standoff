import { deriveBody, type Body } from "./body";
import { sampleOf, type Baseline } from "./calibration";
import { MoveReader, type MoveEvent, type MoveState } from "./gestures/moves";
import type { MoveTuning } from "./gestures/options";
import { LandmarkSmoother } from "./smoothing";
import { syntheticPose, type PoseSpec } from "./synthetic";
import { poseAt, timelineLength, type PoseKey } from "./timeline";

export interface SequenceOptions {
  fps?: number;
  aspect?: number;
  /** Run the points through the kit's smoothing, as the live tracker does. */
  smooth?: boolean;
  /** Milliseconds added to every time, so sequences can follow on from each other. */
  start?: number;
  /** Keep going this long after the last key. */
  tail?: number;
}

/**
 * Plays a scripted movement at a steady frame rate and returns the body
 * the kit would read on each frame. Unit tests use it to try gestures on
 * tall and short players, near and far, and at slow frame rates.
 */
export function bodiesFrom(keys: readonly PoseKey[], options: SequenceOptions = {}): Body[] {
  const { fps = 30, aspect = 16 / 9, smooth = false, start = 0, tail = 300 } = options;
  const smoother = smooth ? new LandmarkSmoother() : null;
  const end = timelineLength(keys) + tail;
  const bodies: Body[] = [];
  let previous: Body | null = null;
  for (let t = 0; t <= end; t += 1000 / fps) {
    const raw = syntheticPose(poseAt(keys, t), aspect);
    const pose = smoother ? smoother.smooth(raw, start + t) : raw;
    previous = deriveBody(pose, start + t, aspect, previous);
    bodies.push(previous);
  }
  return bodies;
}

/** The baseline a player standing still in this pose would get from calibration. */
export function baselineFor(spec: PoseSpec, slot = 1, aspect = 16 / 9): Baseline {
  return sampleOf(deriveBody(syntheticPose(spec, aspect), 0, aspect, null), slot);
}

export interface ReadFrame {
  body: Body;
  events: MoveEvent[];
  state: MoveState;
}

/**
 * Plays a movement through a move reader calibrated standing still in
 * `base`, as the tracker does, and returns every frame's events and state.
 */
export function readMoves(keys: readonly PoseKey[], base: PoseSpec = {}, options: SequenceOptions & { tuning?: MoveTuning } = {}): ReadFrame[] {
  const reader = new MoveReader(1, options.tuning);
  reader.setBaseline(baselineFor(base, 1, options.aspect));
  return bodiesFrom(keys, options).map((body) => ({ body, events: reader.update(body, body.time), state: reader.current }));
}

/** Every event of one type in a run of frames. */
export function eventsOf(frames: readonly ReadFrame[], type: MoveEvent["type"]): MoveEvent[] {
  return frames.flatMap((frame) => frame.events).filter((event) => event.type === type);
}
