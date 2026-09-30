import { describe, expect, it } from "vitest";
import type { StageEvent } from "../render/stage-source";
import { ROUND, STEP_S } from "./shots";
import { ShowcaseStage } from "./stage";
import { CUTS } from "./trailer";

/** Plays the showcase round to `until` seconds in the director's fixed steps, collecting every shot and when it came. */
function play(until: number) {
  const stage = new ShowcaseStage(ROUND);
  const shots: (Extract<StageEvent, { type: "shot" }> & { at: number })[] = [];
  stage.listen((event) => event.type === "shot" && shots.push({ ...event, at: stage.round().time }));
  for (let step = 0; step <= Math.round(until / STEP_S); step++) stage.tick(step * STEP_S * 1000);
  return { stage, shots };
}

describe("the showcase round", () => {
  const { stage, shots } = play(43);

  it("plays the same way every time", () => {
    const again = play(43);
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
    expect(golden!.shot.target!.hit!.at).toBeGreaterThanOrEqual(ROUND.golden!.shootAt);
    expect(stage.phase()).toBe("playing");
  });

  it("lands every shot of the trailer's big moments on cue, inside its shot", () => {
    for (const cut of CUTS) {
      const hit = shots.find((s) => s.shot.kind === cut.moment.kind && Math.abs(s.at - cut.moment.at) < 0.02);
      expect(hit, `${cut.moment.kind} at ${cut.moment.at}`).toBeDefined();
      expect(cut.clock(0)).toBeLessThan(hit!.at);
      expect(cut.clock(cut.to - cut.from)).toBeGreaterThan(hit!.at + 0.1);
    }
  });
});
