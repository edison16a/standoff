import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { reach } from "./reach";

/** An arm hanging from a shoulder: upper arm 0.3, forearm 0.3. */
function arm() {
  const body = new THREE.Group();
  body.rotation.y = 0.7;
  const shoulder = new THREE.Group();
  shoulder.position.set(0.2, 1.4, 0);
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.3, 0);
  const hand = new THREE.Group();
  hand.position.set(0, -0.3, 0);
  body.add(shoulder);
  shoulder.add(elbow);
  elbow.add(hand);
  return { body, shoulder, elbow, hand };
}

describe("reach", () => {
  it("puts the hand on a target within reach", () => {
    const { body, shoulder, elbow, hand } = arm();
    const target = new THREE.Vector3(0.1, 1.3, 0.4);
    reach(shoulder, elbow, 0.3, 0.3, target, new THREE.Vector3(0, -1, 0));
    body.updateMatrixWorld(true);
    expect(hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeLessThan(1e-3);
  });

  it("bows the elbow toward the pole", () => {
    const { body, shoulder, elbow } = arm();
    reach(shoulder, elbow, 0.3, 0.3, new THREE.Vector3(0.3, 1.2, 0.3), new THREE.Vector3(0, -1, 0));
    body.updateMatrixWorld(true);
    const e = elbow.getWorldPosition(new THREE.Vector3());
    expect(e.y).toBeLessThan(1.3);
  });

  it("points a straight arm at a target out of reach", () => {
    const { body, shoulder, elbow, hand } = arm();
    const target = new THREE.Vector3(2, 1.4, 0);
    reach(shoulder, elbow, 0.3, 0.3, target, new THREE.Vector3(0, -1, 0));
    body.updateMatrixWorld(true);
    const s = shoulder.getWorldPosition(new THREE.Vector3());
    const h = hand.getWorldPosition(new THREE.Vector3());
    expect(h.distanceTo(s)).toBeCloseTo(0.6, 3);
    expect(h.clone().sub(s).normalize().dot(target.clone().sub(s).normalize())).toBeGreaterThan(0.999);
  });
});
