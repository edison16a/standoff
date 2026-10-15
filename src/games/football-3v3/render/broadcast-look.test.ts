import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { Match } from "../engine/match";
import { BOTS } from "../engine/test-helpers";
import { buildView } from "../engine/view";
import { focusBand, focusRange } from "./broadcast-look";

function scene() {
  const view = buildView(new Match({ entries: BOTS, seed: 3, level: "medium" }));
  const scorer = view.athletes[1]!;
  view.ball = { ...view.ball, x: scorer.x - 20, y: 6, z: scorer.z };
  return { view, scorer };
}

describe("the replay lens", () => {
  it("stays sharp everywhere in live play", () => {
    expect(focusBand(scene().view, null, new THREE.Vector3())).toBeNull();
  });

  it("on the wide angle, keeps the whole field sharp", () => {
    const { view, scorer } = scene();
    const lens = new THREE.Vector3(view.ball.x - 15, 11.5, view.ball.z);
    const band = focusBand(view, { angle: "all22", passer: null, scorer: scorer.id, take: 0 }, lens)!;
    const toScorer = new THREE.Vector3(scorer.x, 1.2, scorer.z).distanceTo(lens);
    expect(Math.abs(toScorer - band.distance)).toBeLessThan(band.range);
  });

  it("at the end zone, keeps the tight band on the runner", () => {
    const { view, scorer } = scene();
    const lens = new THREE.Vector3(scorer.x - 8, 2.1, scorer.z);
    const band = focusBand(view, { angle: "endzone", passer: null, scorer: scorer.id, take: 1 }, lens)!;
    expect(band.distance).toBeCloseTo(new THREE.Vector3(scorer.x, 1.2, scorer.z).distanceTo(lens), 5);
    expect(band.range).toBeCloseTo(focusRange(band.distance), 5);
  });
});
