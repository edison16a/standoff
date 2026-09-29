import * as THREE from "three";

export type Metal = "gold" | "silver" | "bronze";

const METAL_COLOUR: Record<Metal, string> = {
  gold: "#f6c453",
  silver: "#dfe3ea",
  bronze: "#c8804a",
};

/**
 * Polished metal. Metal shows only what it reflects, so the scene needs
 * an environment map (see `studioEnvironment`) or it reads as black.
 */
export function metal(kind: Metal = "gold", roughness = 0.18): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: METAL_COLOUR[kind],
    metalness: 1,
    roughness,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.3,
  });
}

/** Brushed metal, for the grooves and backs that should not shine like the faces. */
export function satinMetal(kind: Metal = "gold"): THREE.MeshPhysicalMaterial {
  const m = metal(kind, 0.42);
  m.color.multiplyScalar(0.82);
  m.clearcoat = 0;
  return m;
}

/** Polished green stone, like the malachite bands on a football trophy. */
export function malachite(): THREE.MeshPhysicalMaterial {
  const map = bandedTexture();
  // The map carries the green itself where there is one, so the colour must not tint it twice.
  return new THREE.MeshPhysicalMaterial({ color: map ? "#ffffff" : "#0f7a4a", roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, map });
}

/** A cut gem that catches the light. */
export function gem(colour: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: colour,
    metalness: 0.1,
    roughness: 0.02,
    transmission: 0.35,
    thickness: 0.02,
    ior: 2.2,
    clearcoat: 1,
    emissive: new THREE.Color(colour).multiplyScalar(0.18),
    envMapIntensity: 2,
  });
}

/** Lacquered black, for plinths. */
export function lacquer(colour: THREE.ColorRepresentation = "#101216"): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
}

/** Wavy light and dark rings, the grain of polished malachite. */
function bandedTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (let x = 0; x < 256; x++) {
    for (let y = 0; y < 64; y += 2) {
      const wave = Math.sin(x * 0.09 + Math.sin(y * 0.2) * 2.4 + Math.sin(x * 0.023) * 3) * 0.5 + 0.5;
      const light = 55 + wave * 70;
      ctx.fillStyle = `rgb(${light * 0.25},${light},${light * 0.6})`;
      ctx.fillRect(x, y, 1, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Frees every geometry and material under an object, for trophies built here. */
export function disposeTree(root: THREE.Object3D): void {
  const seen = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const m of list as THREE.Material[]) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    }
  });
}
