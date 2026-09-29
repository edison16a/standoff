import type * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";
import { DISPLAY_FONT, drawGraffiti, drawTag } from "./graffiti";
import { roundRect } from "./train-art";

/** A run of wooden fence boards in warm browns, nailed to rails, with a tag or two sprayed across. */
export function woodFenceTexture(seed: number): THREE.Texture {
  return painted(`wood-fence-${seed}`, 1024, 256, (ctx, w, h) => {
    const rng = new Rng(seed * 13 + 3);
    const board = 32;
    for (let x = 0; x < w; x += board) {
      const tone = rng.int(-14, 14);
      ctx.fillStyle = `rgb(${170 + tone},${112 + tone},${66 + tone})`;
      ctx.fillRect(x, 0, board - 3, h);
      // Grain, a darker edge and a pointed top on each board.
      ctx.fillStyle = "rgba(90,50,20,0.25)";
      for (let g = 0; g < 3; g++) ctx.fillRect(x + rng.range(4, board - 8), rng.range(0, h * 0.6), 2, rng.range(40, 120));
      ctx.fillStyle = "rgba(60,30,10,0.55)";
      ctx.fillRect(x + board - 3, 0, 3, h);
      ctx.clearRect(x, 0, board / 2 - 1, 8 - (x / board) % 2);
    }
    ctx.fillStyle = "#6b4426";
    for (const y of [0.22, 0.78]) ctx.fillRect(0, h * y, w, 12);
    ctx.fillStyle = "#3b2a1c";
    for (let x = 10; x < w; x += board) for (const y of [0.22, 0.78]) ctx.fillRect(x, h * y + 4, 4, 4);
    drawGraffiti(ctx, seed * 5 + 1, w * (0.08 + (seed % 3) * 0.2), h * 0.22, w * 0.38, h * 0.62);
    for (let i = 0; i < 3; i++) drawTag(ctx, seed * 7 + i, rng.range(0, w), rng.range(h * 0.3, h * 0.8));
  });
}

/** Corrugated metal sheets in one faded paint, rivets along the joins, with tags. */
export function corrugatedTexture(color: string, seed: number): THREE.Texture {
  return painted(`corrugated-${color}-${seed}`, 1024, 256, (ctx, w, h) => {
    const rng = new Rng(seed * 29 + 11);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 14) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x, 0, 4, h);
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(x + 7, 0, 5, h);
    }
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (let x = 0; x < w; x += w / 4) ctx.fillRect(x, 0, 3, h);
    ctx.fillStyle = "rgba(120,70,30,0.25)";
    for (let i = 0; i < 12; i++) ctx.fillRect(rng.range(0, w), h - rng.range(10, 60), rng.range(6, 30), rng.range(10, 60));
    drawGraffiti(ctx, seed * 3 + 2, w * (0.5 - (seed % 2) * 0.4), h * 0.2, w * 0.4, h * 0.6);
    for (let i = 0; i < 2; i++) drawTag(ctx, seed * 11 + i, rng.range(0, w), rng.range(h * 0.3, h * 0.8));
  });
}

const ADVERTS = [
  { word: "SUPER KICKS", sub: "JUMP HIGHER", bg: ["#ff4d6d", "#ffb347"] },
  { word: "FIZZ COLA", sub: "ICE COLD", bg: ["#e8312a", "#ff8a5a"] },
  { word: "SURF CITY", sub: "SUMMER FEST", bg: ["#1f8fe0", "#3fd0ff"] },
  { word: "PIZZA PETE", sub: "HOT & FAST", bg: ["#ffb81c", "#ffe066"] },
] as const;

/** A bright poster for platform walls and billboards: a big word on a sunny gradient. */
export function posterTexture(i: number): THREE.Texture {
  const ad = ADVERTS[i % ADVERTS.length]!;
  return painted(`poster-${i % ADVERTS.length}`, 512, 256, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, ad.bg[0]);
    bg.addColorStop(1, ad.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let r = 0; r < 6; r++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.8, h * 0.5);
      ctx.arc(w * 0.8, h * 0.5, w, (r / 6) * Math.PI * 2, (r / 6 + 1 / 12) * Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `900 ${h * 0.26}px ${DISPLAY_FONT}`;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#1f2138";
    ctx.strokeText(ad.word, w * 0.06, h * 0.42);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(ad.word, w * 0.06, h * 0.42);
    ctx.font = `900 ${h * 0.12}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "#1f2138";
    ctx.fillText(ad.sub, w * 0.07, h * 0.72);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

/** The shops along the street, each name board a row of one texture. */
export const SHOPS = [
  ["PIZZA", "#e8312a"],
  ["DONUTS", "#ff5fa2"],
  ["COMICS", "#1f6fd6"],
  ["BIKES", "#16a34a"],
  ["TOYS", "#8a4be8"],
  ["CAFE", "#c2702a"],
] as const;

/** Every shop's name board, white letters on the shop's colour, stacked down one texture. */
export function shopSignAtlas(): THREE.Texture {
  const row = 96;
  return painted("shop-signs", 512, row * SHOPS.length, (ctx, w) => {
    SHOPS.forEach(([word, color], i) => {
      const y = i * row;
      ctx.fillStyle = color;
      ctx.fillRect(0, y, w, row);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(0, y, w, row * 0.35);
      ctx.font = `900 ${row * 0.6}px ${DISPLAY_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1f2138";
      ctx.strokeText(word, w / 2, y + row / 2 + 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(word, w / 2, y + row / 2 + 3);
    });
  });
}

/** A shop window: a door, glass catching the sky and something on the shelves. */
export function shopFrontTexture(): THREE.Texture {
  return painted("shop-front", 512, 256, (ctx, w, h) => {
    const rng = new Rng(4);
    ctx.fillStyle = "#e9e4da";
    ctx.fillRect(0, 0, w, h);
    const glass = ctx.createLinearGradient(0, 0, w * 0.3, h);
    glass.addColorStop(0, "#bfe6ff");
    glass.addColorStop(1, "#4f8fc8");
    ctx.fillStyle = glass;
    ctx.fillRect(w * 0.05, h * 0.1, w * 0.6, h * 0.82);
    ctx.fillRect(w * 0.72, h * 0.1, w * 0.22, h * 0.9);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ["#ff6b6b", "#ffd166", "#06d6a0", "#ef8354"][rng.int(0, 3)]!;
      roundRect(ctx, w * (0.08 + i * 0.09), h * 0.62, w * 0.06, h * 0.22, 6);
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.1);
    ctx.lineTo(w * 0.22, h * 0.1);
    ctx.lineTo(w * 0.12, h * 0.92);
    ctx.lineTo(w * 0.05, h * 0.92);
    ctx.fill();
    ctx.fillStyle = "#1f2138";
    ctx.fillRect(w * 0.9, h * 0.5, 6, 18);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#4a4e5c";
    ctx.strokeRect(w * 0.05, h * 0.1, w * 0.6, h * 0.82);
    ctx.strokeRect(w * 0.72, h * 0.1, w * 0.22, h * 0.9);
  });
}
