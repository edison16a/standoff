import { describe, expect, it } from "vitest";
import type { RunEvent } from "./events";
import { newRunner } from "./runner";
import { TrainWatch } from "./trains";
import { trainLength } from "./tuning";
import type { Obstacle } from "./types";

describe("trains rolling in", () => {
  it("sound one horn as each comes near, and one rush of air as it passes", () => {
    const watch = new TrainWatch();
    const moving: Obstacle = { id: 7, kind: "train", lane: 1, z: 100, length: trainLength(2), drift: 0.5, style: 0, cars: 2 };
    const standing: Obstacle = { ...moving, id: 8, lane: -1, drift: 0 };
    const s = newRunner();
    const heard: RunEvent[] = [];
    for (let d = 0; d < 140; d += 0.5) {
      s.distance = d;
      watch.check([moving, standing], s, (e) => heard.push(e));
    }
    expect(heard).toEqual([
      { type: "horn", lane: 1, obstacleId: 7 },
      { type: "passBy", side: 1 },
    ]);
  });
});
