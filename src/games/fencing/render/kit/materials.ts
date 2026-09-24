import * as THREE from "three";
import { brushedBump, leatherBump, stripes, weaveBump } from "./textures";

/**
 * Shared materials, made once per look and reused by every model that
 * wears it, so two fencers and a crowd cost a handful of shader programs.
 * Every surface kind has one recipe here, which keeps the hall consistent.
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

/** Woven cloth: fencing whites, doublets, coats and breeches. */
export function cloth(color: THREE.ColorRepresentation, roughness = 0.82): THREE.MeshStandardMaterial {
  return made(`cloth:${String(color)}:${roughness}`, () => {
    // Sheen is the soft bright rim woven cloth shows where it turns away from the light.
    const sheen = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5);
    const material = new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, sheen: 0.6, sheenRoughness: 0.55, sheenColor: sheen });
    material.bumpMap = weaveBump();
    material.bumpScale = 0.35;
    return material;
  });
}

/** Cloth with a pin stripe running down it. */
export function pinstripe(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  return made(`pinstripe:${String(color)}`, () => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, map: stripes() });
    material.bumpMap = weaveBump();
    material.bumpScale = 0.35;
    return material;
  });
}

/** Satin and silk: a smoother cloth with a soft sheen, for sashes, capes and trims. */
export function satin(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  return made(`satin:${String(color)}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.05 }));
}

export function leather(color: THREE.ColorRepresentation, roughness = 0.6): THREE.MeshStandardMaterial {
  return made(`leather:${String(color)}:${roughness}`, () => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    material.bumpMap = leatherBump();
    material.bumpScale = 0.5;
    return material;
  });
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

export function skin(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  // A touch of its own colour glowing back stands in for light passing through skin, so faces never go grey.
  return made(`skin:${String(color)}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, emissive: color, emissiveIntensity: 0.09 }));
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

/** Frees every shared material. Only the host calls this, when the game closes. */
export function disposeMaterials(): void {
  for (const material of cache.values()) material.dispose();
  cache.clear();
}
