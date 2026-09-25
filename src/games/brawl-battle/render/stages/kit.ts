import * as THREE from "three";
import { glowMaterial, merge, solidMaterial } from "../models/geo";

/** Light for one stage: sky and ground fill, the key light and a coloured rim from behind. */
export interface Lighting {
  sky: string;
  ground: string;
  hemi: number;
  key: string;
  keyPower: number;
  keyFrom: readonly [number, number, number];
  rim: string;
  rimPower: number;
  fog: string;
  fogNear: number;
  fogFar: number;
}

/**
 * Collects a stage's painted scenery and merges it into one solid mesh
 * and one glowing mesh, so the whole backdrop costs two draws. Moving
 * pieces are kept apart with a function that animates them.
 */
export class SceneryKit {
  readonly group = new THREE.Group();
  private readonly solid: THREE.BufferGeometry[] = [];
  private readonly glow: THREE.BufferGeometry[] = [];
  private readonly movers: ((time: number, dt: number) => void)[] = [];
  private readonly disposables: { dispose(): void }[] = [];
  readonly solidMat = solidMaterial();
  readonly glowMat = glowMaterial();

  add(...geos: THREE.BufferGeometry[]): void {
    this.solid.push(...geos);
  }

  lit(...geos: THREE.BufferGeometry[]): void {
    this.glow.push(...geos);
  }

  /** A separate object that moves, with the function that moves it. */
  mover(object: THREE.Object3D, animate: (time: number, dt: number) => void): void {
    this.group.add(object);
    this.movers.push(animate);
    object.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.InstancedMesh) this.disposables.push(o.geometry);
    });
  }

  own(...things: { dispose(): void }[]): void {
    this.disposables.push(...things);
  }

  finish(): void {
    if (this.solid.length) this.group.add(new THREE.Mesh(merge(this.solid.splice(0)), this.solidMat));
    if (this.glow.length) this.group.add(new THREE.Mesh(merge(this.glow.splice(0)), this.glowMat));
  }

  update(time: number, dt: number): void {
    for (const move of this.movers) move(time, dt);
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material === this.solidMat || o.material === this.glowMat)) o.geometry.dispose();
    });
    for (const d of this.disposables) d.dispose();
    this.solidMat.dispose();
    this.glowMat.dispose();
  }
}

/** A tiny seeded random source for placing scenery, so every visit looks the same. */
export function scatter(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
