import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILDS } from "../builds";
import { reachArm } from "./arm-ik";
import { buildRig } from "./models/rig";

const PALM = new THREE.Vector3(0, -0.07, 0.03);

function rig() {
  const r = buildRig(BUILDS.shooter);
  r.joints.root.rotation.y = 0.7;
  r.joints.root.position.set(2, 0, 5);
  r.joints.torso.rotation.set(0.3, 0.2, 0);
  r.joints.root.updateMatrixWorld(true);
  return r;
}

describe("reachArm", () => {
  it("puts the palm on a point within reach, with the elbow bent", () => {
    const r = rig();
    const arm = { shoulder: r.joints.shoulderR, elbow: r.joints.elbowR, hand: r.joints.handR };
    const shoulder = r.joints.shoulderR.getWorldPosition(new THREE.Vector3());
    for (const offset of [new THREE.Vector3(-0.2, -0.4, 0.25), new THREE.Vector3(0.1, -0.3, 0.35), new THREE.Vector3(-0.2, 0.15, 0.3)]) {
      const target = shoulder.clone().add(offset);
      reachArm(arm, target, PALM, new THREE.Vector3(-0.7, -0.25, -0.65), 1);
      r.joints.root.updateMatrixWorld(true);
      const palm = r.joints.handR.localToWorld(PALM.clone());
      expect(palm.distanceTo(target)).toBeLessThan(0.01);
      expect(-r.joints.elbowR.rotation.x).toBeGreaterThan(0.05);
    }
  });

  it("stretches straight toward a point out of reach", () => {
    const r = rig();
    const arm = { shoulder: r.joints.shoulderL, elbow: r.joints.elbowL, hand: r.joints.handL };
    const shoulder = r.joints.shoulderL.getWorldPosition(new THREE.Vector3());
    const target = shoulder.clone().add(new THREE.Vector3(0, -3, 0.5));
    reachArm(arm, target, PALM, new THREE.Vector3(0.7, -0.25, -0.65), 1);
    r.joints.root.updateMatrixWorld(true);
    const palm = r.joints.handL.localToWorld(PALM.clone());
    const toTarget = target.clone().sub(shoulder).normalize();
    const toPalm = palm.clone().sub(shoulder).normalize();
    expect(toPalm.dot(toTarget)).toBeGreaterThan(0.99);
    expect(Math.abs(r.joints.elbowL.rotation.x)).toBeLessThan(0.05);
  });

  it("leaves the arm alone at no weight", () => {
    const r = rig();
    const before = r.joints.shoulderR.quaternion.clone();
    reachArm({ shoulder: r.joints.shoulderR, elbow: r.joints.elbowR, hand: r.joints.handR }, new THREE.Vector3(0, 0, 0), PALM, new THREE.Vector3(-1, 0, 0), 0);
    expect(r.joints.shoulderR.quaternion.equals(before)).toBe(true);
  });
});
