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

  it("chasing the ball, holds the catcher it flies to in the sharp band", () => {
    const { view, scorer } = scene();
    const lens = new THREE.Vector3(view.ball.x - 6.5, 7.6, view.ball.z);
    const band = focusBand(view, { camera: "ball", passer: null, scorer: scorer.id }, lens)!;
    const toScorer = new THREE.Vector3(scorer.x, 1.2, scorer.z).distanceTo(lens);
    expect(band.distance).toBeCloseTo(new THREE.Vector3(view.ball.x, 6, view.ball.z).distanceTo(lens), 5);
    expect(Math.abs(toScorer - band.distance)).toBeLessThan(band.range);
  });

  it("behind the runner, keeps the tight band on him", () => {
    const { view, scorer } = scene();
    const lens = new THREE.Vector3(scorer.x - 8, 3.6, scorer.z);
    const band = focusBand(view, { camera: "runner", passer: null, scorer: scorer.id }, lens)!;
    expect(band.range).toBeCloseTo(focusRange(band.distance), 5);
  });
});
