import { describe, expect, it } from "vitest";
import { AutoQuality, MAX_LEVEL } from "./auto-quality";

/** Feeds `seconds` of frames at a steady rate; returns how many times the level changed. */
function run(q: AutoQuality, fps: number, seconds: number): number {
  let changes = 0;
  for (let t = 0; t < seconds; t += 1 / fps) if (q.frame(1 / fps)) changes++;
  return changes;
}

describe("AutoQuality", () => {
  it("leaves a card that holds sixty alone", () => {
    const q = new AutoQuality(() => 60);
    run(q, 59, 60);
    expect(q.level).toBe(0);
    expect(q.fineBodies).toBe(true);
  });

  it("steps down one level at a time on a slow card, waiting between steps, and stops at the floor", () => {
    const q = new AutoQuality(() => 60);
    run(q, 40, 8);
    expect(q.level).toBe(1);
    expect(q.fineBodies).toBe(false);
    run(q, 40, 7.5);
    expect(q.level).toBe(2);
    expect(q.pixelCap).toBeLessThan(1.5);
    run(q, 40, 60);
    expect(q.level).toBe(MAX_LEVEL);
  });

  it("judges against the player's cap, so a match capped at thirty is not a slow card", () => {
    const q = new AutoQuality(() => 30);
    run(q, 30, 30);
    expect(q.level).toBe(0);
  });

  it("ignores stalls such as a hidden tab", () => {
    const q = new AutoQuality(() => 60);
    for (let i = 0; i < 40; i++) q.frame(1);
    run(q, 60, 10);
    expect(q.level).toBe(0);
  });
});
