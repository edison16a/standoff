import * as THREE from "three";
import { box, merge, paint } from "../models/geo";
import { banks, lamps, LAMP_PITCH, type Bank } from "./light-rig";
import { Glare } from "./glare";

/** A lamp face's radiance: far over white, so the bloom catches it and it reads as a light, not paint. */
const FACE = new THREE.Color(9, 8.6, 7.8);

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const ONE = new THREE.Vector3(1, 1, 1);
const FORWARD = new THREE.Vector3(0, 0, 1);

/** The steel frame each bank hangs from: a beam over the top, one under, and the hangers up to the roof. */
function trusses(all: Bank[]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const bank of all) {
    const width = bank.cols * LAMP_PITCH + 0.6;
    const yaw = Math.atan2(bank.along.z, -bank.along.x);
    const h = bank.rows * LAMP_PITCH * 0.9;
    for (const dy of [h / 2 + 0.3, -h / 2 - 0.3]) {
      parts.push(paint(box(width, 0.22, 0.4), "#2b2f36", { at: [bank.centre.x, bank.centre.y + dy, bank.centre.z], rot: [0, yaw, 0] }));
    }
    for (const s of [-0.45, 0.45]) {
      const x = bank.centre.x + bank.along.x * s * width;
      const z = bank.centre.z + bank.along.z * s * width;
      parts.push(paint(box(0.18, 2.4, 0.18), "#2b2f36", { at: [x, bank.centre.y + h / 2 + 1.4, z] }));
    }
  }
  return merge(parts);
}

/**
 * The floodlights under the roof's inner edge: every lamp head as an
 * instance (a dark housing and a blazing face, each aimed at its own
 * spot on the field), the steel they hang from, and the glare each
 * bank throws into the lens. Four draw calls for some eight hundred
 * lamps.
 */
export class LampBanks {
  readonly group = new THREE.Group();
  readonly glare: Glare;
  private readonly housings: THREE.InstancedMesh;
  private readonly faces: THREE.InstancedMesh;
  private readonly frame: THREE.Mesh;

  constructor() {
    const all = banks();
    const heads = all.flatMap(lamps);
    const housingMat = new THREE.MeshStandardMaterial({ color: "#20242b", roughness: 0.55, metalness: 0.6 });
    this.housings = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.74, 0.5), housingMat, heads.length);
    const faceGeo = new THREE.CircleGeometry(0.33, 14);
    faceGeo.translate(0, 0, 0.26);
    this.faces = new THREE.InstancedMesh(faceGeo, new THREE.MeshBasicMaterial({ color: FACE, fog: false }), heads.length);
    heads.forEach((h, i) => {
      q.setFromUnitVectors(FORWARD, h.dir);
      m.compose(h.at, q, ONE);
      this.housings.setMatrixAt(i, m);
      this.faces.setMatrixAt(i, m);
    });
    this.frame = new THREE.Mesh(trusses(all), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.5 }));
    this.glare = new Glare(all);
    this.group.add(this.housings, this.faces, this.frame, this.glare.mesh);
  }

  /** 1 at full power; the ceremony dims the faces and the glare with the light they give. */
  setLevel(level: number): void {
    (this.faces.material as THREE.MeshBasicMaterial).color.copy(FACE).multiplyScalar(0.25 + 0.75 * level);
    this.glare.setLevel(level);
  }

  dispose(): void {
    for (const mesh of [this.housings, this.faces, this.frame]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.glare.dispose();
  }
}
