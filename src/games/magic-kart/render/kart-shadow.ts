import * as THREE from "three";
import type { KartDesign } from "./models/kart-design";

/** How much bigger than the kart the shadow plane is, so its soft edge has room. */
export const SHADOW_PAD = { w: 1.35, l: 1.15 };

/**
 * A kart's contact shadow, drawn once from its own layout: a soft pool
 * under the body and four dark patches where the tyres meet the road,
 * which is what makes a kart look planted rather than floating. Laid on
 * a plane the size of the kart's footprint, front toward the bottom of
 * the picture.
 */
export function kartShadow(design: KartDesign): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const W = 128;
  const L = 256;
  const el = document.createElement("canvas");
  el.width = W;
  el.height = L;
  const ctx = el.getContext("2d");
  if (!ctx) return null;
  const sw = design.width * SHADOW_PAD.w;
  const sl = design.length * SHADOW_PAD.l;
  const px = (x: number) => (x / sw + 0.5) * W;
  const pz = (z: number) => (z / sl + 0.5) * L;
  ctx.filter = "blur(9px)";
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.roundRect(px(-design.width * 0.36), pz(-design.length * 0.45), (design.width * 0.72 * W) / sw, (design.length * 0.9 * L) / sl, 24);
  ctx.fill();
  ctx.filter = "blur(4px)";
  for (const w of design.wheels) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.ellipse(px(w.at[0]), pz(w.at[2]), ((w.width * 0.6) / sw) * W, ((w.radius * 0.75) / sl) * L, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
