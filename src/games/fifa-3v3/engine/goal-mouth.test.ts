import { describe, expect, it } from "vitest";
import { OPEN_MOUTH, openMouth } from "./goal-mouth";
import { guessSide, keeperReach, READ } from "./set-piece-save";
import { shotOdds, type ShotContext } from "./shot-odds";
import { GOAL_GROWTH, KEEPER, PITCH } from "./tuning";

const typical: ShotContext = { distance: 12, angle: 0.3, shooting: 0.7, pressure: 0.3, keeperOff: 0, power: 0.5, spread: 0.2, beaten: false };

describe("the goal", () => {
  it("is 1.5 to 2 times the old 5.8 by 2.3 metre face", () => {
    const face = PITCH.goalHalfWidth * 2 * PITCH.goalHeight;
    expect(face / (5.8 * 2.3)).toBeGreaterThanOrEqual(1.5);
    expect(face / (5.8 * 2.3)).toBeLessThanOrEqual(2);
    expect(GOAL_GROWTH.wide).toBeGreaterThan(1);
  });

  it("keeps the keeper the same size, reach and speed", () => {
    expect(KEEPER.height).toBe(1.9);
    expect(KEEPER.reach).toBe(2.16);
    expect(KEEPER.speed).toBe(5.8);
    expect(keeperReach(Infinity, 0)).toBeCloseTo(3.3, 6);
  });

  it("leaves room past the keeper that the old goal did not", () => {
    expect(openMouth(2.9, 2.3)).toBeLessThan(0.1);
    expect(OPEN_MOUTH).toBeGreaterThan(0.25);
    expect(openMouth(1, 1)).toBe(0);
  });

  it("lets more shots beat the keeper than the old goal would, most for a clean chance", () => {
    const odds = shotOdds(typical);
    // How much open room the bigger goal adds.
    const gain = OPEN_MOUTH - openMouth(2.9, 2.3);
    expect(gain).toBeGreaterThan(0.2);
    expect(odds.goal).toBeGreaterThan(0.22);
    expect(shotOdds({ ...typical, distance: 6, angle: 0 }).goal).toBeGreaterThan(shotOdds({ ...typical, distance: 22 }).goal * 2);
  });
});

describe("the penalty keeper", () => {
  it("picks the right side a little over half the time when he goes, and sometimes stays up", () => {
    let right = 0;
    let stayed = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const g = guessSide((i * 0.618) % 1, (i * 0.377) % 1, 1);
      if (g === 1) right++;
      if (g === 0) stayed++;
    }
    expect(stayed / n).toBeCloseTo(READ.stay, 1);
    expect(right / (n - stayed)).toBeGreaterThan(0.5);
    expect(right / (n - stayed)).toBeLessThan(0.7);
    expect([1, -1]).toContain(guessSide(0.5, 0.2, 0));
  });
});
