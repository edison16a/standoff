import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILDS } from "../../builds";
import { buildSkeleton, dimsOf } from "../body/rig";
import { buildOf, LEFT, RIGHT, solveLeg, type Foot } from "./leg-ik";
import { applyPose, neutral } from "./pose";

const LOOK = BUILDS.defender.look;
const B = buildOf(LOOK.height, LOOK.build);

/** Where the solved ankle lands, in the figure's frame, with the pose applied to a real skeleton. */
function ankleAt(pose: ReturnType<typeof neutral>, side: 1 | -1): THREE.Vector3 {
  const { rig } = buildSkeleton(dimsOf(LOOK), LOOK.height);
  applyPose({ ...rig, dispose() {} }, pose);
  rig.root.updateMatrixWorld(true);
  return (side === LEFT ? rig.ankleL : rig.ankleR).getWorldPosition(new THREE.Vector3());
}

describe("solveLeg", () => {
  const cases: [string, Partial<ReturnType<typeof neutral>>, Foot, 1 | -1][] = [
    ["standing straight", {}, { x: 0.12, y: B.ground, z: 0.05, toe: 0 }, LEFT],
    ["leaning into a sprint", { pitch: 0.2, lift: -0.03 }, { x: -0.08, y: B.ground + 0.05, z: 0.3, toe: 0.3 }, RIGHT],
    ["banked into a cut", { roll: -0.25, pitch: 0.1 }, { x: 0.3, y: B.ground, z: 0.1, toe: 0 }, LEFT],
    ["with the pelvis turned and dropped", { pelvisY: 0.15, pelvisZ: -0.07, pitch: 0.12 }, { x: -0.1, y: B.ground + 0.1, z: -0.25, toe: 0.5 }, RIGHT],
    ["all at once", { pelvisY: -0.12, pelvisZ: 0.06, roll: 0.15, pitch: 0.18, lift: -0.02, fwd: 0.05 }, { x: 0.15, y: B.ground, z: 0.35, toe: 0 }, LEFT],
  ];
  for (const [name, lean, foot, side] of cases) {
    it(`puts the ankle on its target ${name}`, () => {
      const pose = { ...neutral(), ...lean };
      solveLeg(pose, side, foot, B);
      const at = ankleAt(pose, side);
      expect(at.distanceTo(new THREE.Vector3(foot.x, foot.y, foot.z))).toBeLessThan(0.004);
    });
  }

  it("straightens toward a target out of reach instead of snapping", () => {
    const pose = neutral();
    solveLeg(pose, LEFT, { x: 0.1, y: -0.5, z: 0, toe: 0 }, B);
    expect(pose.kneeL).toBeGreaterThanOrEqual(0);
    expect(pose.kneeL).toBeLessThan(0.1);
  });
});
