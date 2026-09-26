import { describe, expect, it } from "vitest";
import { stepMatch } from "../engine/match";
import { fightNow, hang } from "../engine/test-kit";
import { StepTrack } from "./step-track";

describe("StepTrack", () => {
  it("blends between steps and holds still in hit stop", () => {
    const m = fightNow(["karate", "bear"]);
    const f = m.fighters[0]!;
    hang(f, 0, 4);
    const track = new StepTrack(f);
    stepMatch(m);
    const from = { x: 0, y: 4 };
    const half = track.at(f, 0.5);
    expect(half.y).toBeCloseTo(from.y + (f.pos.y - from.y) * 0.5);
    f.freeze = 3;
    expect(track.at(f, 0.5)).toEqual(f.pos);
  });

  it("draws a fighter back from a fall on their platform, never part way across the stage", () => {
    const m = fightNow(["karate", "bear"]);
    const f = m.fighters[0]!;
    hang(f, m.stage.blast.left - 1, 2);
    const track = new StepTrack(f);
    const step = () => {
      track.remember(f);
      stepMatch(m);
    };
    step();
    expect(f.action).toBe("dead");
    while (f.action === "dead") step();
    expect(f.action).toBe("respawn");
    // Blending from where they fell would put them metres off their platform.
    expect(Math.abs(m.stage.blast.left - 1 - f.pos.x)).toBeGreaterThan(5);
    for (const alpha of [0, 0.3, 0.9]) expect(track.at(f, alpha)).toEqual(f.pos);
    // Once riding the platform down, it blends again as usual.
    step();
    expect(track.at(f, 0).y).toBeGreaterThan(f.pos.y);
  });
});
