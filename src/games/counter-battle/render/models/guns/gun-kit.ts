import * as THREE from "three";
import { merge } from "../../geo";

/**
 * What every gun model provides. Guns are built along +z with the origin
 * at the right hand's wrist on the pistol grip, y up. The hand frames say
 * how each hand sits: which way the fingers point and the palm faces.
 */
export interface GunModel {
  root: THREE.Group;
  /** The tip of the barrel, for the flash and the tracer. */
  muzzle: THREE.Object3D;
  /** The end of the stock, set into the shoulder when aiming. */
  butt: THREE.Vector3;
  /** Where the left wrist sits to hold the front of the gun. */
  fore: THREE.Vector3;
  /** How each hand is turned on the gun. */
  handR: THREE.Quaternion;
  handL: THREE.Quaternion;
  /** The magazine, which the reload pulls out and puts back. Null for the shotgun's tube. */
  mag: THREE.Object3D | null;
  /** The pump, which slides back after each shotgun shot. */
  pump: THREE.Object3D | null;
  /** The bolt or charging handle, which the hand works. */
  bolt: THREE.Object3D | null;
  /** Where a hand reaches to work the bolt. */
  handle: THREE.Vector3;
  /** Where shells go in, for the shotgun. */
  port: THREE.Vector3 | null;
  dispose(): void;
}

let mats: { metal: THREE.MeshStandardMaterial; poly: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial } | null = null;

/** Three finishes for every gun, shared: colours live in the vertices. */
export function gunMaterials() {
  mats ??= {
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.75 }),
    poly: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.05 }),
    glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.9, emissive: "#1a0505" }),
  };
  return mats;
}

export type GunFinish = "metal" | "poly" | "glass";

/** Collects painted parts for one piece of a gun (body, magazine, pump) and builds it as meshes. */
export class GunPiece {
  private readonly parts: Record<GunFinish, THREE.BufferGeometry[]> = { metal: [], poly: [], glass: [] };

  add(finish: GunFinish, ...geos: THREE.BufferGeometry[]): this {
    this.parts[finish].push(...geos);
    return this;
  }

  /** Builds the piece into `into` and returns the geometries, for disposal. */
  build(into: THREE.Object3D): THREE.BufferGeometry[] {
    const m = gunMaterials();
    const out: THREE.BufferGeometry[] = [];
    for (const finish of ["metal", "poly", "glass"] as const) {
      if (this.parts[finish].length === 0) continue;
      const geo = merge(this.parts[finish]);
      const mesh = new THREE.Mesh(geo, m[finish]);
      mesh.castShadow = true;
      into.add(mesh);
      out.push(geo);
    }
    return out;
  }
}

/** A hand's turn on the gun from where its fingers point and which way its palm faces. */
export function handFrame(fingers: [number, number, number], palm: [number, number, number]): THREE.Quaternion {
  const y = new THREE.Vector3(...fingers).normalize().negate();
  const z = new THREE.Vector3(...palm);
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** An empty marker at a point. */
export function marker(name: string, x: number, y: number, z: number): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  return o;
}

/** A cylinder lying along z, the way barrels, tubes and scopes run. */
export function tubeZ(r0: number, r1: number, len: number, seg = 14): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.rotateX(Math.PI / 2);
  return g;
}

/** The standard right hand on a pistol grip: fingers down and forward round it, palm toward the gun. */
export const GRIP_R = handFrame([0.1, -0.72, 0.68], [1, 0, 0]);
/** The left hand under a handguard: fingers up round its far side, palm up. */
export const CUP_L = handFrame([-0.75, 0.55, 0.2], [0.35, 0.9, 0.1]);
