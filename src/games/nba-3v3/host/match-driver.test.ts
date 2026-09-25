import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { MatchDriver } from "./match-driver";

const ENTRIES = [
  { team: 0 as const, character: "curry" as const, seat: 1 },
  { team: 0 as const, character: "giannis" as const, seat: null },
  { team: 0 as const, character: "jokic" as const, seat: null },
  { team: 1 as const, character: "lebron" as const, seat: 2 },
  { team: 1 as const, character: "doncic" as const, seat: null },
  { team: 1 as const, character: "wemby" as const, seat: null },
];

describe("the match driver", () => {
  it("maps the stick to the screen: up runs at the hoop, right runs right", () => {
    const driver = new MatchDriver(ENTRIES, 1);
    expect(driver.toCourt({ x: 0, y: 1 })).toEqual({ x: 0, z: -1 });
    expect(driver.toCourt({ x: 1, y: 0 })).toEqual({ x: 1, z: 0 });
    // A camera turned a quarter to the right: up the screen is now +x on the court.
    driver.setView({ x: 1, z: 0 });
    const up = driver.toCourt({ x: 0, y: 1 });
    expect(up.x).toBeCloseTo(1);
    expect(up.z).toBeCloseTo(0);
  });

  it("moves a phone's player with its stick once the game is live", () => {
    const driver = new MatchDriver(ENTRIES, 1);
    const curry = driver.match.athletes[0]!;
    const start = curry.z;
    for (let i = 0; i < 300; i++) driver.tick(1 / 60, (seat) => (seat === 1 ? { x: 0, y: 1 } : { x: 0, y: 0 }));
    expect(driver.match.phase).toBe("live");
    for (let i = 0; i < 30; i++) driver.tick(1 / 60, (seat) => (seat === 1 ? { x: 0, y: 1 } : { x: 0, y: 0 }));
    expect(curry.z).toBeLessThan(start - 0.5);
  });

  it("hands a dropped phone's player to the computer and back", () => {
    const driver = new MatchDriver(ENTRIES, 1);
    driver.setOnline(2, false);
    expect(driver.match.athletes[3]!.auto).toBe(true);
    driver.setOnline(2, true);
    expect(driver.match.athletes[3]!.auto).toBe(false);
  });

  it("slows game time for the big moments", () => {
    const driver = new MatchDriver(ENTRIES, 1);
    driver.slowMo(0.25, 0.5);
    expect(driver.tick(0.1, () => ({ x: 0, y: 0 }))).toBeCloseTo(0.025);
    const events: MatchEvent[] = [];
    driver.listen((e) => events.push(e));
    for (let i = 0; i < 200; i++) driver.tick(1 / 30, () => ({ x: 0, y: 0 }));
    expect(events.some((e) => e.type === "go")).toBe(true);
  });
});
