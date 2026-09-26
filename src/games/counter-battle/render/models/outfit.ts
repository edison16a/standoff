import * as THREE from "three";
import { merge } from "../geo";

/** The finishes a fighter is made of. Every one reads its colour from the vertices. */
export type Finish = "cloth" | "skin" | "gear" | "lens";

/** The colours one fighter wears: their team's pair, their own seat colour and a skin tone. */
export interface Kit {
  team: string;
  dark: string;
  player: string;
  skin: string;
}

function makeMaterials(): Record<Finish, THREE.MeshStandardMaterial> {
  return {
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }),
    skin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }),
    gear: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25 }),
    lens: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.75, envMapIntensity: 1.6 }),
  };
}

let shared: Record<Finish, THREE.MeshStandardMaterial> | null = null;

/** One set of finishes for every fighter; colours live in the vertices, so they can share. */
export function fighterMaterials(): Record<Finish, THREE.MeshStandardMaterial> {
  shared ??= makeMaterials();
  return shared;
}

/**
 * Gathers painted parts per joint and finish while a character is built,
 * then merges each group into one mesh on its joint. A fighter ends up
 * with one mesh per finish per body segment.
 */
export class Outfit {
  private readonly parts = new Map<THREE.Object3D, Map<Finish, THREE.BufferGeometry[]>>();
  private readonly built: THREE.BufferGeometry[] = [];

  add(joint: THREE.Object3D, finish: Finish, ...geos: THREE.BufferGeometry[]): void {
    let byFinish = this.parts.get(joint);
    if (!byFinish) {
      byFinish = new Map();
      this.parts.set(joint, byFinish);
    }
    const list = byFinish.get(finish) ?? [];
    list.push(...geos);
    byFinish.set(finish, list);
  }

  /** Merges everything onto the joints. Returns the meshes made, for shadows and disposal. */
  build(): THREE.Mesh[] {
    const mats = fighterMaterials();
    const meshes: THREE.Mesh[] = [];
    for (const [joint, byFinish] of this.parts) {
      for (const [finish, geos] of byFinish) {
        if (geos.length === 0) continue;
        const geo = merge(geos);
        this.built.push(geo);
        const mesh = new THREE.Mesh(geo, mats[finish]);
        mesh.castShadow = true;
        joint.add(mesh);
        meshes.push(mesh);
      }
    }
    this.parts.clear();
    return meshes;
  }

  dispose(): void {
    for (const g of this.built) g.dispose();
  }
}
