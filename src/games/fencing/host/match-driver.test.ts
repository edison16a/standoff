import { describe, expect, it } from "vitest";
import type { GameEvent } from "@/games/fencing/engine/events";
import { EN_GARDE_SECONDS } from "@/games/fencing/engine/rules";
import { DEFAULT_TUNING } from "@/games/fencing/tuning";
import { MatchDriver } from "./match-driver";

const FRAME = 1000 / 60;

describe("MatchDriver", () => {
  it("plays a touch in slow motion, then fires the impact and returns to full speed", () => {
    const seen: { event: GameEvent; wall: number }[] = [];
    const driver = new MatchDriver({ 1: "vale", 2: "iron" }, () => DEFAULT_TUNING, {
      director: null,
      feedback: () => undefined,
      recenter: () => undefined,
      onPhase: () => undefined,
    });
    let wall = 0;
    driver.listen((event) => seen.push({ event, wall }));
    const runFor = (ms: number) => {
      for (const end = wall + ms; wall < end; wall += FRAME) driver.tick(wall);
    };
    driver.start();
    runFor(EN_GARDE_SECONDS * 1000 + 100);
    driver.engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 1 });
    runFor(1000);
    driver.engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 0 });
    driver.engine.strike(1, "jab");
    runFor(400);

    const touch = seen.find(({ event }) => event.type === "touch");
    expect(touch).toBeDefined();
    const engineAtTouch = driver.engine.now;
    runFor(500);
    // Half a second of real time is only a tenth of a second of game time.
    expect(driver.engine.now - engineAtTouch).toBeLessThan(150);
    runFor(700);
    const impact = seen.find(({ event }) => event.type === "impact");
    expect(impact).toBeDefined();
    expect(impact!.wall - touch!.wall).toBeGreaterThanOrEqual(1000);
  });
});
