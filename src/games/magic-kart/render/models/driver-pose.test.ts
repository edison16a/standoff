import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../../characters";
import { poseDriver } from "./driver-pose";
import { kartDesign } from "./karts";
import { makeSkeleton, type BoneName } from "./parts/driver-rig";

/** Where a rest pose point ends up once its bone is posed. */
function posed(bones: Record<BoneName, THREE.Bone>, rest: Record<BoneName, THREE.Vector3>, bone: BoneName, point: THREE.Vector3): THREE.Vector3 {
  return point.clone().sub(rest[bone]).applyMatrix4(bones[bone].matrixWorld);
}

describe("poseDriver", () => {
  for (const id of CHARACTER_IDS) {
    it(`${id}'s hands stay on the wheel through a full turn`, () => {
      const { rig } = kartDesign(id);
      const { bones } = makeSkeleton(rig);
      for (const steer of [-1, -0.5, 0, 0.5, 1]) {
        poseDriver(rig, bones, { steer, roll: steer * 0.05, brake: 0.5, boost: 0 });
        bones.root.updateMatrixWorld(true);
        for (const [fore, wrist] of [["foreL", rig.wrists.L], ["foreR", rig.wrists.R]] as const) {
          // The forearm's end, where the glove (on the wheel) begins.
          const arm = posed(bones, rig.joints, fore, wrist);
          const hand = posed(bones, rig.joints, "wheel", wrist);
          expect(arm.distanceTo(hand), `${fore} at steer ${steer}`).toBeLessThan(0.01);
        }
      }
    });
  }

  it("turns the wheel the way the kart steers", () => {
    const { rig } = kartDesign("blaze");
    const { bones } = makeSkeleton(rig);
    poseDriver(rig, bones, { steer: 1, roll: 0, brake: 0, boost: 0 });
    bones.root.updateMatrixWorld(true);
    // Twelve o'clock on the rim swings toward the driver's right, which is the kart's -x.
    const top = new THREE.Vector3(0, 0.18, 0).applyMatrix4(rig.wheelBasis);
    expect(posed(bones, rig.joints, "wheel", top).x).toBeLessThan(top.x - 0.05);
  });
});
