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

  it("follows the pass in the air", () => {
    const { view, scorer } = scene();
    view.ball = { ...view.ball, state: "pass", holder: null };
    const lens = new THREE.Vector3(view.ball.x - 7, 6, view.ball.z);
    const band = focusBand(view, { angle: "trace", passer: 0, scorer: scorer.id }, lens)!;
    expect(band.distance).toBeCloseTo(new THREE.Vector3(view.ball.x, view.ball.y, view.ball.z).distanceTo(lens), 5);
  });

  it("on the run, keeps the tight band on the runner", () => {
    const { view, scorer } = scene();
    const lens = new THREE.Vector3(scorer.x - 8, 2.1, scorer.z);
    const band = focusBand(view, { angle: "run", passer: null, scorer: scorer.id }, lens)!;
    expect(band.distance).toBeCloseTo(new THREE.Vector3(scorer.x, 1.2, scorer.z).distanceTo(lens), 5);
    expect(band.range).toBeCloseTo(focusRange(band.distance), 5);
  });
});
