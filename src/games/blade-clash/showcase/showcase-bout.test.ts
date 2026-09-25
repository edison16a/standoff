import { describe, expect, it } from "vitest";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { ShowcaseBout } from "./showcase-bout";

describe("the showcase bout", () => {
  it("plays two parries, a clash and a touch, judged by the real referee", () => {
    const events: { event: GameEvent; time: number; gap: number }[] = [];
    let bout: ShowcaseBout | null = null;
    bout = new ShowcaseBout({ 1: "vale", 2: "marrow" }, (event) => {
      if (!bout) return;
      const { fencers } = bout.driver.engine;
      events.push({ event, time: Math.round(bout.time), gap: fencers[2].x - fencers[1].x });
    });
    for (let wall = 0; wall < 8000; wall += 1000 / 60) bout.step(1000 / 60);
    if (process.env.SHOWCASE_DEBUG) console.log(events.map((e) => `${e.time} ${e.event.type} ${JSON.stringify(e.event)} gap ${e.gap.toFixed(2)}`).join("\n"));
    const kinds = events.map(({ event }) => event.type).filter((type) => type !== "jab" && type !== "parry");
    expect(kinds.slice(0, 5)).toEqual(["parried", "parried", "whiff", "parried", "touch"]);
    expect(events.find(({ event }) => event.type === "parried" && event.clash)).toBeDefined();
    expect(events.some(({ event }) => event.type === "impact")).toBe(true);
  });
});
