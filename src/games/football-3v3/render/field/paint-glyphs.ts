import * as THREE from "three";
import { packDistance, signedDistance } from "./sdf";

/** A digit's cell in the atlas, pixels: the glyph fills the middle, with room round it for the distance to fade. */
export const DIGIT = { cellW: 112, cellH: 160, pad: 16, count: 6, spread: 10 } as const;
/** Each end zone word's row, pixels. */
export const WORD = { w: 1024, h: 256, pad: 24, spread: 12 } as const;

const FONT = '"Arial Black", "Helvetica Neue", Impact, Arial, sans-serif';

/** Draws `text` in white, stretched to fill a w by h box at (x, y). */
function fill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.font = `900 200px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  ctx.translate(x, y);
  ctx.scale(w / tw, h / th);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);
  ctx.restore();
}

/** A one channel distance texture from what a draw function paints on a transparent canvas. */
function distanceTexture(width: number, height: number, spread: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.DataTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(ctx);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]!;
  const packed = packDistance(signedDistance(alpha, width, height), spread);
  const texture = new THREE.DataTexture(packed, width, height, THREE.RedFormat, THREE.UnsignedByteType);
  // Canvas rows run top down; the shader reads them that way too.
  texture.flipY = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The field's numerals 0 to 5 as distance fields, side by side: tall
 * block digits, so the shader can paint them crisp from a camera on the
 * turf to one across the stadium.
 */
export function digitAtlas(): THREE.DataTexture {
  const { cellW, cellH, pad, count, spread } = DIGIT;
  return distanceTexture(cellW * count, cellH, spread, (ctx) => {
    for (let d = 0; d < count; d++) fill(ctx, String(d), d * cellW + pad, pad, cellW - 2 * pad, cellH - 2 * pad);
  });
}

/** Each team's name for its end zone, as distance fields, one row each, in team order. */
export function wordAtlas(words: readonly string[]): THREE.DataTexture {
  const { w, h, pad, spread } = WORD;
  return distanceTexture(w, h * words.length, spread, (ctx) => {
    words.forEach((word, i) => fill(ctx, word, pad, i * h + pad * 1.5, w - 2 * pad, h - 3 * pad));
  });
}
