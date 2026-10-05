import * as THREE from "three";
import type { KartDesign } from "./models/kart-design";

/** How much bigger than the kart the shadow plane is, so its soft edge has room. */
export const SHADOW_PAD = { w: 1.35, l: 1.15 };

/** A soft oval of shade: dark in the middle, fading to nothing at its edge. */
function softOval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.75})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A kart's contact shadow, drawn once from its own layout: a soft pool
 * under the body and four dark patches where the tyres meet the road,
 * which is what makes a kart look planted rather than floating. Laid on
 * a plane the size of the kart's footprint, front toward the bottom of
 * the picture. Gradients only, so it is soft in every browser.
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
  softOval(ctx, W / 2, L / 2, ((design.width * 0.46) / sw) * W, ((design.length * 0.52) / sl) * L, 0.45);
  for (const w of design.wheels) softOval(ctx, px(w.at[0]), pz(w.at[2]), ((w.width * 0.75) / sw) * W, ((w.radius * 0.9) / sl) * L, 0.55);
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
