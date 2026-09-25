import { describe, expect, it } from "vitest";
import type { StageEvent } from "../render/stage-source";
import { PLANS } from "./shots";
import { ShowcaseStage } from "./stage";

/** Plays a plan's round to `until` seconds in the director's fixed steps, collecting every shot. */
function play(until: number) {
  const stage = new ShowcaseStage(PLANS.loop);
  const shots: Extract<StageEvent, { type: "shot" }>[] = [];
  stage.listen((event) => event.type === "shot" && shots.push(event));
  for (let step = 0; step <= Math.round(until * 60); step++) stage.tick((step * 1000) / 60);
  return { stage, shots };
}

describe("the showcase round", () => {
  const { stage, shots } = play(PLANS.loop.start + 12);

  it("plays the same way every time", () => {
    const again = play(PLANS.loop.start + 12);
    expect(again.shots.map((s) => [s.shot.seat, s.shot.kind, s.shot.points])).toEqual(shots.map((s) => [s.shot.seat, s.shot.kind, s.shot.points]));
  });

  it("keeps all four guns busy and hitting", () => {
    const seen = new Set(shots.map((s) => s.shot.seat));
    expect(seen).toEqual(new Set([1, 2, 3, 4]));
    const hits = shots.filter((s) => s.shot.kind !== null);
    expect(hits.length / shots.length).toBeGreaterThan(0.6);
  });

  it("shoots the golden duck only once its moment comes", () => {
    const golden = shots.find((s) => s.shot.kind === "golden");
    expect(golden).toBeDefined();
    expect(golden!.shot.target!.hit!.at).toBeGreaterThanOrEqual(PLANS.loop.golden!.shootAt);
    expect(stage.phase()).toBe("playing");
  });
});
