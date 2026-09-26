import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createAthlete } from "../engine/athlete";
import type { AthleteModel, Dims, Joints } from "./models/athlete-model";
import { Placement } from "./placement";

const DT = 1 / 60;
const DIMS: Dims = { height: 2, hipY: 0.945, thigh: 0.45, shin: 0.42, upper: 0.3, fore: 0.3, torso: 0.5, sole: { y: -0.075, heel: -0.08, toe: 0.21 } };

/** Just the legs of an athlete, jointed as the real model is. */
function legs(): AthleteModel {
  const group = (parent: THREE.Object3D | null, x: number, y: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    parent?.add(g);
    return g;
  };
  const root = group(null, 0, 0);
  const hips = group(root, 0, DIMS.hipY);
  const leg = (side: number) => {
    const hip = group(hips, side * 0.1, 0);
    const knee = group(hip, 0, -DIMS.thigh);
    return { hip, knee, ankle: group(knee, 0, -DIMS.shin) };
  };
  const l = leg(1);
  const r = leg(-1);
  const joints = { root, hips, hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle } as unknown as Joints;
  return { joints, dims: DIMS, meshes: [], dispose() {} };
}

function sole(ankle: THREE.Object3D, z: number): number {
  return ankle.localToWorld(new THREE.Vector3(0, DIMS.sole.y, z)).y;
}

describe("Placement", () => {
  it("stands a crouch on flat soles, touching the floor", () => {
    const model = legs();
    const j = model.joints;
    for (const [hip, knee] of [[j.hipL, j.kneeL], [j.hipR, j.kneeR]] as const) {
      hip.rotation.x = -0.6;
      knee.rotation.x = 1.3;
    }
    new Placement(createAthlete(0, 0, 0, "curry", null)).plant(createAthlete(0, 0, 0, "curry", null), model, { L: 0, R: 0 }, DT);
    j.root.updateMatrixWorld(true);
    for (const ankle of [j.ankleL, j.ankleR]) {
      expect(sole(ankle, DIMS.sole.heel)).toBeCloseTo(0, 2);
      expect(sole(ankle, DIMS.sole.toe)).toBeCloseTo(0, 2);
    }
  });

  it("points a pushing toe down and stands on it, and leaves a raised foot as posed", () => {
    const model = legs();
    const j = model.joints;
    j.hipL.rotation.x = -1.5;
    j.kneeL.rotation.x = 1.2;
    j.hipR.rotation.x = 0.3;
    j.kneeR.rotation.x = 0.4;
    const a = createAthlete(0, 0, 0, "curry", null);
    new Placement(a).plant(a, model, { L: 0, R: 0.3 }, DT);
    j.root.updateMatrixWorld(true);
    expect(j.ankleL.rotation.x).toBe(0);
    const toe = sole(j.ankleR, DIMS.sole.toe);
    const heel = sole(j.ankleR, DIMS.sole.heel);
    expect(toe).toBeCloseTo(0, 3);
    expect(heel).toBeGreaterThan(0.05);
  });

  it("eases a sudden turn over a few frames but follows a spin as it goes", () => {
    const a = createAthlete(0, 0, 0, "curry", null);
    a.yaw = 0;
    const place = new Placement(a);
    const root = new THREE.Group();
    place.place(a, root, 0, DT);
    a.yaw = 2.4;
    place.place(a, root, 0, DT);
    expect(root.rotation.y).toBeLessThan(0.6);
    for (let t = 0; t < 0.35; t += DT) place.place(a, root, 0, DT);
    expect(root.rotation.y).toBeCloseTo(2.4, 1);
    for (let i = 0; i < 20; i++) {
      a.yaw += 0.3;
      place.place(a, root, 0, DT);
      expect(Math.abs(Math.sin(root.rotation.y - a.yaw))).toBeLessThan(0.05);
    }
  });
});
