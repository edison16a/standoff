import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { crashPose, idlePose, rollPose, runPose } from "../anim/gaits";
import { Pose } from "../anim/pose";
import { buildRunner, LOOKS } from "../models/runner-model";
import { GroundContact } from "./ground-contact";

const rig = buildRunner(LOOKS[0]!);
const contact = new GroundContact(rig);
const pose = new Pose();
const box = new THREE.Box3();

/** The lowest point of the whole drawn body, measured exactly from its vertices. */
function bottom(): number {
  rig.root.updateMatrixWorld(true);
  return box.setFromObject(rig.root, true).min.y;
}

function posed(make: (p: Pose) => void, spin = 0): void {
  make(pose);
  pose.apply(rig);
  rig.pivot.rotation.x = spin;
}

describe("the runner on the ground", () => {
  it("stands on the soles of its shoes at rest", () => {
    posed((p) => p.clear());
    expect(bottom()).toBeCloseTo(0, 2);
    expect(contact.plant()).toBeCloseTo(0, 5);
  });

  it("keeps a foot planted on the ground through the stride, neither in it nor floating", () => {
    const heights: number[] = [];
    for (let i = 0; i < 24; i++) {
      posed((p) => runPose(p, (i / 24) * Math.PI * 2));
      contact.plant(0, true);
      const low = bottom();
      expect(low).toBeGreaterThan(-0.03);
      expect(low).toBeLessThan(0.02);
      heights.push(rig.pivot.position.y);
    }
    // The body still bobs as the legs pass under it.
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.03);
  });

  it("only lifts, never pulls down, when the body is off the ground", () => {
    posed((p) => p.clear());
    rig.pivot.position.y += 0.3;
    expect(contact.plant()).toBe(0);
    expect(contact.lowest()).toBeCloseTo(0.3, 5);
  });

  it("tumbles over the ground in a roll, low enough to pass under a high barrier", () => {
    for (let i = 0; i < 16; i++) {
      posed(rollPose, -(i / 16) * Math.PI * 2);
      contact.plant();
      rig.root.updateMatrixWorld(true);
      box.setFromObject(rig.root, true);
      expect(box.min.y).toBeGreaterThan(-0.05);
      expect(box.max.y).toBeLessThan(1.15);
    }
  });

  it("lies on the ground after a crash and stands on it in the lobby", () => {
    for (const make of [(p: Pose) => crashPose(p, 1.5), (p: Pose) => idlePose(p, 0.4)]) {
      posed(make);
      contact.plant();
      expect(bottom()).toBeGreaterThan(-0.04);
      expect(contact.lowest()).toBeCloseTo(0, 5);
    }
  });
});
