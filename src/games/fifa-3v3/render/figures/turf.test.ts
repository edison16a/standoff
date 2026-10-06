import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildOf } from "../anim/leg-ik";
import { applyPose, neutral } from "../anim/pose";
import { BUILDS } from "../../builds";
import { buildSkeleton, dimsOf, type Rig } from "../body/rig";
import { keepAboveTurf } from "./turf";

const BUILD = buildOf(1.8, 0.6);
const LOOK = { ...BUILDS.allrounder.look, height: 1.8, build: 0.6 };

/** The joints of a footballer without the meshes, as body/rig.ts lays them. */
function skeleton(): Rig {
  return { ...buildSkeleton(dimsOf(LOOK), LOOK.height).rig, dispose() {} };
}

const lowestSole = (rig: Rig) =>
  Math.min(...[rig.ankleL, rig.ankleR].flatMap((a) => [-0.06, 0.2].map((z) => a.localToWorld(new THREE.Vector3(0, -0.065, z)).y)));

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
