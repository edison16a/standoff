import { describe, expect, it } from "vitest";
import { Block } from "./block";
import { touchesCoin } from "./collect";
import { airTime, arcHeight, fallTime, launchSpeed, riseTime, sideStep, startBurst } from "./motion";
import { newRunner, stepRunner } from "./runner";
import { BARRIER, JUMP, LANE_WIDTH, SPEED, STEP_S } from "./tuning";

describe("the jump arc", () => {
  it("tops out at its height and comes back down in about 0.7 seconds", () => {
    expect(arcHeight(JUMP.height, riseTime(JUMP.height))).toBeCloseTo(JUMP.height, 5);
    expect(arcHeight(JUMP.height, airTime(JUMP.height))).toBeCloseTo(0, 5);
    expect(airTime(JUMP.height)).toBeGreaterThan(0.65);
    expect(airTime(JUMP.height)).toBeLessThan(0.75);
  });

  it("falls quicker than it rises, so the landing snaps", () => {
    expect(fallTime(JUMP.height)).toBeLessThan(riseTime(JUMP.height) * 0.9);
  });

  it("clears a low barrier for most of the jump", () => {
    let clear = 0;
    for (let t = 0; t < airTime(JUMP.height); t += 0.01) if (arcHeight(JUMP.height, t) > BARRIER.lowTop - 0.5) clear += 0.01;
    expect(clear).toBeGreaterThan(0.5);
  });

  it("is the path the runner really takes, so a coin arc is picked up whole", () => {
    const block = new Block(14, () => 0);
    block.coinArc(0, 20);
    const s = newRunner();
    const speed = { speed: 14, jumpHeight: JUMP.height, fly: null };
    const takeoff = 20 - 14 * riseTime(JUMP.height);
    const left = new Set(block.coins.map((c, id) => ({ ...c, id })));
    let top = 0;
    let jumped = false;
    while (s.distance < 35) {
      const jump: boolean = !jumped && s.distance >= takeoff;
      jumped ||= jump;
      stepRunner(s, { lane: 0, jump, duck: false, ducking: false }, [], speed, STEP_S);
      top = Math.max(top, s.y);
      for (const coin of left) if (touchesCoin(coin, s)) left.delete(coin);
    }
    expect(left.size).toBe(0);
    expect(top).toBeCloseTo(JUMP.height, 1);
    expect(launchSpeed(JUMP.height)).toBeGreaterThan(0);
  });
});

describe("a lane change", () => {
  function timeToCross(within: number): number {
    let x = 0;
    let t = 0;
    while (Math.abs(LANE_WIDTH - x) > within && t < 1) {
      x += sideStep(LANE_WIDTH - x, STEP_S);
      t += STEP_S;
    }
    return t;
  }

  it("snaps across a lane in about 0.15 seconds", () => {
    expect(timeToCross(LANE_WIDTH * 0.1)).toBeLessThan(0.11);
    expect(timeToCross(0.02)).toBeLessThan(0.17);
    expect(timeToCross(0.001)).toBeLessThan(0.2);
  });

  it("never overshoots the track", () => {
    let x = 0;
    for (let i = 0; i < 60; i++) {
      x += sideStep(LANE_WIDTH - x, STEP_S);
      expect(x).toBeLessThanOrEqual(LANE_WIDTH);
    }
    expect(x).toBe(LANE_WIDTH);
  });
});

describe("the start", () => {
  it("bursts from a standing start to the full pace", () => {
    expect(startBurst(0)).toBe(SPEED.burstFrom);
    expect(startBurst(SPEED.burstS / 2)).toBeGreaterThan(0.8);
    expect(startBurst(SPEED.burstS)).toBe(1);
    expect(startBurst(10)).toBe(1);
  });
});
