import * as THREE from "three";
import type { V3 } from "../geo";
import { solveElbow } from "../kit/arm-ik";

/** The driver's bones. Every vertex of the driver follows exactly one. */
export const BONE = { root: 0, spine: 1, head: 2, upperL: 3, foreL: 4, upperR: 5, foreR: 6, wheel: 7 } as const;
export type BoneName = keyof typeof BONE;
const PARENT: Record<BoneName, BoneName | null> = { root: null, spine: "root", head: "spine", upperL: "spine", foreL: "upperL", upperR: "spine", foreR: "upperR", wheel: "root" };

export interface WheelSpec {
  /** Centre of the steering wheel, kart space. */
  at: V3;
  radius: number;
  /** How steeply the column climbs toward the driver, radians from flat. */
  column: number;
}

/**
 * Where the driver's joints rest, in the driver's own space (the seat
 * point is the origin, facing +z). Shoulders, elbows and wrists come in
 * left and right; left is +x, as in the kart.
 */
export interface Rig {
  joints: Record<BoneName, THREE.Vector3>;
  wrists: { L: THREE.Vector3; R: THREE.Vector3 };
  /** Grip points on the rim, in wheel space. */
  grips: { L: THREE.Vector3; R: THREE.Vector3 };
  /** Wheel space (rim in x and y, +z toward the driver) to driver space. */
  wheelBasis: THREE.Matrix4;
  /** The column, pointing at the driver: the steering wheel turns round it. */
  columnAxis: THREE.Vector3;
  upper: number;
  fore: number;
}

/** Elbows bend out and down, the way arms on a wheel do. */
export const pole = (side: number) => new THREE.Vector3(side * 1, -0.7, -0.35);

/** Lays out the joints for a driver of a given build reaching a given wheel. */
export function makeRig(seat: V3, wheel: WheelSpec, shoulderHalf = 0.25, chest = 0.62): Rig {
  const centre = new THREE.Vector3(wheel.at[0] - seat[0], wheel.at[1] - seat[1], wheel.at[2] - seat[2]);
  const a = wheel.column;
  // A right handed basis: rim x toward the driver's right (kart -x), rim y to twelve o'clock, z at the driver.
  const right = new THREE.Vector3(-1, 0, 0);
  const up = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  const toward = new THREE.Vector3(0, Math.sin(a), -Math.cos(a));
  const wheelBasis = new THREE.Matrix4().makeBasis(right, up, toward).setPosition(centre);
  const g = 0.9;
  // Ten to two: the left hand is at the rim's -x, which is the kart's +x.
  const grips = {
    L: new THREE.Vector3(-wheel.radius * Math.cos(0.45) * g, wheel.radius * Math.sin(0.45) * g, 0),
    R: new THREE.Vector3(wheel.radius * Math.cos(0.45) * g, wheel.radius * Math.sin(0.45) * g, 0),
  };
  const wristOf = (grip: THREE.Vector3, side: number) =>
    grip.clone().add(new THREE.Vector3(side * -0.02, -0.03, 0.075)).applyMatrix4(wheelBasis);
  const wrists = { L: wristOf(grips.L, -1), R: wristOf(grips.R, 1) };
  const joints: Record<BoneName, THREE.Vector3> = {
    root: new THREE.Vector3(0, 0, 0),
    spine: new THREE.Vector3(0, 0.2, -0.04),
    head: new THREE.Vector3(0, chest + 0.12, -0.03),
    upperL: new THREE.Vector3(shoulderHalf, chest, 0),
    upperR: new THREE.Vector3(-shoulderHalf, chest, 0),
    foreL: new THREE.Vector3(),
    foreR: new THREE.Vector3(),
    wheel: centre,
  };
  const reach = Math.max(joints.upperL.distanceTo(wrists.L), joints.upperR.distanceTo(wrists.R));
  // Arms long enough to keep a bend at the elbow through a full turn of the wheel.
  const upper = reach * 0.56 + 0.03;
  const fore = reach * 0.56 + 0.03;
  solveElbow(joints.upperL, wrists.L, upper, fore, pole(1), joints.foreL);
  solveElbow(joints.upperR, wrists.R, upper, fore, pole(-1), joints.foreR);
  return { joints, wrists, grips, wheelBasis, columnAxis: toward, upper, fore };
}

/** Bones for one copy of the driver, in the rest pose, with their bind inverses. */
export function makeSkeleton(rig: Rig): { bones: Record<BoneName, THREE.Bone>; skeleton: THREE.Skeleton } {
  const names = Object.keys(BONE) as BoneName[];
  const bones = {} as Record<BoneName, THREE.Bone>;
  for (const name of names) {
    const bone = new THREE.Bone();
    bone.name = name;
    const parent = PARENT[name];
    bone.position.copy(rig.joints[name]).sub(parent ? rig.joints[parent] : new THREE.Vector3());
    bones[name] = bone;
  }
  for (const name of names) {
    const parent = PARENT[name];
    if (parent) bones[parent].add(bones[name]);
  }
  const ordered = names.sort((x, y) => BONE[x] - BONE[y]).map((n) => bones[n]);
  const inverses = names.map((n) => new THREE.Matrix4().makeTranslation(rig.joints[n].clone().negate()));
  return { bones, skeleton: new THREE.Skeleton(ordered, inverses) };
}

/** Ties parts to one bone, for the skinned driver mesh. */
export function rigged(parts: THREE.BufferGeometry[], bone: BoneName): THREE.BufferGeometry[] {
  for (const g of parts) {
    const n = g.getAttribute("position").count;
    const index = new Uint16Array(n * 4);
    const weight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      index[i * 4] = BONE[bone];
      weight[i * 4] = 1;
    }
    g.setAttribute("skinIndex", new THREE.BufferAttribute(index, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(weight, 4));
  }
  return parts;
}
