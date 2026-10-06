import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILDS } from "../../builds";
import { applyPose, neutral, type Pose } from "../anim/pose";
import { bodyGeometry } from "./body-geometry";
import { buildSkeleton, dimsOf } from "./rig";

const LOOK = BUILDS.defender.look;
const GEO = bodyGeometry(LOOK, false, false);

/** The most any triangle of the kit grows round its edges in a pose, as a share of its size at rest. */
function worstStretch(pose: Partial<Pose>): number {
  const { rig, bones } = buildSkeleton(dimsOf(LOOK), LOOK.height);
  const skeleton = new THREE.Skeleton(bones);
  const mesh = new THREE.SkinnedMesh(GEO.kit, new THREE.MeshBasicMaterial());
  rig.root.add(mesh);
  mesh.bind(skeleton, new THREE.Matrix4());
  applyPose({ ...rig, dispose() {} }, { ...neutral(), ...pose });
  rig.root.updateMatrixWorld(true);
  skeleton.update();
  const pos = GEO.kit.getAttribute("position");
  const idx = GEO.kit.index!;
  const rest = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  const posed = (i: number) => mesh.applyBoneTransform(i, rest(i));
  const round = (f: (i: number) => THREE.Vector3, a: number, b: number, c: number) => f(a).distanceTo(f(b)) + f(b).distanceTo(f(c)) + f(c).distanceTo(f(a));
  let worst = 0;
  for (let t = 0; t < idx.count; t += 3) {
    const [a, b, c] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
    const r = round(rest, a, b, c);
    if (r > 1e-5) worst = Math.max(worst, round(posed, a, b, c) / r);
  }
  return worst;
}

describe("the kit as the body moves", () => {
  const poses: [string, Partial<Pose>][] = [
    ["both arms thrown up for a goal", { shLX: -2.9, shRX: -2.9, shLZ: 0.3, shRZ: 0.3 }],
    ["arms out wide for balance", { shLZ: 1.5, shRZ: 1.5 }],
    ["a knee driven up in a sprint", { hipLX: -1.3, kneeL: 1.6, hipRX: 0.5 }],
    ["a kicking leg drawn back", { hipRX: 0.9, kneeR: 1.4, spineY: 0.4 }],
    ["the trunk twisted and bent", { spineY: 0.6, spineX: 0.4, pelvisY: -0.15, pelvisZ: 0.06 }],
  ];
  for (const [name, pose] of poses) {
    it(`stretches no part of the cloth past two and a half times in ${name}`, () => {
      expect(worstStretch(pose)).toBeLessThan(2.5);
    });
  }
});
