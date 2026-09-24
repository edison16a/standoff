import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Texture } from "three";
import { canvas, scatter, texture } from "../textures/paint";
import type { Skin } from "../textures/skins-smooth";

/**
 * Materials for peel and flesh. Peel is glossy like the cover's fruit,
 * with a clear coat for the waxy ones and sheen for the fuzzy ones. Cut
 * flesh is wet: low roughness with a light clear coat on top.
 */

export interface SkinOptions {
  roughness?: number;
  clearcoat?: number;
  bumpScale?: number;
  /** Velvet fuzz, for peach and kiwi. */
  sheen?: string;
  emissive?: string;
  emissiveIntensity?: number;
}

export function skinMaterial(skin: Skin, options: SkinOptions = {}): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    map: skin.map,
    roughness: options.roughness ?? 0.42,
    clearcoat: options.clearcoat ?? 0.35,
    clearcoatRoughness: 0.3,
  });
  if (skin.bump) {
    material.bumpMap = skin.bump;
    material.bumpScale = options.bumpScale ?? 1.2;
  }
  if (options.sheen) {
    material.sheen = 1;
    material.sheenColor = new Color(options.sheen);
    material.sheenRoughness = 0.6;
  }
  if (options.emissive) {
    material.emissive = new Color(options.emissive);
    material.emissiveIntensity = options.emissiveIntensity ?? 0.3;
  }
  return material;
}

export function fleshMaterial(map: Texture): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ map, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.2, side: DoubleSide });
}

let leafTexture: Texture | null = null;

/** A leaf with a pale midrib and fine veins, shared by every leaf in the game. */
function leafMap(): Texture {
  if (leafTexture) return leafTexture;
  const { c, ctx } = canvas(128, 256);
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, "#2f7a1f");
  g.addColorStop(0.5, "#4fae2e");
  g.addColorStop(1, "#2f7a1f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = "rgba(210,240,170,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 256);
  ctx.lineTo(64, 0);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(200,235,160,0.45)";
  for (let y = 240; y > 10; y -= 18) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(64, y);
      ctx.quadraticCurveTo(64 + side * 30, y - 12, 64 + side * 60, y - 34);
      ctx.stroke();
    }
  }
  const r = scatter(3);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(20,60,10,${r() * 0.15})`;
    ctx.fillRect(r() * 128, r() * 256, 2, 2);
  }
  leafTexture = texture(c);
  return leafTexture;
}

const cache = new Map<string, MeshStandardMaterial>();

/** Leaves and green bits. Tinted, so one texture serves every shade of green. */
export function leafMaterial(tint = "#ffffff"): MeshStandardMaterial {
  const key = `leaf:${tint}`;
  let material = cache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({ map: leafMap(), color: new Color(tint), roughness: 0.5, side: DoubleSide });
    cache.set(key, material);
  }
  return material;
}

/** Woody stems, calyxes and stalks. */
export function woodyMaterial(colour: string): MeshStandardMaterial {
  const key = `woody:${colour}`;
  let material = cache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({ color: new Color(colour), roughness: 0.85 });
    cache.set(key, material);
  }
  return material;
}
