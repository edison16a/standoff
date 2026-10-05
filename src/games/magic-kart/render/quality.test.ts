import { describe, expect, it } from "vitest";
import { QUALITY_LEVELS, QualityGovernor } from "./quality";

function feed(g: QualityGovernor, ms: number, seconds: number): number {
  let changes = 0;
  for (let t = 0; t < seconds * 1000; t += ms) if (g.sample(ms)) changes++;
  return changes;
}

describe("QualityGovernor", () => {
  it("keeps full quality at 60 frames a second", () => {
    const g = new QualityGovernor();
    expect(feed(g, 16.7, 20)).toBe(0);
    expect(g.current).toBe(QUALITY_LEVELS[0]);
  });

  it("steps down one level at a time while frames stay slow, and stops at the last", () => {
    const g = new QualityGovernor();
    expect(feed(g, 28, 7)).toBe(1);
    expect(g.current.resolution).toBeLessThan(1);
    feed(g, 28, 60);
    expect(g.current).toBe(QUALITY_LEVELS[QUALITY_LEVELS.length - 1]);
  });

  it("ignores the hitches while a race settles and the odd slow frame", () => {
    const g = new QualityGovernor();
    expect(feed(g, 120, 2.5)).toBe(0);
    let changes = 0;
    for (let i = 0; i < 600; i++) if (g.sample(i % 10 === 0 ? 80 : 16)) changes++;
    expect(changes).toBe(0);
  });

  it("leaves a player who capped the frame rate low alone", () => {
    const g = new QualityGovernor(() => 30);
    expect(feed(g, 33.3, 20)).toBe(0);
  });
});
