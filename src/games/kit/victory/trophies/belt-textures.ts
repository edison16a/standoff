import * as THREE from "three";
import { seededRandom } from "../random";

/** A canvas, or null away from a browser, where the belt simply goes without its printed detail. */
function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  return ctx ? [element, ctx] : null;
}

/**
 * The strap's leather: a fine grain, a pressed border and two rows of
 * gold stitching along each edge. The same picture in grey makes the
 * bump map, so the stitches and the border stand up in the light.
 */
export function leatherTextures(colour: string, stitch: string): { map: THREE.Texture | null; bump: THREE.Texture | null } {
  const made = [canvas(1024, 192), canvas(1024, 192)];
  if (!made[0] || !made[1]) return { map: null, bump: null };
  const [[mapCanvas, map], [bumpCanvas, bump]] = made as [[HTMLCanvasElement, CanvasRenderingContext2D], [HTMLCanvasElement, CanvasRenderingContext2D]];
  map.fillStyle = colour;
  map.fillRect(0, 0, 1024, 192);
  bump.fillStyle = "#808080";
  bump.fillRect(0, 0, 1024, 192);
  const r = seededRandom(5);
  // Grain: many faint specks, darker and lighter than the hide.
  for (let i = 0; i < 9000; i++) {
    const x = r() * 1024;
    const y = r() * 192;
    const light = r() > 0.5;
    map.fillStyle = light ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
    map.fillRect(x, y, 2, 2);
    bump.fillStyle = light ? "#8a8a8a" : "#707070";
    bump.fillRect(x, y, 2, 2);
  }
  for (const ctx of [map, bump]) {
    // A pressed groove just in from each edge.
    ctx.strokeStyle = ctx === map ? "rgba(0,0,0,0.45)" : "#505050";
    ctx.lineWidth = 3;
    for (const y of [22, 170]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    // Stitches: short dashes either side of the groove.
    ctx.strokeStyle = ctx === map ? stitch : "#c8c8c8";
    ctx.lineWidth = 3.2;
    ctx.setLineDash([9, 6]);
    for (const y of [12, 32, 160, 180]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  const mapTexture = new THREE.CanvasTexture(mapCanvas);
  mapTexture.colorSpace = THREE.SRGBColorSpace;
  mapTexture.anisotropy = 4;
  return { map: mapTexture, bump: new THREE.CanvasTexture(bumpCanvas) };
}

/** Engraved words on a gold banner: dark letters with a bright edge, as if cut into the metal. */
export function bannerTexture(text: string): THREE.Texture | null {
  const made = canvas(512, 112);
  if (!made) return null;
  const [element, ctx] = made;
  const gradient = ctx.createLinearGradient(0, 0, 0, 112);
  gradient.addColorStop(0, "#fff1c1");
  gradient.addColorStop(0.5, "#e2b448");
  gradient.addColorStop(1, "#a8761c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 112);
  ctx.font = "900 64px 'Arial Black', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 64;
  while (ctx.measureText(text).width > 460 && size > 20) ctx.font = `900 ${(size -= 4)}px 'Arial Black', Impact, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(text, 257, 59);
  ctx.fillStyle = "#3b2406";
  ctx.fillText(text, 256, 57);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
