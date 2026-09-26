import * as THREE from "three";
import { brushedBump } from "./textures";

/**
 * Shared materials, made once per look and reused by every model that
 * wears it, so two fighters and a crowd cost a handful of shader programs.
 * Every surface kind has one recipe here, which keeps the arena consistent.
 */

const cache = new Map<string, THREE.MeshStandardMaterial>();

function made(key: string, make: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  let material = cache.get(key);
  if (!material) {
    material = make();
    material.name = key;
    material.userData.shared = true;
    cache.set(key, material);
  }
  return material;
}

/** Polished or worked metal. Blades are near mirrors, armour is brushed. */
export function metal(color: THREE.ColorRepresentation, roughness = 0.28, brushed = true): THREE.MeshStandardMaterial {
  return made(`metal:${String(color)}:${roughness}:${brushed}`, () => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 1 });
    if (brushed) {
      material.bumpMap = brushedBump();
      material.bumpScale = 0.25;
    }
    return material;
  });
}

/** Hard smooth plastic and rubber: grips, soles, sockets. */
export function plastic(color: THREE.ColorRepresentation, roughness = 0.45): THREE.MeshStandardMaterial {
  return made(`plastic:${String(color)}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
}

/** Something that gives off its own light: lamps, screens, LED strips. */
export function glow(color: THREE.ColorRepresentation, intensity = 2): THREE.MeshStandardMaterial {
  return made(`glow:${String(color)}:${intensity}`, () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }));
}

/** A private copy of a shared material, to change without touching everyone else's. */
export function own(material: THREE.MeshStandardMaterial, changes: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const copy = material.clone();
  copy.userData.shared = false;
  copy.setValues(changes);
  return copy;
}
