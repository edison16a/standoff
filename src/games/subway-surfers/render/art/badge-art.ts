import * as THREE from "three";
import { painted } from "../textures";
import { toon } from "../toon";

let material: THREE.Material | null = null;

/**
 * The runner's own cap badge: a lightning bolt sprayed over a splat, with
 * drips and spray dots, in the yard's graffiti colours. No letters, so it
 * reads as a tag from far off. Null where there is no canvas, as in tests.
 */
export function badgeMaterial(): THREE.Material | null {
  if (material) return material;
  if (typeof document === "undefined") return null;
  material = toon({ map: badgeTexture(), transparent: true, alphaTest: 0.4 });
  material.userData.shared = true;
  return material;
}

function badgeTexture(): THREE.Texture {
  return painted("runner-badge", 256, 192, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // The splat: a fat round blob with bumps, in teal with a navy rim.
    const splat = new Path2D();
    const bumps = 11;
    for (let i = 0; i <= bumps * 2; i++) {
      const a = (i / (bumps * 2)) * Math.PI * 2;
      const r = (i % 2 === 0 ? 74 : 62) + 6 * Math.sin(i * 2.3);
      const x = w / 2 + Math.cos(a) * r * 1.25;
      const y = h / 2 + Math.sin(a) * r * 0.92;
      if (i === 0) splat.moveTo(x, y);
      else splat.quadraticCurveTo(w / 2 + Math.cos(a - 0.15) * r * 1.4, h / 2 + Math.sin(a - 0.15) * r, x, y);
    }
    ctx.fillStyle = "#1f2a6b";
    ctx.save();
    ctx.translate(4, 5);
    ctx.fill(splat);
    ctx.restore();
    ctx.fillStyle = "#18c6b0";
    ctx.fill(splat);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1f2a6b";
    ctx.stroke(splat);
    // Drips running off the bottom.
    for (const [x, len] of [[92, 34], [150, 24], [176, 40]] as const) {
      ctx.fillStyle = "#18c6b0";
      ctx.strokeStyle = "#1f2a6b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - 6, h / 2 + 46, 12, len, 6);
      ctx.fill();
      ctx.stroke();
    }
    // The bolt, chunky, with a dark outline, a drop shadow and a shine.
    const bolt = new Path2D("M 142 18 L 86 104 L 122 104 L 102 176 L 176 78 L 138 78 L 162 18 Z");
    ctx.save();
    ctx.translate(7, 7);
    ctx.fillStyle = "rgba(20,16,60,0.85)";
    ctx.fill(bolt);
    ctx.restore();
    ctx.fillStyle = "#ffe14a";
    ctx.fill(bolt);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#7a1830";
    ctx.stroke(bolt);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(140, 30);
    ctx.lineTo(102, 92);
    ctx.stroke();
    // Spray dots and two little stars round it.
    ctx.fillStyle = "#ff3d7f";
    for (const [x, y, r] of [[38, 40, 7], [222, 150, 6], [214, 36, 5], [46, 150, 5]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    star(ctx, 206, 92, 13, "#ffffff");
    star(ctx, 56, 96, 10, "#ffffff");
  });
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.38;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
