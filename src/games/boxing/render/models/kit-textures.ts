import * as THREE from "three";
import type { Look } from "./looks";

/**
 * The boxers' kit drawn on canvases: trunks with stripes down the sides,
 * a waistband with the boxer's nickname, and gloves with a trim band and
 * a star on the back of the hand. Sculpted parts put the front at the
 * middle of the texture and the sides at a quarter and three quarters.
 */

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function trunksTexture(look: Look): THREE.CanvasTexture {
  return paint(512, 256, (ctx) => {
    ctx.fillStyle = look.trunks;
    ctx.fillRect(0, 0, 512, 256);
    // Satin folds: soft vertical light and dark bands.
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * 512;
      const g = ctx.createLinearGradient(x, 0, x + 36, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, i % 2 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 36, 256);
    }
    for (const u of [0.25, 0.75]) {
      ctx.fillStyle = look.trim;
      ctx.fillRect(u * 512 - 16, 0, 32, 256);
      ctx.fillStyle = look.trunks;
      ctx.fillRect(u * 512 - 5, 0, 10, 256);
    }
    // A trim band at the hem, which is the bottom of the texture.
    ctx.fillStyle = look.trim;
    ctx.fillRect(0, 236, 512, 20);
  });
}

export function waistbandTexture(look: Look): THREE.CanvasTexture {
  return paint(1024, 128, (ctx) => {
    ctx.fillStyle = look.trim;
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = look.trunks;
    ctx.fillRect(0, 12, 1024, 10);
    ctx.fillRect(0, 106, 1024, 10);
    ctx.fillStyle = look.trunks;
    ctx.font = "900 64px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(look.nickname.toUpperCase(), 512, 66);
    ctx.font = "900 44px Impact, 'Arial Black', sans-serif";
    ctx.fillText((look.name.split(" ")[1] ?? look.name).toUpperCase(), 0, 66);
    ctx.fillText((look.name.split(" ")[1] ?? look.name).toUpperCase(), 1024, 66);
  });
}

export function gloveTexture(look: Look): THREE.CanvasTexture {
  return paint(512, 512, (ctx) => {
    ctx.fillStyle = look.gloves;
    ctx.fillRect(0, 0, 512, 512);
    // Leather creases toward the knuckles.
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 330 + i * 26);
      ctx.bezierCurveTo(170, 316 + i * 26, 340, 344 + i * 26, 512, 330 + i * 26);
      ctx.stroke();
    }
    // The cuff: a trim band with piping either side.
    ctx.fillStyle = look.gloveTrim;
    ctx.fillRect(0, 60, 512, 70);
    ctx.fillStyle = look.gloves;
    ctx.fillRect(0, 84, 512, 22);
    // Stitching round the back of the hand.
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(256, 290, 70, 120, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    star(ctx, 256, 280, 44, look.gloveTrim);
  });
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius * 1.4);
  }
  ctx.closePath();
  ctx.fill();
}
