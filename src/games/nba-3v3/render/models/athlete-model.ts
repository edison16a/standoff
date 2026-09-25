import * as THREE from "three";
import type { Character, Team } from "../../roster";
import { ball, box, cyl, lathe, limb, merge, paint } from "./geo";
import { buildHead, shade } from "./head";
import { jerseyTexture } from "./jersey";

/** Every joint the animations turn. Each is a group whose children hang from it. */
export interface Joints {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  neck: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  handL: THREE.Group;
  handR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  ankleL: THREE.Group;
  ankleR: THREE.Group;
}

/** Lengths the animations need, in metres. */
export interface Dims {
  height: number;
  hipY: number;
  thigh: number;
  shin: number;
  upper: number;
  fore: number;
  torso: number;
}

export interface AthleteModel {
  joints: Joints;
  dims: Dims;
  meshes: THREE.Mesh[];
  dispose(): void;
}

const group = (name: string, parent?: THREE.Object3D, at: [number, number, number] = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...at);
  parent?.add(g);
  return g;
};

/**
 * A stylised athlete on a simple skeleton: pelvis, torso, neck, and two
 * arms and legs of two segments each. Proportions come from the
 * player's height, shoulder width, bulk and reach; the look from their
 * skin, hair, beard and gear, in their team's jersey with their number.
 */
export function buildAthlete(c: Character, team: Team, bodyMat: THREE.Material): AthleteModel {
  const H = c.build.height;
  const { bulk, width, reach } = c.build;
  const skin = c.look.skin;
  const s = H / 2;
  const ankle = 0.075;
  const thigh = 0.245 * H;
  const shin = 0.232 * H;
  const hipY = thigh + shin + ankle;
  const torsoLen = 0.285 * H;
  const upper = 0.168 * H * reach;
  const fore = 0.148 * H * reach;
  const shoulderX = 0.1 * H * width;
  const headR = (0.105 + (H - 2) * 0.02) * 1.12;

  const meshes: THREE.Mesh[] = [];
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material = bodyMat) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  const root = group("root");
  const hips = group("hips", root, [0, hipY, 0]);
  const torso = group("torso", hips, [0, 0.03 * H, 0]);
  const neck = group("neck", torso, [0, torsoLen, 0]);

  // Shorts: a flared pelvis piece in team colour with a trim stripe down each side.
  const shortsTop = 0.06 * H;
  add(hips, merge([
    paint(lathe([[0.14 * s * width, -0.1 * H], [0.16 * s * width, -0.02 * H], [0.145 * s * width, shortsTop]], 22), team.color, { scale: [1.05, 1, 0.72] }),
    paint(cyl(0.148 * s * width, 0.148 * s * width, 0.02 * H, 22, true), team.dark, { at: [0, shortsTop - 0.01 * H, 0], scale: [1.05, 1, 0.72] }),
  ]));

  // Torso: a jersey with the number printed round it, and bare shoulders and neck.
  const jersey = jerseyTexture(team, c.number, c.short);
  textures.push(jersey);
  const jerseyMat = new THREE.MeshStandardMaterial({ map: jersey, roughness: 0.62, side: THREE.DoubleSide });
  materials.push(jerseyMat);
  const r = 0.17 * s * width;
  const profile = lathe(
    [[0.62 * r, 0], [0.7 * r, 0.3 * torsoLen], [0.86 * r, 0.62 * torsoLen], [0.92 * r, 0.82 * torsoLen], [0.74 * r, 0.95 * torsoLen], [0.34 * r, torsoLen]],
    32,
  );
  profile.rotateY(Math.PI);
  profile.scale(1, 1, 0.64 + (bulk - 1) * 0.2);
  add(torso, profile, jerseyMat);
  add(torso, merge([
    paint(cyl(0.3 * r, 0.36 * r, 0.12 * torsoLen, 14), skin, { at: [0, torsoLen * 0.98, 0.01] }),
    paint(ball(0.36 * r, 14, 10), skin, { at: [0, torsoLen * 0.93, 0.02], scale: [1, 0.5, 0.9] }),
  ]));

  add(neck, buildHead(c.look, headR));

  const arm = (side: 1 | -1) => {
    const shoulder = group(side > 0 ? "shoulderL" : "shoulderR", torso, [side * shoulderX, torsoLen * 0.9, 0]);
    const sleeve = c.look.sleeve?.side === side ? c.look.sleeve.color : null;
    const upperParts = [
      paint(limb(0.056 * s * bulk, 0.044 * s * bulk, upper, { bulge: 0.2, at: 0.45 }), sleeve ?? skin),
      paint(ball(0.068 * s * bulk, 14, 10), skin, { at: [side * 0.01, -0.01, 0], scale: [1.05, 1.1, 1] }),
    ];
    add(shoulder, merge(upperParts));
    const elbow = group("elbow", shoulder, [0, -upper, 0]);
    const foreParts = [paint(limb(0.044 * s * bulk, 0.032 * s * bulk, fore, { bulge: 0.16, at: 0.28 }), sleeve ?? skin)];
    const band = c.look.wristband;
    if (band) foreParts.push(paint(cyl(0.038 * s * bulk, 0.036 * s * bulk, 0.06, 12), band, { at: [0, -fore + 0.05, 0] }));
    add(elbow, merge(foreParts));
    const hand = group("hand", elbow, [0, -fore, 0]);
    add(hand, merge([
      paint(box(0.055 * s, 0.1 * s, 0.085 * s), skin, { at: [0, -0.045 * s, 0.005] }),
      paint(ball(0.045 * s, 10, 8), skin, { at: [0, -0.02 * s, 0.01], scale: [0.75, 1, 1.05] }),
      paint(box(0.022 * s, 0.06 * s, 0.024 * s), skin, { at: [side * -0.012, -0.03 * s, 0.05 * s], rot: [0.4, 0, 0] }),
    ]));
    return { shoulder, elbow, hand };
  };
  const left = arm(1);
  const right = arm(-1);

  const leg = (side: 1 | -1) => {
    const hip = group(side > 0 ? "hipL" : "hipR", hips, [side * 0.052 * H * width, 0, 0]);
    add(hip, merge([
      paint(limb(0.07 * s * bulk, 0.05 * s * bulk, thigh, { bulge: 0.12, at: 0.3 }), skin),
      paint(lathe([[0.085 * s * bulk * 1.25, -thigh * 0.48], [0.085 * s * bulk * 1.18, 0.02]], 18), team.color),
      paint(cyl(0.085 * s * bulk * 1.26, 0.085 * s * bulk * 1.26, 0.03, 18, true), team.trim, { at: [0, -thigh * 0.46, 0] }),
    ]));
    const knee = group("knee", hip, [0, -thigh, 0]);
    add(knee, merge([
      paint(limb(0.05 * s * bulk, 0.032 * s, shin, { bulge: 0.22, at: 0.3 }), skin),
      paint(cyl(0.036 * s * 1.2, 0.033 * s * 1.2, 0.14 * s, 14), c.look.sock, { at: [0, -shin + 0.07 * s, 0] }),
    ]));
    const foot = group("ankle", knee, [0, -shin, 0]);
    const f = 0.075 * H;
    add(foot, merge([
      paint(box(0.1 * s, 0.035, f * 1.95), "#f5f5f4", { at: [0, -ankle + 0.02, f * 0.45] }),
      paint(box(0.094 * s, 0.075, f * 1.7), c.look.shoe, { at: [0, -ankle + 0.07, f * 0.38] }),
      paint(ball(0.05 * s, 12, 8), c.look.shoe, { at: [0, -ankle + 0.07, f * 1.18], scale: [0.95, 0.75, 1.2] }),
      paint(box(0.098 * s, 0.022, f * 0.9), c.look.shoeAccent, { at: [0, -ankle + 0.075, f * 0.45], rot: [0.25, 0, 0] }),
      paint(cyl(0.05 * s, 0.056 * s, 0.07, 14), shade(c.look.shoe, 0.9), { at: [0, -ankle + 0.1, 0] }),
    ]));
    return { hip, knee, foot };
  };
  const legL = leg(1);
  const legR = leg(-1);

  return {
    joints: {
      root, hips, torso, neck,
      shoulderL: left.shoulder, shoulderR: right.shoulder, elbowL: left.elbow, elbowR: right.elbow, handL: left.hand, handR: right.hand,
      hipL: legL.hip, hipR: legR.hip, kneeL: legL.knee, kneeR: legR.knee, ankleL: legL.foot, ankleR: legR.foot,
    },
    dims: { height: H, hipY, thigh, shin, upper, fore, torso: torsoLen },
    meshes,
    dispose() {
      for (const mesh of meshes) mesh.geometry.dispose();
      for (const t of textures) t.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
