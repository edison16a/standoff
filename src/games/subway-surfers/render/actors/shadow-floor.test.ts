import { describe, expect, it } from "vitest";
import { Run } from "../../engine/run";
import { laneX, TRAIN, trainLength } from "../../engine/tuning";
import { shadowFloor } from "./shadow-floor";

/** An empty practice yard with one standing train in the middle track, from 20 m to its end. */
function yardWithTrain(): Run {
  const run = new Run(1, { practice: true });
  run.course.obstacles.push({ id: 900, kind: "train", lane: 0, z: 20, length: trainLength(1), drift: 0, style: 0, cars: 1 });
  return run;
}

/** Puts the runner in the air at `distance`, `y` metres up. */
function airborne(run: Run, distance: number, y: number, x = laneX(0)): void {
  Object.assign(run.runner, { distance, y, x, grounded: false, airTime: 0.4 });
}

describe("shadowFloor", () => {
  it("keeps the shadow on the ground under a high jump over an empty track", () => {
    // Jump boots go higher than a roof. The shadow used to jump up to roof height in mid air.
    const run = yardWithTrain();
    airborne(run, 5, 3.8);
    expect(shadowFloor(run)).toBe(0);
  });

  it("puts the shadow on the roof while the runner is over the train", () => {
    const run = yardWithTrain();
    airborne(run, 26, 4.2);
    expect(shadowFloor(run)).toBe(TRAIN.height);
  });

  it("drops the shadow to the ground once the runner jumps past the end of the roof", () => {
    const run = yardWithTrain();
    airborne(run, 20 + trainLength(1) + 1, 3.6);
    expect(shadowFloor(run)).toBe(0);
  });

  it("reads the train in the lane below, not the one beside", () => {
    const run = yardWithTrain();
    airborne(run, 26, 4.2, laneX(1));
    expect(shadowFloor(run)).toBe(0);
  });

  it("follows the runner's feet while grounded", () => {
    const run = yardWithTrain();
    Object.assign(run.runner, { distance: 26, y: TRAIN.height, grounded: true });
    expect(shadowFloor(run)).toBe(TRAIN.height);
  });
});
