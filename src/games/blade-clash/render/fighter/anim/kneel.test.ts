import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BodyRig } from "../rig/body-rig";
import { emptyPose } from "../rig/pose";
import { BODY } from "../rig/skeleton";
import { torsoFrame } from "../rig/torso-frame";
import { kneel } from "./kneel";

const world = (bone: THREE.Object3D) => bone.getWorldPosition(new THREE.Vector3());
/** A point in a bone's own space, in the world: how far a boot's toes reach, say. */
const at = (bone: THREE.Object3D, x: number, y: number, z: number) => bone.localToWorld(new THREE.Vector3(x, y, z));

function kneeling(ms = 0) {
  const pose = emptyPose();
  kneel(pose, ms);
  const rig = new BodyRig();
  rig.update(pose);
  rig.root.updateMatrixWorld(true);
  return { pose, rig };
}

describe("the loser's kneel", () => {
  it("puts the free side's knee on the floor and plants the other foot flat in front", () => {
    const { rig } = kneeling();
    // The shin bone starts at the knee.
    expect(world(rig.bones.shinL).y).toBeLessThan(0.1);
    expect(world(rig.bones.shinL).y).toBeGreaterThan(0);
    expect(world(rig.bones.shinR).y).toBeGreaterThan(0.4);
    expect(world(rig.bones.footR).x).toBeGreaterThan(world(rig.bones.shinL).x + 0.2);
    // The front boot's toes and heel both on the floor.
    expect(at(rig.bones.footR, 0.2, -BODY.ankle, 0).y).toBeCloseTo(0, 1);
    expect(at(rig.bones.footR, -0.05, -BODY.ankle, 0).y).toBeCloseTo(0, 1);
  });

  it("tucks the back foot's toes under, down to the floor behind the knee", () => {
    const { rig } = kneeling();
    const toes = at(rig.bones.footL, 0.21, 0, 0);
    expect(toes.y).toBeLessThan(0.05);
    expect(toes.y).toBeGreaterThan(-0.05);
    expect(toes.x).toBeLessThan(world(rig.bones.shinL).x);
  });

  it("bows the head, lays the sword down and keeps both fists within reach", () => {
    const { pose } = kneeling(900);
    expect(pose.nod).toBeGreaterThan(0.5);
    expect(pose.holding).toBe(false);
    expect(pose.grip.y).toBeLessThan(0.05);
    expect(Math.abs(pose.blade.y)).toBeLessThan(1e-6);
    const torso = torsoFrame(pose);
    const arm = BODY.upperArm + BODY.forearm + BODY.palm;
    expect(pose.hand.distanceTo(torso.shoulderR)).toBeLessThan(arm);
    expect(pose.offHand.distanceTo(torso.shoulderL)).toBeLessThan(arm);
  });
});
