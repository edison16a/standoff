import { describe, expect, it } from "vitest";
import { collectCoins, touchesCoin } from "./collect";
import { Course } from "./course";
import { newRunner } from "./runner";
import { COIN, laneX, RUNNER, SPEED, STEP_S } from "./tuning";
import { ShowRun } from "../showcase/show-run";
import { SHOTS } from "../showcase/director";

/** An empty yard with coins where the test puts them. */
function yard(...coins: [number, number, number][]): Course {
  const course = new Course(1, { empty: true });
  for (const [x, y, z] of coins) course.addCoin(x, y, z);
  return course;
}

describe("picking up coins", () => {
  it("takes a coin only once its edge meets the body", () => {
    expect(COIN.reachZ).toBeLessThanOrEqual(RUNNER.halfDepth + COIN.halfThick + 1e-9);
    expect(COIN.reachX).toBeLessThanOrEqual(RUNNER.halfWidth + COIN.radius + 1e-9);
    const s = newRunner(0, 0);
    const course = yard([0, COIN.y, 6]);
    let gapWhenTaken = Infinity;
    for (let i = 0; i < 400 && course.coins.length; i++) {
      const gap = 6 - s.distance;
      if (collectCoins(course, s, false, STEP_S).length) gapWhenTaken = gap;
      else expect(gap > COIN.reachZ || gap < -COIN.reachZ).toBe(true);
      s.distance += 12 * STEP_S;
    }
    expect(gapWhenTaken).toBeLessThanOrEqual(COIN.reachZ);
  });

  it("never misses a coin in its lane, even at top speed", () => {
    const s = newRunner(0, 0);
    const course = yard(...Array.from({ length: 40 }, (_, i) => [0, COIN.y, 5 + i * 3] as [number, number, number]));
    let taken = 0;
    for (let i = 0; i < 2000; i++) {
      taken += collectCoins(course, s, false, STEP_S).length;
      s.distance += SPEED.max * STEP_S;
    }
    expect(taken).toBe(40);
  });

  it("leaves coins in the next lane alone without a magnet", () => {
    const s = newRunner(0, 0);
    expect(touchesCoin({ id: 1, x: laneX(1), y: COIN.y, z: 0 }, s)).toBe(false);
    expect(touchesCoin({ id: 1, x: 0, y: COIN.y, z: 0 }, s)).toBe(true);
  });

  it("with a magnet, pulls coins in so they fly to the runner before they count", () => {
    const s = newRunner(0, 0);
    const course = yard([laneX(1), COIN.y, 12]);
    const coin = course.coins[0]!;
    const path: number[] = [];
    let arrived: { pulled: boolean } | null = null;
    for (let i = 0; i < 240 && !arrived; i++) {
      const found = collectCoins(course, s, true, STEP_S);
      if (found.length) arrived = found[0]!;
      else path.push(Math.hypot(coin.x - s.x, coin.y - (s.y + 0.9), coin.z - s.distance));
      s.distance += 20 * STEP_S;
    }
    expect(arrived?.pulled).toBe(true);
    // It flew for a visible moment, coming steadily nearer, and counted only once it reached the body.
    expect(path.length).toBeGreaterThan(20);
    for (let i = 1; i < path.length; i++) expect(path[i]!).toBeLessThan(path[i - 1]!);
    expect(path.at(-1)!).toBeLessThan(1.5);
  });
});

describe("the home screen clip", () => {
  it("only takes coins the runner touches, or that a magnet has flown in", () => {
    const shot = SHOTS.loop;
    const show = new ShowRun(shot.seed, shot.warmup, (run) => shot.powers?.forEach((kind) => run.powers.start(kind)));
    const run = show.run;
    let coins = 0;
    for (let i = 0; i < 60 * 12; i++) {
      for (const e of show.advance(1 / 60)) {
        if (e.type !== "coin") continue;
        coins++;
        // The clip plays two steps a frame, so the runner may have run on one step since.
        const s = run.runner;
        const since = run.speed * STEP_S;
        if (e.pulled) expect(Math.hypot(e.x - s.x, e.y - (s.y + 0.9), e.z - s.distance)).toBeLessThan(0.5 + since);
        else expect(Math.abs(e.z - s.distance)).toBeLessThanOrEqual(COIN.reachZ + since);
      }
    }
    expect(coins).toBeGreaterThan(5);
  });
});
