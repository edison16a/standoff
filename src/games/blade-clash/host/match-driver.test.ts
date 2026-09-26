import { describe, expect, it } from "vitest";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { COUNTDOWN_SECONDS, MAX_HEALTH } from "@/games/blade-clash/engine/rules";
import type { Slot } from "@/games/blade-clash/players";
import type { FeedbackEvent } from "@/games/blade-clash/protocol";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { MatchDriver } from "./match-driver";

const FRAME = 1000 / 60;
const RIGHT = { yaw: 1.2, pitch: 0, roll: 0, reach: 0.8 };
const LEFT = { yaw: -1, pitch: 0, roll: 0, reach: 0.8 };
const DOWN = { yaw: -1.2, pitch: -1.2, roll: 0, reach: 0 };

describe("MatchDriver", () => {
  it("buzzes both phones, plays the final hit in slow motion, then fires the finish", () => {
    const seen: { event: GameEvent; wall: number }[] = [];
    const buzzes: [Slot, FeedbackEvent][] = [];
    const driver = new MatchDriver({ 1: "knight", 2: "samurai" }, () => ({ ...DEFAULT_TUNING, hitCooldownMs: 150 }), {
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
    driver.start();
    runFor(COUNTDOWN_SECONDS * 1000 + 100);
    const { engine } = driver;
    for (let i = 0; i < MAX_HEALTH && engine.phase === "live"; i++) {
      const [from, to] = i % 2 === 0 ? [RIGHT, LEFT] : [LEFT, RIGHT];
      runFor(500, () => {
        engine.control(1, { ...from, move: 0 });
        engine.control(2, { ...DOWN, move: 0 });
      });
      for (const slot of [1, 2] as const) engine.fighters[slot].x = engine.fighters[slot].previousX = slot === 1 ? -0.8 : 0.8;
      let k = 0;
      runFor(400, () => {
        k = Math.min(1, k + 0.12);
        engine.control(1, { yaw: from.yaw + (to.yaw - from.yaw) * k, pitch: 0, roll: 0, reach: 0.8, move: 0 });
      });
    }
    const finalHit = seen.find(({ event }) => event.type === "hit" && event.final);
    expect(finalHit).toBeDefined();
    expect(buzzes).toContainEqual([1, "landed"]);
    expect(buzzes).toContainEqual([2, "hurt"]);
    const atHit = engine.now;
    runFor(500);
    // Half a second of real time is only a tenth of a second of game time.
    expect(engine.now - atHit).toBeLessThan(150);
    runFor(1000);
    const finish = seen.find(({ event }) => event.type === "finish");
    expect(finish?.event).toMatchObject({ winner: 1 });
    expect(finish!.wall - finalHit!.wall).toBeGreaterThanOrEqual(1200);
    runFor(2000);
    expect(driver.hud()).toMatchObject({ phase: "matchOver", winner: 1 });
  });
});
