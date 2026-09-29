import * as THREE from "three";

/**
 * Shared finishes for the trophies. Polished metal only looks like metal
 * when it has something to reflect, so give the scene an environment map
 * (see `studioEnvironment`) or these read as flat brown.
 */
export interface TrophyMaterials {
  gold: THREE.MeshPhysicalMaterial;
  /** Brushed gold for bands and recesses, so the polished parts stand out. */
  satinGold: THREE.MeshPhysicalMaterial;
  silver: THREE.MeshPhysicalMaterial;
  /** The deep green stone bands of the football trophy. */
  malachite: THREE.MeshPhysicalMaterial;
  /** Dark polished wood or stone for plinths. */
  plinth: THREE.MeshPhysicalMaterial;
  dispose(): void;
}

export function trophyMaterials(): TrophyMaterials {
  const gold = new THREE.MeshPhysicalMaterial({ color: "#f2c14e", metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.5 });
  const satinGold = new THREE.MeshPhysicalMaterial({ color: "#d9a53a", metalness: 1, roughness: 0.38, envMapIntensity: 1.2 });
  const silver = new THREE.MeshPhysicalMaterial({ color: "#e4e8ee", metalness: 1, roughness: 0.14, envMapIntensity: 1.4 });
  const malachite = new THREE.MeshPhysicalMaterial({ color: "#04592f", metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.6 });
  const plinth = new THREE.MeshPhysicalMaterial({ color: "#16161c", metalness: 0.2, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const all = [gold, satinGold, silver, malachite, plinth];
  return { gold, satinGold, silver, malachite, plinth, dispose: () => all.forEach((m) => m.dispose()) };
}

/** Every mesh in a group casts and takes shadows. */
export function shadowAll(group: THREE.Object3D, cast = true, receive = true): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = cast;
      object.receiveShadow = receive;
    }
  });
}

/** Disposes the geometries in a group. Materials are shared, so they are disposed by their owner. */
export function disposeGeometries(group: THREE.Object3D): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
}
