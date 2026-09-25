import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { TargetKind } from "../../engine/kinds";

/**
 * A rubber duck on a hinge, the gallery's classic target. It is built
 * facing +x with its hinge at the origin, matching the hit shapes in
 * engine/kinds.ts. Geometry is made once and shared by every duck, so a
 * lane full of them costs a handful of draw calls each.
 */

interface DuckParts {
  body: THREE.BufferGeometry;
  wing: THREE.BufferGeometry;
  beak: THREE.BufferGeometry;
  sclera: THREE.BufferGeometry;
  pupil: THREE.BufferGeometry;
  shine: THREE.BufferGeometry;
  bracket: THREE.BufferGeometry;
}

const HEAD = new THREE.Vector3(0.2, 0.54, 0);

/** The egg shaped body with its tail swept up and a proud chest. */
function bodyGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 56, 36);
  const p = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    let px = x * 0.36;
    let py = y * 0.21;
    let pz = z * 0.26;
    if (x < -0.3) {
      const t = (-x - 0.3) / 0.7;
      py += t * t * 0.17 * (0.55 + 0.45 * y);
      px -= t * t * 0.04;
      pz *= 1 - 0.4 * t;
    }
    if (x > 0.2 && y > -0.2) py += 0.035 * ((x - 0.2) / 0.8);
    // A flat bottom, so it sits on its bracket like a bath toy.
    if (py < -0.15) py = -0.15 + (py + 0.15) * 0.3;
    p.setXYZ(i, px - 0.03, py + 0.25, pz);
  }
  // Normals from the deformed shape, before merging, so the body stays smooth.
  geometry.computeVertexNormals();
  const head = new THREE.SphereGeometry(0.15, 44, 30);
  head.scale(1, 0.97, 1.05);
  head.translate(HEAD.x, HEAD.y, HEAD.z);
  // A wide, low neck, so the head grows out of the body with no crease.
  const neck = new THREE.SphereGeometry(1, 32, 20);
  neck.scale(0.14, 0.12, 0.15).translate(0.12, 0.4, 0);
  // A plain round crown, like a real bath duck. A tuft up there read as a horn from across the room.
  return mergeGeometries([geometry, head, neck]);
}

function wingGeometry(): THREE.BufferGeometry {
  const make = (side: number) => {
    const wing = new THREE.SphereGeometry(1, 32, 18);
    // A teardrop wing: fuller at the shoulder, tapering to the tail.
    const p = wing.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const taper = 1 - Math.max(0, -x) * 0.45;
      p.setXYZ(i, x * 0.17, p.getY(i) * 0.095 * taper, p.getZ(i) * 0.035);
    }
    wing.computeVertexNormals();
    wing.rotateZ(0.28);
    wing.translate(-0.07, 0.3, side * 0.232);
    return wing;
  };
  return mergeGeometries([make(1), make(-1)]);
}

function beakGeometry(): THREE.BufferGeometry {
  const upper = new THREE.SphereGeometry(1, 28, 16);
  upper.scale(0.088, 0.032, 0.078);
  upper.rotateZ(-0.12);
  upper.translate(0.335, 0.527, 0);
  const lower = new THREE.SphereGeometry(1, 24, 12);
  lower.scale(0.066, 0.022, 0.06);
  lower.rotateZ(-0.2);
  lower.translate(0.318, 0.497, 0);
  return mergeGeometries([upper, lower]);
}

/** Eyes sit on the head's surface, looking forward and a little out. */
function eyeGeometry(radius: number, out: number, lift = 0): THREE.BufferGeometry {
  const parts = [1, -1].map((side) => {
    const dir = new THREE.Vector3(0.6, 0.47, side * 0.64).normalize();
    const eye = new THREE.SphereGeometry(radius, 20, 14);
    const at = HEAD.clone().addScaledVector(dir, out);
    eye.translate(at.x, at.y + lift, at.z);
    return eye;
  });
  return mergeGeometries(parts);
}

/** The steel hinge the duck flips back on, and the stub that rides the chain. */
function bracketGeometry(): THREE.BufferGeometry {
  const plate = new THREE.BoxGeometry(0.16, 0.014, 0.08);
  plate.translate(-0.02, 0.03, 0);
  const knuckle = new THREE.CylinderGeometry(0.016, 0.016, 0.1, 16);
  knuckle.rotateX(Math.PI / 2);
  const post = new THREE.CylinderGeometry(0.014, 0.014, 0.09, 10);
  post.translate(-0.02, 0.075, 0);
  const stub = new THREE.BoxGeometry(0.03, 0.32, 0.03);
  stub.translate(0, -0.17, 0);
  return mergeGeometries([plate, knuckle, post, stub].map((g) => g.toNonIndexed()));
}

let parts: DuckParts | null = null;

function shared(): DuckParts {
  parts ??= {
    body: bodyGeometry(),
    wing: wingGeometry(),
    beak: beakGeometry(),
    sclera: eyeGeometry(0.036, 0.137),
    pupil: eyeGeometry(0.022, 0.162),
    shine: eyeGeometry(0.0075, 0.18, 0.01),
    bracket: bracketGeometry(),
  };
  return parts;
}

type DuckLook = { body: THREE.Material; wing: THREE.Material; beak: THREE.Material };

const looks = new Map<TargetKind, DuckLook>();
let eyeMaterials: { sclera: THREE.Material; pupil: THREE.Material; shine: THREE.Material; metal: THREE.Material } | null = null;

function look(kind: TargetKind): DuckLook {
  let found = looks.get(kind);
  if (found) return found;
  if (kind === "golden") {
    // Only part metal: the booth's soft environment leaves pure metal looking brown, and this one must shine.
    found = {
      body: new THREE.MeshStandardMaterial({ color: "#ffc629", metalness: 0.6, roughness: 0.24, emissive: "#7a4a00", emissiveIntensity: 0.5 }),
      wing: new THREE.MeshStandardMaterial({ color: "#f0a818", metalness: 0.65, roughness: 0.28, emissive: "#5a3400", emissiveIntensity: 0.4 }),
      beak: new THREE.MeshStandardMaterial({ color: "#ff9d2e", metalness: 0.8, roughness: 0.3 }),
    };
  } else {
    const body = kind === "duckling" ? "#ffe45c" : "#ffd21f";
    const wing = kind === "duckling" ? "#ffd02a" : "#f5b700";
    found = {
      // Rubber has a soft sheen, so a low roughness with a light clearcoat.
      body: new THREE.MeshPhysicalMaterial({ color: body, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
      wing: new THREE.MeshPhysicalMaterial({ color: wing, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
      beak: new THREE.MeshPhysicalMaterial({ color: "#ff7a12", roughness: 0.35, clearcoat: 0.5 }),
    };
  }
  looks.set(kind, found);
  return found;
}

function eyes() {
  eyeMaterials ??= {
    sclera: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.25 }),
    pupil: new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.15 }),
    shine: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    metal: new THREE.MeshStandardMaterial({ color: "#4a4f55", metalness: 0.8, roughness: 0.5 }),
  };
  return eyeMaterials;
}

/** A new duck model of the given kind (duck, duckling or golden), ready to place. */
export function createDuck(kind: TargetKind): THREE.Group {
  const geometry = shared();
  const paint = look(kind);
  const eye = eyes();
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, material: THREE.Material, shadow = true) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = shadow;
    group.add(mesh);
  };
  add(geometry.body, paint.body);
  add(geometry.wing, paint.wing);
  add(geometry.beak, paint.beak);
  add(geometry.sclera, eye.sclera, false);
  add(geometry.pupil, eye.pupil, false);
  add(geometry.shine, eye.shine, false);
  add(geometry.bracket, eye.metal);
  return group;
}
