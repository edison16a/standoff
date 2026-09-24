import * as THREE from "three";
import { hairline } from "./face-texture";
import type { BoxerMaterials } from "./materials";
import { ringAt, sculpt, surfacePoint, type Bump, type Ring } from "./sculpt";

/** The skull and face, from the crown down to under the chin, around the head joint on top of the neck. */
export const HEAD_RINGS: readonly Ring[] = [
  { t: 0, y: 0.222, rx: 0.004, zf: 0.004, zb: 0.004, z: -0.01 },
  { t: 0.08, y: 0.215, rx: 0.05, zf: 0.055, zb: 0.06, z: -0.01 },
  { t: 0.18, y: 0.193, rx: 0.076, zf: 0.084, zb: 0.09, z: -0.012 },
  { t: 0.3, y: 0.158, rx: 0.085, zf: 0.095, zb: 0.098, z: -0.01 },
  { t: 0.42, y: 0.124, rx: 0.084, zf: 0.1, zb: 0.098, z: -0.005 },
  { t: 0.52, y: 0.095, rx: 0.08, zf: 0.098, zb: 0.095, z: 0 },
  { t: 0.62, y: 0.065, rx: 0.076, zf: 0.1, zb: 0.086, z: 0.004 },
  { t: 0.72, y: 0.037, rx: 0.069, zf: 0.098, zb: 0.074, z: 0.01 },
  { t: 0.82, y: 0.01, rx: 0.061, zf: 0.093, zb: 0.058, z: 0.018 },
  { t: 0.91, y: -0.017, rx: 0.047, zf: 0.083, zb: 0.04, z: 0.025 },
  { t: 1, y: -0.032, rx: 0.016, zf: 0.055, zb: 0.012, z: 0.03 },
];

/** The bones of a hard face: a heavy brow, deep sockets, cheekbones, a square jaw and chin. */
const FACE: readonly Bump[] = [
  { theta: 0.34, t: 0.425, width: 0.34, height: 0.05, amount: 0.009, mirror: true },
  { theta: 0, t: 0.41, width: 0.25, height: 0.04, amount: 0.004 },
  { theta: 0.37, t: 0.515, width: 0.16, height: 0.038, amount: -0.013, mirror: true },
  { theta: 0.72, t: 0.575, width: 0.3, height: 0.07, amount: 0.008, mirror: true },
  { theta: 0.78, t: 0.72, width: 0.3, height: 0.06, amount: -0.004, mirror: true },
  { theta: 1.05, t: 0.82, width: 0.35, height: 0.08, amount: 0.013, mirror: true },
  { theta: 0, t: 0.9, width: 0.34, height: 0.05, amount: 0.007 },
  { theta: 0, t: 0.72, width: 0.38, height: 0.06, amount: 0.005 },
  { theta: 1.12, t: 0.34, width: 0.25, height: 0.07, amount: -0.004, mirror: true },
  { theta: Math.PI, t: 0.32, width: 0.6, height: 0.1, amount: 0.006 },
];

export interface HeadParts {
  group: THREE.Group;
  /** Upper lids, scaled down to blink. */
  lids: THREE.Mesh[];
  /** A swelling under the eye that grows with damage. */
  swelling: THREE.Mesh;
}

/** A point on the face at an angle and height, pushed out (or in) by `lift`. */
export function facePoint(theta: number, t: number, lift = 0): THREE.Vector3 {
  const p = surfacePoint(ringAt(HEAD_RINGS, t), theta);
  return new THREE.Vector3(p.x + p.nx * lift, p.y, p.z + p.nz * lift);
}

export function buildHead(m: BoxerMaterials): HeadParts {
  const group = new THREE.Group();
  const skull = new THREE.Mesh(sculpt(HEAD_RINGS, { rows: 36, segments: 48, bumps: FACE }), m.head);
  group.add(skull);

  // Nose: a bridge down from the brow to a broad, slightly flattened tip.
  const nose = new THREE.Mesh(
    sculpt(
      [
        { t: 0, y: 0, rx: 0.006, zf: 0.004, zb: 0.004 },
        { t: 0.5, y: -0.028, rx: 0.009, zf: 0.011, zb: 0.004 },
        { t: 0.85, y: -0.045, rx: 0.015, zf: 0.018, zb: 0.006 },
        { t: 1, y: -0.053, rx: 0.012, zf: 0.008, zb: 0.004 },
      ],
      { rows: 10, segments: 14 },
    ),
    m.skin,
  );
  nose.position.copy(facePoint(0, 0.47, -0.012));
  nose.rotation.x = -0.28;
  group.add(nose);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), m.skin);
    wing.position.copy(facePoint(side * 0.13, 0.615, -0.002));
    wing.scale.set(1, 0.8, 1.1);
    group.add(wing);
  }

  const lids: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const centre = facePoint(side * 0.37, 0.515, -0.011);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 14, 10), m.eyeWhite);
    white.position.copy(centre);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0066, 10, 8), m.iris);
    iris.position.set(centre.x - side * 0.001, centre.y + 0.0005, centre.z + 0.0085);
    // The top of the eye stays under a heavy lid, which reads as focus.
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0138, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), m.skin);
    lid.position.copy(centre);
    lid.rotation.x = 0.5;
    group.add(white, iris, lid);
    lids.push(lid);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), m.skin);
    ear.scale.set(0.011, 0.03, 0.02);
    ear.position.copy(facePoint(side * 1.53, 0.5, -0.004));
    ear.rotation.set(0.15, side * -0.25, 0);
    group.add(ear);
  }

  const swelling = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), m.head);
  swelling.position.copy(facePoint(0.42, 0.56, -0.012));
  swelling.scale.setScalar(0.01);
  group.add(swelling);

  const hair = hairShell(m);
  if (hair) group.add(hair);
  return { group, lids, swelling };
}

/** Hair with volume, for the styles that have it. A buzz cut is painted on the skin instead. */
function hairShell(m: BoxerMaterials): THREE.Object3D | null {
  const style = m.look.hairStyle;
  if (style === "spikes") {
    // A close cap of hair with sharp tufts standing out of it, swept up and back.
    const group = new THREE.Group();
    group.add(new THREE.Mesh(sculpt(HEAD_RINGS, { rows: 22, segments: 48, until: (th) => hairline(th) * 0.96, offset: () => 0.009 }), m.hair));
    const cone = new THREE.ConeGeometry(0.017, 0.055, 5);
    cone.translate(0, 0.022, 0);
    const spots: THREE.Vector3[] = [];
    for (let row = 0; row < 6; row++) {
      const count = 7 + row * 3;
      for (let i = 0; i < count; i++) {
        const theta = -Math.PI + ((i + (row % 2) * 0.5) / count) * Math.PI * 2;
        const t = 0.04 + row * 0.06;
        if (t > hairline(theta) * 0.85) continue;
        spots.push(new THREE.Vector3(theta, t, 0));
      }
    }
    const tufts = new THREE.InstancedMesh(cone, m.hair, spots.length);
    const up = new THREE.Vector3(0, 1, 0);
    const centre = new THREE.Vector3(0, 0.08, -0.01);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    spots.forEach((spot, i) => {
      const at = facePoint(spot.x, spot.y, 0.004);
      const out = at.clone().sub(centre).normalize().add(new THREE.Vector3(0, 0.35, -0.45)).normalize();
      q.setFromUnitVectors(up, out);
      const size = 0.8 + 0.4 * Math.abs(Math.sin(i * 12.9898));
      matrix.compose(at, q, new THREE.Vector3(size, size, size));
      tufts.setMatrixAt(i, matrix);
    });
    group.add(tufts);
    return group;
  }
  if (style === "curls") {
    const offset = (theta: number, t: number) => 0.018 + 0.006 * Math.sin(theta * 23) * Math.sin(t * 60) + 0.004 * Math.cos(theta * 11 + t * 31);
    return new THREE.Mesh(sculpt(HEAD_RINGS, { rows: 26, segments: 64, until: (th) => hairline(th) * 0.97, offset }), m.hair);
  }
  return null;
}
