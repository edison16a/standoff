import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { BallView } from "../../engine/view";
import { freshView } from "../test-views";
import { BallModel } from "./ball-view";
import type { Figure } from "./figure";

const HAND = new THREE.Vector3(1, 1.9, 0);
/** A stand in for the holder: the ball sits at a fixed hand. */
const holder = { grip: (p: THREE.Vector3, a: THREE.Vector3) => (p.copy(HAND), a.set(0, 1, 0)) } as unknown as Figure;

const ball = (over: Partial<BallView>): BallView => ({ ...freshView().ball, ...over });

describe("the ball leaving and reaching the hands", () => {
  it("starts its flight from the drawn hand and joins the engine's ball within a tenth of a second", () => {
    const m = new BallModel();
    const held = ball({ state: "held", holder: 0 });
    for (let i = 0; i < 3; i++) m.update(held, holder, false, 1 / 60);
    // The engine lets go half a metre away from where the hand is drawn.
    const free = ball({ state: "pass", holder: null, x: 1.4, y: 2.1, z: 0.3 });
    m.update(free, null, false, 1 / 60);
    expect(m.at.distanceTo(HAND)).toBeLessThan(0.1);
    for (let i = 0; i < 7; i++) m.update(free, null, false, 1 / 60);
    expect(m.at.distanceTo(new THREE.Vector3(1.4, 2.1, 0.3))).toBeLessThan(1e-6);
  });

  it("does not drift across the field when a replay cuts away", () => {
    const m = new BallModel();
    m.update(ball({ state: "held", holder: 0 }), holder, false, 1 / 60);
    m.update(ball({ state: "pass", holder: null, x: 30, y: 2, z: 5 }), null, false, 1 / 60);
    expect(m.at.x).toBeCloseTo(30);
  });
});
