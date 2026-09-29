import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { BOTS, PEOPLE } from "../engine/test-helpers";
import { RULES } from "../engine/tuning";
import { MatchDriver, type Sticks } from "./match-driver";
import { scriptReplay } from "./replay/script";

const still: Sticks = { move: () => ({ x: 0, y: 0 }), aim: () => null, forward: { x: 1, z: 0 } };

/** Ticks the driver at 60 frames a second until `until` holds or `seconds` run out. */
function play(driver: MatchDriver, seconds: number, until: (events: MatchEvent[]) => boolean, from = 0): number {
  let now = from;
  for (let frame = 0; frame < seconds * 60; frame++) {
    now += 1000 / 60;
    if (until(driver.tick(now, still))) break;
  }
  return now;
}

describe("the host's match driver", () => {
  it("steps the match from the animation clock", () => {
    const driver = new MatchDriver(BOTS, 3, "hard");
    play(driver, 5, () => false);
    expect(driver.match.time).toBeGreaterThan(4.5);
    expect(driver.match.time).toBeLessThan(5.1);
  });

  it("holds after a touchdown's celebration until told to go on to the try", () => {
    const driver = new MatchDriver(PEOPLE, 3, "easy");
    play(driver, 1, () => false);
    driver.admin("touchdown");
    let now = play(driver, RULES.touchdownSeconds + 2, () => driver.held, 1000);
    expect(driver.held).toBe(true);
    expect(driver.match.phase).toBe("touchdown");
    const time = driver.match.time;
    now = play(driver, 1, () => false, now);
    expect(driver.match.time).toBe(time);
    driver.resume();
    play(driver, 1, () => false, now);
    expect(driver.match.phase).toBe("convert");
  });

  it("turns a phone's stick into a run up the screen", () => {
    const driver = new MatchDriver(PEOPLE, 3, "easy");
    const qb = driver.match.bySeat(0)!;
    driver.press(0, "juke", true, { x: 0, y: 1 }, { x: 0, z: -1 });
    expect(qb.move.x).toBeCloseTo(0, 6);
    expect(qb.move.z).toBeCloseTo(-1, 6);
  });

  it("records a computer passing touchdown that the replay can cut up", () => {
    const driver = new MatchDriver(BOTS, 5, "hard");
    let scored: number | null = null;
    let passed = false;
    play(driver, 900, (events) => {
      for (const e of events) if (e.type === "touchdown" && !e.conversion && e.pass !== null) passed = true;
      if (driver.held && passed) scored = driver.replayFor;
      else if (driver.held) driver.resume();
      return scored !== null;
    });
    expect(scored).not.toBeNull();
    const script = scriptReplay(driver.recorder.all, scored!)!;
    expect(script.segments.map((s) => s.stage)).toEqual(["aim", "throw", "flight", "run"]);
    expect(script.trace.length).toBeGreaterThan(10);
    expect(script.facts.ballMph).toBeGreaterThan(20);
    expect(script.facts.spinRpm).toBeGreaterThan(300);
    const throwing = script.segments[1]!;
    expect(throwing.rate).toBeLessThan(0.3);
  });
});
