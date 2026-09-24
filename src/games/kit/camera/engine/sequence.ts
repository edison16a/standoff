import { deriveBody, type Body } from "./body";
import { sampleOf, type Baseline } from "./calibration";
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
