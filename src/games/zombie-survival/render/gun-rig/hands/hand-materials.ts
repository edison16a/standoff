import * as THREE from "three";

export interface HandMaterials {
  /** Coyote brown synthetic, light enough to read against a dark gun at night. */
  glove: THREE.MeshStandardMaterial;
  /** The darker rubber knuckle guard and straps. */
  pad: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  sleeve: THREE.MeshStandardMaterial;
}

let shared: HandMaterials | null = null;

/**
 * One set of hand materials for every player, made on first use. The
 * sleeve cuff in each player's colour is the rig's own, so it is not here.
 */
export function handMaterials(): HandMaterials {
  if (shared) return shared;
  shared = {
    glove: new THREE.MeshStandardMaterial({ color: 0x8c7556, roughness: 0.82, metalness: 0 }),
    pad: new THREE.MeshStandardMaterial({ color: 0x3d3731, roughness: 0.72, metalness: 0.05 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc08a6a, roughness: 0.58, metalness: 0 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x3b4031, roughness: 0.95, metalness: 0 }),
  };
  return shared;
}
