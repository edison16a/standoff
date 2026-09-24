import * as THREE from "three";
import { asphalt, concrete, corrugated, facade, facadeGlow, grass } from "../surfaces";
import { signTexture } from "../textures";

/** The city's shared materials, made once. Every block of scenery draws with these. */
export interface WorldMaterials {
  road: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  curb: THREE.MeshStandardMaterial;
  paint: THREE.MeshStandardMaterial;
  whitePaint: THREE.MeshStandardMaterial;
  facades: THREE.MeshStandardMaterial[];
  roof: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  rust: THREE.MeshStandardMaterial;
  bulb: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  carPaints: THREE.MeshStandardMaterial[];
  tire: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  dirt: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  leaves: THREE.MeshStandardMaterial[];
  containers: THREE.MeshStandardMaterial[];
  barrier: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  hospital: THREE.MeshStandardMaterial;
  redCross: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  trash: THREE.MeshStandardMaterial;
  fire: THREE.MeshBasicMaterial;
  cone: THREE.MeshBasicMaterial;
  highwaySign: THREE.MeshStandardMaterial;
  collider: THREE.MeshBasicMaterial;
}

let shared: WorldMaterials | null = null;

export function worldMaterials(): WorldMaterials {
  if (shared) return shared;
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...p });
  const glow = facadeGlow();
  const face = (style: "brick" | "concrete" | "stone", color: number) =>
    std({ map: facade(style), color, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0.85, roughness: 0.9 });
  shared = {
    road: std({ map: asphalt(), color: 0x8c8c90, roughness: 0.92 }),
    sidewalk: std({ map: concrete(), color: 0x8e8e8a }),
    curb: std({ map: concrete(), color: 0x6a6a66 }),
    paint: std({ color: 0xc9b25a, roughness: 0.7, emissive: 0x2a2208 }),
    whitePaint: std({ color: 0xbfbfbf, roughness: 0.7, emissive: 0x101010 }),
    facades: [face("brick", 0xb0a6a0), face("concrete", 0x9aa0a8), face("stone", 0xa89e90)],
    roof: std({ map: concrete(), color: 0x3e3f42 }),
    darkMetal: std({ color: 0x2a2c30, metalness: 0.7, roughness: 0.5 }),
    rust: std({ color: 0x5a3a26, metalness: 0.4, roughness: 0.8 }),
    bulb: std({ color: 0xfff0c0, emissive: 0xffd28a, emissiveIntensity: 3 }),
    glass: std({ color: 0x0c1218, metalness: 0.6, roughness: 0.15 }),
    carPaints: [0x6b1c1c, 0x1f3550, 0x2d4032, 0x8a8a88, 0x1a1a1c, 0x7a6230].map((color) => std({ color, metalness: 0.6, roughness: 0.35 })),
    tire: std({ color: 0x121212, roughness: 0.95 }),
    chrome: std({ color: 0xaab0b8, metalness: 1, roughness: 0.25 }),
    headlight: std({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 0.6 }),
    taillight: std({ color: 0x550000, emissive: 0xff1010, emissiveIntensity: 0.8 }),
    grass: std({ map: grass(), color: 0x9ab08a }),
    dirt: std({ map: concrete(), color: 0x5a4a38 }),
    bark: std({ color: 0x2e2218, roughness: 1 }),
    leaves: [0x1f3322, 0x2a3a22, 0x1a2a20].map((color) => std({ color, roughness: 1 })),
    containers: [0x7a2a22, 0x1f4a6a, 0x2e5a36, 0x9a5a1a, 0x5a5e62].map((color) => std({ map: corrugated(), color, metalness: 0.4, roughness: 0.6 })),
    barrier: std({ map: concrete(), color: 0xb0aea6 }),
    water: std({ color: 0x0a141c, metalness: 0.9, roughness: 0.12 }),
    hospital: std({ map: facade("concrete"), color: 0xd6dadc, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 1 }),
    redCross: std({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: 2 }),
    wood: std({ color: 0x4a3322, roughness: 0.9 }),
    trash: std({ color: 0x151517, roughness: 0.4, metalness: 0.2 }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    cone: new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    highwaySign: std({ map: signTexture("docks", ["PORT  DOCKS", "EXIT 2 MILES"], "#0f5a32", "#f0f0f0"), roughness: 0.6, emissive: 0x0a2a14 }),
    collider: new THREE.MeshBasicMaterial({ visible: false }),
  };
  return shared;
}
