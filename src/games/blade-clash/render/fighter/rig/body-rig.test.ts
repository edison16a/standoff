import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/games/blade-clash/characters";
import { GUARD, swordPose, type SwordControl } from "@/games/blade-clash/engine/sword";
import { leanIntoReach } from "../anim/arms";
import { BodyRig } from "./body-rig";
import { twoBone } from "./ik";
import { emptyPose } from "./pose";
import { BODY } from "./skeleton";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("two bone reach", () => {
  it("lands the end on a target in reach, with both bones their true length", () => {
    const limb = twoBone(v(0, 0, 0), v(0.4, -0.2, 0.1), 0.31, 0.29, v(0, -1, 0));
    expect(limb.end.distanceTo(v(0.4, -0.2, 0.1))).toBeLessThan(1e-6);
    expect(limb.joint.length()).toBeCloseTo(0.31, 6);
    expect(limb.joint.distanceTo(limb.end)).toBeCloseTo(0.29, 6);
    expect(limb.stretch).toBeLessThan(1);
  });

  it("bends the joint toward the pole", () => {
    const limb = twoBone(v(0, 0, 0), v(0.5, 0, 0), 0.31, 0.29, v(0, -1, 0));
    expect(limb.joint.y).toBeLessThan(0);
  });

  it("straightens and says how far short it fell for a target out of reach", () => {
    const limb = twoBone(v(0, 0, 0), v(1, 0, 0), 0.31, 0.29, v(0, -1, 0));
    expect(limb.end.x).toBeCloseTo(0.6, 3);
    expect(limb.stretch).toBeCloseTo(1 / 0.6, 3);
  });
});

/** The pose the animator would build for a hold, before any ending: the engine's sword in fighter space. */
function poseFor(control: SwordControl) {
  const sword = swordPose(0, 1, control, CHARACTERS.knight.blade);
  const pose = emptyPose();
  pose.grip.set(sword.hand.x, sword.hand.y, sword.hand.z);
  pose.hand.copy(pose.grip);
  pose.blade.set(sword.dir.x, sword.dir.y, sword.dir.z);
  pose.edge.set(sword.edge.x, sword.edge.y, sword.edge.z);
  return pose;
}

describe("the rig", () => {
  const holds: [string, SwordControl][] = [
    ["guard", GUARD],
    ["a full thrust", { yaw: 0, pitch: 0, roll: 0, reach: 1 }],
    ["high overhead", { yaw: 0.1, pitch: 1.45, roll: 0, reach: 0.2 }],
    ["low and across", { yaw: -1.2, pitch: -1.1, roll: 0.4, reach: 0.6 }],
    ["wide right", { yaw: 1.75, pitch: 0.3, roll: -0.5, reach: 0.9 }],
  ];

  it.each(holds)("puts the sword and the sword hand exactly on the engine's grip: %s", (_, control) => {
    const pose = poseFor(control);
    leanIntoReach(pose);
    const rig = new BodyRig();
    rig.update(pose);
    rig.root.updateMatrixWorld(true);
    const hand = rig.bones.handR.getWorldPosition(new THREE.Vector3());
    const sword = rig.bones.sword.getWorldPosition(new THREE.Vector3());
    expect(hand.distanceTo(pose.grip)).toBeLessThan(1e-6);
    expect(sword.distanceTo(pose.grip)).toBeLessThan(1e-6);
    // The blade runs along the sword bone's x.
    const along = new THREE.Vector3(1, 0, 0).applyQuaternion(rig.bones.sword.getWorldQuaternion(new THREE.Quaternion()));
    expect(along.distanceTo(pose.blade)).toBeLessThan(1e-6);
  });

  it.each(holds)("reaches the grip with the arm, stretching it no more than a little: %s", (_, control) => {
    const pose = poseFor(control);
    leanIntoReach(pose);
    const rig = new BodyRig();
    rig.update(pose);
    // Scale along the bone is the stretch the arm needed to reach.
    expect(rig.bones.upperArmR.scale.y).toBeLessThan(1.06);
    expect(rig.bones.forearmR.scale.y).toBeLessThan(1.06);
  });

  it("plants the feet where the pose says", () => {
    const pose = emptyPose();
    const rig = new BodyRig();
    rig.update(pose);
    rig.root.updateMatrixWorld(true);
    const foot = rig.bones.footR.getWorldPosition(new THREE.Vector3());
    expect(foot.distanceTo(pose.footR)).toBeLessThan(1e-6);
    expect(BODY.thigh + BODY.shin).toBeGreaterThan(pose.hips.y - pose.footR.y);
  });
});
