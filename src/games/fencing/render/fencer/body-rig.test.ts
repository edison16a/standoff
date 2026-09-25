import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { GUARD } from "@/games/fencing/rig/guard-pose";
import { BODY, BodyRig, twoBone } from "./body-rig";

const world = (rig: BodyRig, bone: keyof BodyRig["bones"]) => {
  rig.root.updateMatrixWorld(true);
  return new THREE.Vector3().setFromMatrixPosition(rig.bones[bone].matrixWorld);
};

describe("twoBone", () => {
  it("lands on a reachable target with both bones at length, bending toward the pole", () => {
    const root = new THREE.Vector3(0, 1, 0);
    const target = new THREE.Vector3(0.3, 0.3, 0.1);
    const { joint, end } = twoBone(root, target, 0.44, 0.43, new THREE.Vector3(1, 0, 0));
    expect(end.distanceTo(target)).toBeLessThan(1e-6);
    expect(joint.distanceTo(root)).toBeCloseTo(0.44);
    expect(joint.distanceTo(end)).toBeCloseTo(0.43);
    expect(joint.x).toBeGreaterThan((root.x + end.x) / 2);
  });

  it("straightens toward a target out of reach", () => {
    const { end } = twoBone(new THREE.Vector3(), new THREE.Vector3(5, 0, 0), 0.3, 0.3, new THREE.Vector3(0, 1, 0));
    expect(end.x).toBeCloseTo(0.6, 3);
  });
});

describe("BodyRig", () => {
  it("stands en garde: knees forward over the feet, the sword hand in front, feet on the floor", () => {
    const rig = new BodyRig(0.9);
    rig.update(GUARD);
    const hip = world(rig, "thighF");
    const knee = world(rig, "shinF");
    const ankle = world(rig, "footF");
    expect(knee.x).toBeGreaterThan((hip.x + ankle.x) / 2);
    expect(ankle.y).toBeCloseTo(BODY.ankle);
    expect(world(rig, "handF").x).toBeGreaterThan(world(rig, "chest").x + 0.3);
    expect(world(rig, "head").y).toBeGreaterThan(1.3);
  });

  it("puts the blade tip a blade's length out along the pitch", () => {
    const rig = new BodyRig(0.9);
    rig.update({ ...GUARD, bladeAngle: 0.5, bladeYaw: 0 });
    const grip = world(rig, "blade");
    const along = rig.tip.clone().sub(grip);
    expect(along.length()).toBeCloseTo(0.9);
    expect(Math.atan2(along.y, along.x)).toBeCloseTo(0.5);
  });

  it("swings the blade toward the camera with the phone's yaw", () => {
    const rig = new BodyRig(0.9);
    rig.update({ ...GUARD, bladeYaw: 0.6 });
    expect(rig.tip.z - world(rig, "blade").z).toBeGreaterThan(0.4);
  });
});
