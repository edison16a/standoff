import * as THREE from "three";
import type { MeshBuilder } from "../../mesh-builder";
import { scuffs, wood } from "../../surfaces";

/**
 * A built gun. The barrel points down -z and the origin sits at the
 * trigger, where the hand holds it. Moving parts are separate so the
 * reload and the recoil can animate them.
 */
export interface GunModel {
  root: THREE.Group;
  /** The tip of the barrel, for the flash and the tracer. */
  muzzle: THREE.Object3D;
  /** Where the laser sight's beam leaves the gun. */
  laser: THREE.Object3D;
  magazine: THREE.Object3D | null;
  /** The shotgun's slide. */
  pump: THREE.Object3D | null;
  /** The bolt or charging handle, which snaps back on each shot. */
  bolt: THREE.Object3D | null;
  /** A loose shell the shotgun's reload pushes in, hidden until then. */
  shell: THREE.Object3D | null;
  /** Rough length, so the view can frame it. */
  length: number;
}

export interface GunMaterials {
  metal: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  polymer: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  shellRed: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  tan: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  hole: THREE.MeshStandardMaterial;
}

let shared: GunMaterials | null = null;

/** One set of gun materials for every gun, created on first use. */
export function gunMaterials(): GunMaterials {
  if (shared) return shared;
  const rough = scuffs();
  const std = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.22, ...params });
  shared = {
    metal: std({ color: 0x1e2024, metalness: 0.8, roughness: 0.48, roughnessMap: rough }),
    steel: std({ color: 0x55595f, metalness: 0.9, roughness: 0.32, roughnessMap: rough }),
    polymer: std({ color: 0x1c1d20, metalness: 0.05, roughness: 0.78 }),
    wood: std({ color: 0xc58955, map: wood(), roughness: 0.5, metalness: 0 }),
    darkWood: std({ color: 0x8a5230, map: wood(), roughness: 0.55, metalness: 0 }),
    brass: std({ color: 0xd1a54a, metalness: 1, roughness: 0.3 }),
    shellRed: std({ color: 0xa3201f, roughness: 0.45, metalness: 0.05 }),
    rubber: std({ color: 0x111111, roughness: 0.95 }),
    tan: std({ color: 0x7c6b4e, roughness: 0.8, metalness: 0.05 }),
    lens: std({ color: 0x330000, emissive: 0xff2a2a, emissiveIntensity: 1.6, roughness: 0.2 }),
    glass: std({ color: 0x0a1a24, metalness: 0.5, roughness: 0.05, transparent: true, opacity: 0.7 }),
    hole: std({ color: 0x050505, roughness: 1 }),
  };
  return shared;
}

/** Gives every gun material a reflection to catch, so metal reads as metal in the dark. */
export function setGunEnvironment(texture: THREE.Texture | null): void {
  const mats = gunMaterials();
  for (const mat of Object.values(mats)) {
    mat.envMap = texture;
    mat.needsUpdate = true;
  }
}

/** An empty marker at a point, for the muzzle and the laser. */
export function marker(name: string, x: number, y: number, z: number): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  return o;
}

/** A laser sight module: a small box with a glowing red lens at the front. */
export function laserModule(b: MeshBuilder, m: GunMaterials, x: number, y: number, z: number): void {
  b.box(0.026, 0.026, 0.07, m.polymer, [x, y, z], undefined, 0.004);
  b.box(0.03, 0.008, 0.05, m.metal, [x, y + 0.016, z]);
  b.tube(0.008, 0.006, m.lens, [x, y, z - 0.037], 12);
  b.box(0.006, 0.006, 0.012, m.steel, [x + 0.016, y, z + 0.01]);
}

/** The dark hole at the end of a barrel, so the muzzle is not a solid rod. */
export function boreHole(b: MeshBuilder, m: GunMaterials, radius: number, y: number, z: number): void {
  b.tube(radius, 0.004, m.hole, [0, y, z], 16);
}
