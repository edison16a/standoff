import type { RunEvent } from "./events";
import type { RunnerState } from "./runner";
import { laneX } from "./tuning";
import { frontAt, type Obstacle } from "./types";

/** A horn sounds when a train rolling in comes this close, in metres. */
const HORN_AT = 75;

/**
 * Trains rolling toward the runner: a horn as each comes near, and a
 * rush of air as it goes by. Each is told once, however long it takes
 * to pass.
 */
export class TrainWatch {
  private readonly horned = new Set<number>();
  private readonly passed = new Set<number>();

  check(obstacles: readonly Obstacle[], s: RunnerState, emit: (event: RunEvent) => void): void {
    for (const o of obstacles) {
      if (!o.drift) continue;
      const gap = frontAt(o, s.distance) - s.distance;
      if (gap < HORN_AT && gap > 0 && !this.horned.has(o.id)) {
        this.horned.add(o.id);
        emit({ type: "horn", lane: o.lane, obstacleId: o.id });
      }
      if (gap < 0 && !this.passed.has(o.id)) {
        this.passed.add(o.id);
        emit({ type: "passBy", side: laneX(o.lane) < s.x ? -1 : 1 });
      }
    }
  }
}
