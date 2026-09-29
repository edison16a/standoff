import { describe, expect, it } from "vitest";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { COUNTDOWN_SECONDS, POINTS_TO_WIN } from "@/games/blade-clash/engine/rules";
import type { Slot } from "@/games/blade-clash/players";
import type { FeedbackEvent } from "@/games/blade-clash/protocol";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { MatchDriver, SLOW_MO_MS } from "./match-driver";

const FRAME = 1000 / 60;
const RIGHT = { yaw: 1.2, pitch: 0, roll: 0, reach: 0.8 };
const LEFT = { yaw: -1, pitch: 0, roll: 0, reach: 0.8 };
const DOWN = { yaw: -1.2, pitch: -1.2, roll: 0, reach: 0 };

/** A driver on a fake page clock, with everything it says recorded against that clock. */
function harness() {
  const seen: { event: GameEvent; wall: number }[] = [];
  const buzzes: [Slot, FeedbackEvent][] = [];
  const driver = new MatchDriver({ 1: "knight", 2: "samurai" }, () => DEFAULT_TUNING, {
    director: null,
    feedback: (slot, event) => buzzes.push([slot, event]),
    onPhase: () => undefined,
  });
  let wall = 0;
  driver.listen((event) => seen.push({ event, wall }));
  const runFor = (ms: number, each?: () => void) => {
    for (const end = wall + ms; wall < end; wall += FRAME) {
      each?.();
      driver.tick(wall);
    }
  };
  /** Player one cuts player two once, from a standstill close in. */
  const cut = () => {
    const { engine } = driver;
    runFor(500, () => {
      engine.control(1, { ...RIGHT, move: 0 });
      engine.control(2, { ...DOWN, move: 0 });
    });
    for (const slot of [1, 2] as const) engine.fighters[slot].x = engine.fighters[slot].previousX = slot === 1 ? -0.8 : 0.8;
    let k = 0;
    runFor(400, () => {
      k = Math.min(1, k + 0.12);
      engine.control(1, { yaw: RIGHT.yaw + (LEFT.yaw - RIGHT.yaw) * k, pitch: 0, roll: 0, reach: 0.8, move: 0 });
    });
  };
  const untilLive = () => {
    for (let i = 0; i < 600 && driver.engine.phase !== "live"; i++) runFor(FRAME);
  };
  driver.start();
  runFor(COUNTDOWN_SECONDS * 1000 + 100);
  return { driver, seen, buzzes, runFor, cut, untilLive, wall: () => wall };
}

describe("MatchDriver", () => {
  it("plays every point in slow motion, then resumes at full speed", () => {
    const { driver, seen, buzzes, runFor, cut, untilLive } = harness();
    cut();
    const hit = seen.find(({ event }) => event.type === "hit");
    expect(hit?.event).toMatchObject({ final: false, score: 1 });
    expect(driver.hud()).toMatchObject({ phase: "point", scorer: 1, score: { 1: 1, 2: 0 } });
    expect(buzzes).toContainEqual([1, "landed"]);
    expect(buzzes).toContainEqual([2, "hurt"]);
    const atHit = driver.engine.now;
    runFor(500);
    // Half a second of real time is only a tenth of a second of game time.
    expect(driver.engine.now - atHit).toBeLessThan(150);
    untilLive();
    const reset = seen.find(({ event }) => event.type === "reset");
    expect(reset!.wall - hit!.wall).toBeGreaterThanOrEqual(SLOW_MO_MS);
    // No finish burst for an ordinary point.
    expect(seen.some(({ event }) => event.type === "finish")).toBe(false);
    const back = driver.engine.now;
    runFor(500);
    expect(driver.engine.now - back).toBeGreaterThan(450);
  });

  it("fires the finish after the winning point's slow motion, then shows the winner", () => {
    const { driver, seen, runFor, cut, untilLive } = harness();
    for (let i = 0; i < POINTS_TO_WIN; i++) {
      untilLive();
      cut();
    }
    const finalHit = seen.find(({ event }) => event.type === "hit" && event.final);
    expect(finalHit?.event).toMatchObject({ score: POINTS_TO_WIN });
    runFor(1500);
    const finish = seen.find(({ event }) => event.type === "finish");
    expect(finish?.event).toMatchObject({ winner: 1 });
    expect(finish!.wall - finalHit!.wall).toBeGreaterThanOrEqual(SLOW_MO_MS);
    runFor(2000);
    expect(driver.hud()).toMatchObject({ phase: "matchOver", winner: 1, score: { 1: POINTS_TO_WIN, 2: 0 } });
  });
});
