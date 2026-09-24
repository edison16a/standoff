import type * as THREE from "three";
import { blotches, canvasTexture, cracks, speckle } from "./textures";

/** The painted surfaces of the world, the zombies and the guns. */

export const asphalt = (): THREE.Texture =>
  canvasTexture("asphalt", 512, (ctx, size, rand) => {
    speckle(ctx, size, rand, [46, 47, 50], 22);
    blotches(ctx, size, rand, "rgba(10,10,12,0.5)", 14, 70);
    cracks(ctx, size, rand, "rgba(12,12,14,0.9)", 18);
    blotches(ctx, size, rand, "rgba(90,90,95,0.18)", 10, 40);
  });

export const concrete = (): THREE.Texture =>
  canvasTexture("concrete", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [112, 112, 108], 26);
    blotches(ctx, size, rand, "rgba(40,38,34,0.35)", 12, 50);
    cracks(ctx, size, rand, "rgba(40,40,40,0.6)", 6);
    ctx.fillStyle = "rgba(30,30,30,0.5)";
    ctx.fillRect(0, 0, size, 2);
    ctx.fillRect(0, 0, 2, size);
  });

export const grass = (): THREE.Texture =>
  canvasTexture("grass", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [38, 52, 30], 26);
    blotches(ctx, size, rand, "rgba(60,48,30,0.45)", 12, 40);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${60 + rand() * 30},${80 + rand() * 40},${40 + rand() * 20},0.6)`;
      ctx.fillRect(rand() * size, rand() * size, 1, 3 + rand() * 4);
    }
  });

/** Brick or concrete with a grid of windows. Windows are dark, the lit ones come from the glow map. */
export function facade(style: "brick" | "concrete" | "stone"): THREE.Texture {
  const base: Record<typeof style, [number, number, number]> = { brick: [92, 52, 42], concrete: [96, 98, 100], stone: [110, 102, 88] };
  return canvasTexture(`facade-${style}`, 512, (ctx, size, rand) => {
    speckle(ctx, size, rand, base[style], 20, 4);
    if (style === "brick") {
      ctx.fillStyle = "rgba(30,20,18,0.5)";
      for (let y = 0; y < size; y += 8) ctx.fillRect(0, y, size, 1);
      for (let y = 0; y < size; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < size; x += 16) ctx.fillRect(x, y, 1, 8);
    }
    blotches(ctx, size, rand, "rgba(15,15,15,0.35)", 10, 90);
    windows(ctx, size, (x, y, w, h) => {
      ctx.fillStyle = "#15171c";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(90,100,120,0.25)";
      ctx.fillRect(x + 2, y + 2, w / 2 - 3, h - 4);
      ctx.fillStyle = "#2b2c30";
      ctx.fillRect(x - 3, y + h, w + 6, 5);
      ctx.fillRect(x + w / 2 - 1, y, 2, h);
    });
  });
}

/** Which windows glow. Most are dark: the city has been dead a while. */
export function facadeGlow(): THREE.Texture {
  return canvasTexture("facade-glow", 512, (ctx, size, rand) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    windows(ctx, size, (x, y, w, h) => {
      if (rand() > 0.16) return;
      const warm = rand() < 0.8;
      ctx.fillStyle = warm ? "#ffcf7a" : "#9fd0ff";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + w * 0.1, y + h * 0.55, w * 0.8, h * 0.45);
    });
  });
}

/** Four by four windows per tile. One tile covers 12 metres, so 3 m storeys. */
function windows(ctx: CanvasRenderingContext2D, size: number, draw: (x: number, y: number, w: number, h: number) => void): void {
  const cell = size / 4;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) draw(col * cell + cell * 0.28, row * cell + cell * 0.22, cell * 0.44, cell * 0.5);
}

export const skin = (): THREE.Texture =>
  canvasTexture("skin", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [122, 128, 110], 34);
    blotches(ctx, size, rand, "rgba(70,40,60,0.45)", 16, 36);
    blotches(ctx, size, rand, "rgba(160,170,120,0.35)", 10, 30);
    blotches(ctx, size, rand, "rgba(90,10,10,0.5)", 6, 18);
    cracks(ctx, size, rand, "rgba(60,40,70,0.55)", 14);
  });

export const cloth = (): THREE.Texture =>
  canvasTexture("cloth", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [200, 200, 200], 40);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < size; i += 3) ctx.fillRect(0, i, size, 1);
    blotches(ctx, size, rand, "rgba(60,40,20,0.5)", 14, 40);
    blotches(ctx, size, rand, "rgba(110,10,10,0.55)", 7, 34);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    for (let i = 0; i < 6; i++) ctx.fillRect(rand() * size, rand() * size, 4 + rand() * 10, 2 + rand() * 4);
  });

export const wood = (): THREE.Texture =>
  canvasTexture("wood", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [120, 66, 34], 16);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = `rgba(${50 + rand() * 30},${24 + rand() * 12},10,${0.25 + rand() * 0.35})`;
      ctx.lineWidth = 0.5 + rand() * 1.5;
      ctx.beginPath();
      const y = rand() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 12, size * 0.6, y + (rand() - 0.5) * 12, size, y + (rand() - 0.5) * 6);
      ctx.stroke();
    }
  });

/** Fine scratches, for the roughness of worn gun metal. */
export const scuffs = (): THREE.Texture =>
  canvasTexture("scuffs", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [150, 150, 150], 50);
    ctx.strokeStyle = "rgba(60,60,60,0.7)";
    for (let i = 0; i < 60; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 40, y + (rand() - 0.5) * 8);
      ctx.stroke();
    }
  }, { color: false });

export const corrugated = (): THREE.Texture =>
  canvasTexture("corrugated", 256, (ctx, size, rand) => {
    speckle(ctx, size, rand, [200, 200, 200], 30);
    for (let x = 0; x < size; x += 8) {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x, 0, 3, size);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 4, 0, 2, size);
    }
    blotches(ctx, size, rand, "rgba(90,50,20,0.5)", 10, 40);
  });
