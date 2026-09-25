import { describe, expect, it } from "vitest";
import { CENTER } from "@/games/kit/pad/stick-math";
import { STEP } from "../engine/tuning";
import { MatchDriver } from "./match-driver";

const ENTRANTS = [
  { character: "karate" as const, seat: 1 },
  { character: "bear" as const, seat: null },
];

describe("the match driver", () => {
  it("steps at a fixed rate whatever the frame length, and caps a stall", () => {
    const driver = new MatchDriver(ENTRANTS, { seed: 3 });
    let steps = 0;
    driver.advance(STEP * 2.5, () => CENTER, { after: () => steps++ });
    expect(steps).toBe(2);
    expect(driver.alpha).toBeCloseTo(0.5, 5);
    driver.advance(5, () => CENTER, { after: () => steps++ });
    expect(steps).toBe(8);
  });

  it("turns a phone's up press into a jump once the fight is on", () => {
    const driver = new MatchDriver(ENTRANTS, { seed: 3 });
    while (driver.state.phase !== "fight") driver.advance(STEP, () => CENTER);
    driver.advance(STEP * 10, () => CENTER);
    driver.press(1, "up", true);
    const jumps: boolean[] = [];
    for (let i = 0; i < 10; i++) driver.advance(STEP, () => CENTER, { after: (s) => s.events.forEach((e) => e.type === "jump" && jumps.push(e.double)) });
    driver.press(1, "up", false);
    expect(jumps).toEqual([false]);
  });

  it("hands a dropped phone's fighter to a bot and back", () => {
    const driver = new MatchDriver(ENTRANTS, { seed: 3 });
    driver.setOnline(1, false);
    expect(driver.state.fighters[0]!.brain).not.toBeNull();
    driver.setOnline(1, true);
    expect(driver.state.fighters[0]!.brain).toBeNull();
  });

  it("slows time for a moment", () => {
    const driver = new MatchDriver(ENTRANTS, { seed: 3 });
    driver.slowMo(0.25, 1);
    expect(driver.advance(0.1, () => CENTER)).toBeCloseTo(0.025, 5);
  });
});
