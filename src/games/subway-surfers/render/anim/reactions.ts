import type { RunEvent } from "../../engine/events";
import type { RunnerState } from "../../engine/runner";
import { laneX } from "../../engine/tuning";
import { stumblePose } from "./gaits";
import { Pose } from "./pose";

/** How long a stumble shakes the body, a landing squashes it, and a blocked step throws it sideways, in seconds. */
const STUMBLE_S = 0.6;
const LAND_S = 0.2;
const SHOVE_S = 0.26;
/** How far a blocked lane change carries the body toward the train before it bounces back, in metres. */
const SHOVE_M = 0.35;

/**
 * The moments the body reacts to on top of its pose: a knock off a train,
 * a heavy landing. Each is laid over whatever pose the runner is in and
 * fades out as it passes.
 */
export class Reactions {
  private readonly jolt = new Pose();
  private stumbleAt = -Infinity;
  private side = 1;
  /** Whether the knock came from a lane change the train stopped, with the body still in its own lane. */
  private blocked = false;
  private landAt = -Infinity;
  private landForce = 0;

  reset(): void {
    this.stumbleAt = -Infinity;
    this.landAt = -Infinity;
  }

  onEvent(event: RunEvent, clock: number, runner: RunnerState | undefined): void {
    if (event.type === "stumble") {
      this.stumbleAt = clock;
      this.side = event.side;
      this.blocked = !!runner && Math.abs(runner.x - laneX(runner.lane)) < 0.3;
    } else if (event.type === "land") {
      this.landAt = clock;
      this.landForce = Math.min(1, event.speed / 14);
    }
  }

  /** Lays a stumble's jolt and a landing's squash over `target`. The squash only shows with feet on the ground. */
  apply(target: Pose, onFeet: boolean, time: number): void {
    const since = time - this.stumbleAt;
    if (since >= 0 && since < STUMBLE_S) {
      const fade = 1 - since / STUMBLE_S;
      stumblePose(this.jolt, this.side, since);
      target.blend(this.jolt, Math.min(1, fade * 1.6));
    }
    const landed = time - this.landAt;
    if (onFeet && landed >= 0 && landed < LAND_S) {
      const squash = Math.sin((landed / LAND_S) * Math.PI) * (0.4 + 0.6 * this.landForce);
      target.add("hipL", 0.35 * squash).add("hipR", 0.35 * squash).add("kneeL", -0.7 * squash).add("kneeR", -0.7 * squash).add("spine", -0.2 * squash);
      target.lift -= 0.14 * squash;
    }
  }

  /** Metres the body is thrown sideways now: toward a train that blocked a lane change, and straight back. */
  shove(time: number): number {
    const since = time - this.stumbleAt;
    if (!this.blocked || since < 0 || since >= SHOVE_S) return 0;
    return this.side * SHOVE_M * Math.sin((since / SHOVE_S) * Math.PI);
  }
}
