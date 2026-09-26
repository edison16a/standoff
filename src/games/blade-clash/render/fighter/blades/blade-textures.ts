import * as THREE from "three";
import { canvasTexture } from "../../kit/textures";

/**
 * The katana's handle: black silk cord wrapped in crossing diamonds over
 * pale ray skin, the pattern every tsuka is known by.
 */
export function wrapTexture(): THREE.CanvasTexture {
  const texture = canvasTexture("tsuka", (ctx, w, h) => {
    ctx.fillStyle = "#e9e4d6";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#15151b";
    const rows = 4;
    const step = h / rows;
    for (let i = 0; i <= rows; i++) {
      // Each crossing leaves a diamond of pale skin showing between the cords.
      const y = i * step;
      ctx.beginPath();
      ctx.moveTo(0, y - step * 0.5);
      ctx.lineTo(w / 2, y - step * 0.08);
      ctx.lineTo(w, y - step * 0.5);
      ctx.lineTo(w, y + step * 0.05);
      ctx.lineTo(w / 2, y + step * 0.47);
      ctx.lineTo(0, y + step * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * step - step * 0.2);
      ctx.lineTo(w / 2, i * step + step * 0.2);
      ctx.stroke();
    }
  }, { width: 64, height: 128 });
  texture.repeat.set(2, 2);
  return texture;
}
