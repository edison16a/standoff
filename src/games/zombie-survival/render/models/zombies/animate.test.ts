import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { makeZombie } from "../../../engine/zombie";
import { poseZombie } from "./animate";
import { BONES, makeRig, type BodyDims } from "./rig";

const DIMS: BodyDims = {
  thigh: 0.45, shin: 0.42, foot: 0.08, torso: 0.55, torsoW: 0.36, torsoD: 0.22, shoulderW: 0.4, hipW: 0.24,
  upperArm: 0.3, forearm: 0.27, hand: 0.1, neck: 0.1, head: 0.24, arm: 0.09, leg: 0.12,
};

function deadAt(age: number, stateTime: number) {
  const z = makeZombie(1, "walker", 5, 0, 0, { hpScale: 1, speedScale: 1, harm: 1, weakHp: 1, seed: 0.7 });
  z.state = "dead";
  z.age = age;
  z.stateTime = stateTime;
  z.death = { head: false, seat: 1 };
  const rig = makeRig(DIMS);
  poseZombie(rig, z, 0);
  rig.root.updateMatrixWorld(true);
  return rig;
}

describe("a dead zombie", () => {
  it("lies still: nothing of the walk keeps moving on the body", () => {
    const a = deadAt(10, 2);
    const b = deadAt(13.7, 2);
    for (const bone of BONES) {
      expect(a.bones[bone].quaternion.angleTo(b.bones[bone].quaternion), bone).toBeLessThan(1e-6);
      expect(a.bones[bone].position.distanceTo(b.bones[bone].position), bone).toBeLessThan(1e-6);
    }
  });

  it("drops its arms flat on the ground once it lands", () => {
    const rig = deadAt(10, 2);
    for (const side of ["L", "R"] as const) {
      const shoulder = rig.bones[`shoulder${side}`].getWorldPosition(new THREE.Vector3());
      const hand = rig.bones[`hand${side}`].getWorldPosition(new THREE.Vector3());
      // The hand lies no higher than a hand's width above the shoulder.
      expect(hand.y - shoulder.y).toBeLessThan(0.12);
    }
  });
});
