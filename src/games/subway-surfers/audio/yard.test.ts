import { describe, expect, it } from "vitest";
import { Run } from "../engine/run";
import { trainLength } from "../engine/tuning";
import type { Obstacle } from "../engine/types";
import { trainNearness } from "./yard";

function withTrain(drift: number, meet: number): Run {
  const run = new Run(1, { practice: true });
  const train: Obstacle = { id: 1, kind: "train", lane: 1, z: meet, length: trainLength(2), drift, style: 0, cars: 2 };
  run.course.obstacles.push(train);
  return run;
}

describe("the train rumble", () => {
  it("is silent for standing trains and trains far off", () => {
    expect(trainNearness(withTrain(0, 20))).toBe(0);
    expect(trainNearness(withTrain(0.5, 200))).toBe(0);
  });

  it("swells as a train rolls in, and is loudest alongside", () => {
    const run = withTrain(0.5, 60);
    const far = trainNearness(run);
    run.runner.distance = 40;
    const closer = trainNearness(run);
    run.runner.distance = 62;
    expect(far).toBeGreaterThan(0);
    expect(closer).toBeGreaterThan(far);
    expect(trainNearness(run)).toBe(1);
  });
});
