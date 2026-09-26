import type * as THREE from "three";
import { canvasTexture } from "../kit/textures";

/**
 * The arena's painted surfaces: flagstones for the duelling dais, cut
 * blocks for the walls, raked sand for the ground and the banners that
 * hang from the walls. All painted once on a canvas, seeded, and shared.
 */

/** Square flagstones with worn edges and speckled grain. */
export function flagstoneTexture(base: string): THREE.CanvasTexture {
  return canvasTexture(`flagstone:${base}`, (ctx, w, h, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const cells = 4;
    const size = w / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const shade = (rand() - 0.5) * 34;
        ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 240 : 0},${shade > 0 ? 220 : 0},${Math.abs(shade) / 255})`;
        ctx.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
      }
    }
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
    // The joints between the stones.
    ctx.fillStyle = "rgba(20,14,10,0.55)";
    for (let i = 0; i <= cells; i++) {
      ctx.fillRect(i * size - 2, 0, 4, h);
      ctx.fillRect(0, i * size - 2, w, 4);
    }
  }, { width: 512 });
}

/** Courses of cut stone blocks, offset every other row, for the walls and gate towers. */
export function blockTexture(base: string): THREE.CanvasTexture {
  return canvasTexture(`blocks:${base}`, (ctx, w, h, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -rowH : 0;
      while (x < w) {
        const len = rowH * (1.6 + rand() * 0.8);
        const shade = (rand() - 0.5) * 40;
        ctx.fillStyle = shade > 0 ? `rgba(255,245,230,${shade / 255})` : `rgba(0,0,0,${-shade / 255})`;
        ctx.fillRect(x + 2, r * rowH + 2, len - 4, rowH - 4);
        ctx.fillStyle = "rgba(15,10,8,0.5)";
        ctx.fillRect(x, r * rowH, 3, rowH);
        x += len;
      }
      ctx.fillStyle = "rgba(15,10,8,0.5)";
      ctx.fillRect(0, r * rowH, w, 3);
    }
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
  }, { width: 512 });
}

/** Raked sand: fine grain with the arcs of the rake across it. */
export function sandTexture(base: string): THREE.CanvasTexture {
  return canvasTexture(`sand:${base}`, (ctx, w, h, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const light = rand() < 0.5;
      ctx.fillStyle = light ? "rgba(255,250,235,0.08)" : "rgba(60,35,10,0.1)";
      ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
    }
    ctx.strokeStyle = "rgba(60,35,10,0.08)";
    ctx.lineWidth = 3;
    for (let y = 0; y < h; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 6, w * 0.7, y - 6, w, y);
      ctx.stroke();
    }
  }, { width: 512 });
}

/** A long banner: a field of colour, a gold border and a crossed swords emblem. */
export function bannerTexture(field: string, ink: string): THREE.CanvasTexture {
  return canvasTexture(`banner:${field}:${ink}`, (ctx, w, h) => {
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = ink;
    ctx.lineWidth = w * 0.06;
    ctx.strokeRect(w * 0.08, w * 0.08, w * 0.84, h - w * 0.16);
    // Crossed swords over a round shield, a little above the middle.
    const cx = w / 2;
    const cy = h * 0.38;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.lineWidth = w * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx - s * w * 0.3, cy + w * 0.36);
      ctx.lineTo(cx + s * w * 0.3, cy - w * 0.36);
      ctx.stroke();
      ctx.lineWidth = w * 0.035;
      ctx.beginPath();
      ctx.moveTo(cx - s * w * 0.3 - w * 0.08, cy + w * 0.2);
      ctx.lineTo(cx - s * w * 0.3 + w * 0.12, cy + w * 0.32);
      ctx.stroke();
    }
    // A swallowtail at the bottom is cut by the mesh; a fringe of stripes above it.
    for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.12 + i * 0.14), h * 0.8, w * 0.06, h * 0.08);
  }, { width: 128, height: 512, repeat: false });
}
