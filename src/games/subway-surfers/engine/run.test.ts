import { describe, expect, it } from "vitest";
import type { RunEvent } from "./events";
import { JETPACK_HEIGHT, POWER_SECONDS } from "./powers";
import { Run } from "./run";
import { BARRIER, COIN, TRAIN, trainLength, ZONE_LENGTH, type Lane } from "./tuning";
import type { Obstacle, ObstacleKind, PowerKind } from "./types";

let nextId = 1000;

/** A practice run (an empty yard at a jog) with whatever the test puts in it. */
function yard(): Run {
  return new Run(1, { practice: true });
}

function put(run: Run, kind: ObstacleKind, lane: Lane, z: number, length = kind === "train" ? trainLength(1) : BARRIER.depth): Obstacle {
  const o: Obstacle = { id: nextId++, kind, lane, z, length, drift: 0, style: 0, cars: 1 };
  run.course.obstacles.push(o);
  return o;
}

function give(run: Run, kind: PowerKind, z = 2): void {
  run.course.pickups.push({ id: nextId++, kind, lane: 0, y: 1.15, z });
}

/** Runs for `seconds`, collecting every event. */
function go(run: Run, seconds: number, each: (run: Run) => void = () => undefined): RunEvent[] {
  const events: RunEvent[] = [];
  for (let t = 0; t < seconds && !run.crashed; t += 1 / 60) {
    each(run);
    run.update(1 / 60);
    events.push(...run.drain());
  }
  return events;
}

describe("a run", () => {
  it("counts coins and scores them with the distance", () => {
    const run = yard();
    for (let z = 5; z < 20; z += 3) run.course.addCoin(0, COIN.y, z);
    const events = go(run, 5);
    expect(run.coins).toBe(5);
    expect(events.filter((e) => e.type === "coin").map((e) => (e.type === "coin" ? e.streak : 0))).toEqual([1, 2, 3, 4, 5]);
    expect(run.score).toBeCloseTo(run.runner.distance + 5 * COIN.points, 0);
  });

  it("ends when the runner hits something head on", () => {
    const run = yard();
    put(run, "low", 0, 10);
    const events = go(run, 5);
    expect(run.crashed?.cause).toBe("low");
    expect(events.at(-1)?.type).toBe("crash");
    expect(run.speed).toBe(0);
  });

  it("lets a hoverboard take one crash, smashing the barrier", () => {
    const run = yard();
    give(run, "hoverboard");
    const first = put(run, "low", 0, 10);
    put(run, "low", 0, 20);
    const events = go(run, 6);
    expect(events.some((e) => e.type === "saved" && e.obstacleId === first.id)).toBe(true);
    expect(run.course.smashed.has(first.id)).toBe(true);
    expect(run.crashed?.cause).toBe("low");
  });

  it("lets a hoverboard hop the runner up onto a train it hits", () => {
    const run = yard();
    give(run, "hoverboard");
    put(run, "train", 0, 10);
    go(run, 2.5);
    expect(run.crashed).toBeNull();
    expect(run.runner.y).toBeCloseTo(TRAIN.height, 1);
  });

  it("gets caught by the guard after two stumbles close together", () => {
    const run = yard();
    put(run, "train", 1, -5, 12);
    put(run, "train", 1, 7.2, 12);
    const events = go(run, 6, (r) => r.input(1));
    expect(events.filter((e) => e.type === "stumble")).toHaveLength(2);
    expect(run.crashed?.cause).toBe("caught");
  });

  it("pulls in coins from other lanes with the magnet", () => {
    const run = yard();
    give(run, "magnet");
    for (const lane of [-1, 1]) for (let z = 8; z < 30; z += 3) run.course.addCoin(lane * 2.6, COIN.y, z);
    go(run, 7);
    expect(run.coins).toBe(16);
  });

  it("doubles the score with the multiplier", () => {
    const run = yard();
    give(run, "double", 1);
    go(run, 1);
    expect(run.multiplier).toBe(2);
    go(run, POWER_SECONDS.double);
    expect(run.multiplier).toBe(1);
  });

  it("flies over everything with the jetpack, then lands safely", () => {
    const run = yard();
    give(run, "jetpack");
    for (const z of [15, 27]) put(run, "train", 0, z, 10);
    let top = 0;
    go(run, POWER_SECONDS.jetpack + 4, (r) => {
      top = Math.max(top, r.runner.y);
      // Steer after the trail of coins in the sky.
      const next = r.course.coins.find((c) => c.z > r.runner.distance && c.y > JETPACK_HEIGHT);
      if (next) r.input(Math.round(next.x / 2.6) as Lane);
    });
    expect(top).toBeGreaterThan(JETPACK_HEIGHT - 0.5);
    expect(run.crashed).toBeNull();
    expect(run.coins).toBeGreaterThanOrEqual(4);
  });

  it("raises the multiplier every stretch of scenery", () => {
    const run = new Run(3);
    run.runner.distance = ZONE_LENGTH - 1;
    run.course.obstacles.length = 0;
    const events = go(run, 0.5);
    expect(events).toContainEqual({ type: "level", multiplier: 2 });
  });

  it("waits for a move made in the air and jumps again on landing", () => {
    const run = yard();
    run.input(0, { jump: true });
    go(run, 0.6);
    run.input(0, { jump: true });
    const events = go(run, 0.6);
    expect(events.filter((e) => e.type === "jump")).toHaveLength(1);
  });
});
