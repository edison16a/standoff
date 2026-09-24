import * as THREE from "three";
import { cloth, skin } from "../../surfaces";

/**
 * The zombies' materials, shared by every zombie so a crowd costs no more
 * shader switches than one. Variety comes from mixing them: three skin
 * tones, a rack of dirty shirts and trousers.
 */
export interface ZombieMaterials {
  skins: THREE.MeshStandardMaterial[];
  shirts: THREE.MeshStandardMaterial[];
  pants: THREE.MeshStandardMaterial[];
  shoe: THREE.MeshStandardMaterial;
  blood: THREE.MeshStandardMaterial;
  gore: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  teeth: THREE.MeshStandardMaterial;
  mouth: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  armor: THREE.MeshStandardMaterial;
  armorDark: THREE.MeshStandardMaterial;
  visor: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  weak: THREE.MeshStandardMaterial;
  weakDead: THREE.MeshStandardMaterial;
  core: THREE.MeshStandardMaterial;
  proxy: THREE.MeshBasicMaterial;
}

let shared: ZombieMaterials | null = null;

export function zombieMaterials(): ZombieMaterials {
  if (shared) return shared;
  const skinMap = skin();
  const clothMap = cloth();
  const std = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...params });
  shared = {
    skins: [0x7f8c72, 0x8e9282, 0x6c7866].map((color) => std({ color, map: skinMap, roughness: 0.7 })),
    shirts: [0x44566a, 0x6a2f28, 0x3f4830, 0x8a8478, 0x2f2f38, 0x5c5030].map((color) => std({ color, map: clothMap })),
    pants: [0x1f2636, 0x2b2a24, 0x352f28].map((color) => std({ color, map: clothMap })),
    shoe: std({ color: 0x1d1a17, roughness: 0.6 }),
    blood: std({ color: 0x2e0604, roughness: 0.3, metalness: 0.1 }),
    gore: std({ color: 0x4e1210, roughness: 0.8, emissive: 0x0a0000 }),
    bone: std({ color: 0x9c9078, roughness: 0.7 }),
    teeth: std({ color: 0xb0a47c, roughness: 0.5 }),
    mouth: std({ color: 0x1a0606, roughness: 1 }),
    eye: std({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 2.2 }),
    hair: std({ color: 0x1b1612, roughness: 1 }),
    leather: std({ color: 0x3a2518, roughness: 0.55, map: clothMap }),
    armor: std({ color: 0x3b4136, roughness: 0.55, metalness: 0.35 }),
    armorDark: std({ color: 0x1c1f1c, roughness: 0.5, metalness: 0.5 }),
    visor: std({ color: 0x0a0f14, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.8 }),
    steel: std({ color: 0x4a4440, roughness: 0.6, metalness: 0.7 }),
    weak: std({ color: 0xffa12a, emissive: 0xff8a1a, emissiveIntensity: 2.4, roughness: 0.3 }),
    weakDead: std({ color: 0x2a0a06, emissive: 0x200000, roughness: 0.8 }),
    core: std({ color: 0xff5a2a, emissive: 0xff4010, emissiveIntensity: 2.2, roughness: 0.3 }),
    proxy: new THREE.MeshBasicMaterial({ visible: false }),
  };
  return shared;
}
