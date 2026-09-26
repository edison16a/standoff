import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildOf } from "../anim/leg-ik";
import { applyPose, neutral } from "../anim/pose";
import type { Rig } from "../models/body";
import { keepAboveTurf } from "./turf";

const BUILD = buildOf(1.8, 0.6);
/** The model's own hip height, a touch over the leg solver's. */
const HIPS = 0.94;

/** The joints of a footballer without the meshes, laid out as models/body.ts lays them. */
function skeleton(): Rig {
  const joint = (parent: THREE.Object3D | null, x = 0, y = 0) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, 0);
    parent?.add(o);
    return o;
  };
  const root = joint(null);
  const body = new THREE.Group();
  root.add(body);
  const hips = joint(body, 0, HIPS);
  const spine = joint(hips);
  const leg = (side: number) => {
    const hip = joint(hips, side * BUILD.hipW);
    const knee = joint(hip, 0, -BUILD.thigh);
    return { hip, knee, ankle: joint(knee, 0, -BUILD.shin) };
  };
  const l = leg(1);
  const r = leg(-1);
  const rig = {
    root, body, hips, spine, neck: joint(spine),
    shoulderL: joint(spine), elbowL: joint(spine), handL: joint(spine),
    shoulderR: joint(spine), elbowR: joint(spine), handR: joint(spine),
    hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle,
    hipHeight: HIPS, height: 1.8, dispose() {},
  };
  return rig as Rig;
}

const lowestSole = (rig: Rig) =>
  Math.min(...[rig.ankleL, rig.ankleR].flatMap((a) => [-0.06, 0.2].map((z) => a.localToWorld(new THREE.Vector3(0, -0.075, z)).y)));

describe("keepAboveTurf", () => {
  it("bends a leg posed down through the pitch back up onto the turf", () => {
    const rig = skeleton();
    const pose = neutral();
    // Sat low with the shins hanging straight down, as the old zen pose and the slide's tucked leg did.
    pose.lift = -0.6;
    pose.hipLX = pose.hipRX = -1.45;
    pose.kneeL = pose.kneeR = 1.45;
    applyPose(rig, pose);
    rig.root.updateMatrixWorld(true);
    expect(lowestSole(rig)).toBeLessThan(-0.2);
    const before = rig.ankleL.getWorldPosition(new THREE.Vector3());
    expect(keepAboveTurf(rig, pose, BUILD)).toBe(true);
    expect(lowestSole(rig)).toBeGreaterThan(-0.03);
    // The boot lands where it was over the turf, not somewhere else.
    const after = rig.ankleL.getWorldPosition(new THREE.Vector3());
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05);
  });

  it("leaves a standing pose alone", () => {
    const rig = skeleton();
    const pose = neutral();
    applyPose(rig, pose);
    expect(keepAboveTurf(rig, pose, BUILD)).toBe(false);
  });
});
