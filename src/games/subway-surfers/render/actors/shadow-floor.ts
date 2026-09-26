import type { Run } from "../../engine/run";
import { groundUnder } from "../../engine/runner";
import type { Obstacle } from "../../engine/types";

const nearby: Obstacle[] = [];

/**
 * The surface under the runner, for their shadow: the ground, or the
 * roof, ramp or barrier top they are over right now. It asks the course
 * the way the runner's own feet do, so the shadow stays on the ground
 * under a high jump over an empty track and leaves a roof the moment
 * the runner jumps past its end.
 */
export function shadowFloor(run: Run): number {
  const s = run.runner;
  if (s.grounded) return s.y;
  return groundUnder(s.x, s.y, s.distance, run.course.near(s.distance, 1, nearby));
}
