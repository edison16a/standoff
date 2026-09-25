import type * as THREE from "three";
import { painted } from "../textures";
import { DISPLAY_FONT, drawGraffiti } from "./graffiti";

export interface Livery {
  body: number;
  stripe: number;
  trim: number;
}

/** Bright paint jobs, as a commuter line would never dare. */
export const LIVERIES: readonly Livery[] = [
  { body: 0xffc21a, stripe: 0x1f5fd6, trim: 0x2c3345 },
  { body: 0xe8412f, stripe: 0xffffff, trim: 0x2c2c38 },
  { body: 0x2f7fe0, stripe: 0xff9a1f, trim: 0x1d2640 },
  { body: 0x2cb865, stripe: 0xffe14d, trim: 0x1c3326 },
  { body: 0xd9dee6, stripe: 0xe8412f, trim: 0x3a4150 },
  { body: 0xff7a1a, stripe: 0x2c3345, trim: 0x2c3345 },
  { body: 0x8e4de8, stripe: 0xffd21f, trim: 0x2a1d45 },
  { body: 0x1fc2c2, stripe: 0xffffff, trim: 0x13334a },
];

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/**
 * One side of a car: the paint, a stripe, doors, a row of windows with
 * reflections and a fleet number. Some cars carry a graffiti piece too.
 */
export function carSideTexture(livery: number, graffiti: number | null): THREE.Texture {
  const l = LIVERIES[livery % LIVERIES.length]!;
  return painted(`car-${livery}-${graffiti}`, 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(l.body);
    ctx.fillRect(0, 0, w, h);
    // Shading from the roof down, so the flat side reads as rounded.
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(255,255,255,0.28)");
    shade.addColorStop(0.5, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hex(l.stripe);
    ctx.fillRect(0, h * 0.7, w, h * 0.09);
    ctx.fillRect(0, h * 0.12, w, h * 0.035);
    ctx.fillStyle = hex(l.trim);
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    const doors = [0.17, 0.5, 0.83];
    for (const d of doors) door(ctx, d * w, h, l);
    // Windows fill the panels between the doors, two to a long panel.
    const spans = [[0.025, 0.115], [0.225, 0.445], [0.555, 0.775], [0.885, 0.975]] as const;
    for (const [a, b] of spans) {
      const count = b - a > 0.15 ? 2 : 1;
      const width = (b - a - 0.015 * (count - 1)) / count;
      for (let i = 0; i < count; i++) window_(ctx, (a + i * (width + 0.015)) * w, h * 0.24, width * w, h * 0.34);
    }
    ctx.font = `900 ${h * 0.09}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(String(4000 + livery * 137 + (graffiti ?? 0) * 11), w * 0.03, h * 0.86);
    if (graffiti !== null) drawGraffiti(ctx, graffiti, w * 0.2, h * 0.2, w * 0.6, h * 0.62);
  });
}

function door(ctx: CanvasRenderingContext2D, cx: number, h: number, l: Livery): void {
  const dw = 88;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(cx - dw / 2 - 3, h * 0.16, dw + 6, h * 0.74);
  ctx.fillStyle = hex(l.body);
  ctx.fillRect(cx - dw / 2, h * 0.17, dw, h * 0.72);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(cx - 1.5, h * 0.17, 3, h * 0.72);
  window_(ctx, cx - dw / 2 + 8, h * 0.24, dw / 2 - 12, h * 0.3);
  window_(ctx, cx + 4, h * 0.24, dw / 2 - 12, h * 0.3);
  ctx.fillStyle = "#ffd21f";
  ctx.fillRect(cx - dw / 2, h * 0.17, dw, 5);
}

function window_(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#e9edf3";
  roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 12);
  const glass = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  glass.addColorStop(0, "#5d7fa8");
  glass.addColorStop(0.55, "#1f3350");
  glass.addColorStop(1, "#142238");
  ctx.fillStyle = glass;
  roundRect(ctx, x, y, w, h, 9);
  // A streak of reflected sky across the glass.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 9);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y);
  ctx.lineTo(x + w * 0.45, y);
  ctx.lineTo(x + w * 0.2, y + h);
  ctx.lineTo(x - w * 0.05, y + h);
  ctx.fill();
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** The cab end: a wide windscreen, a lit destination sign and the lamps. */
export function cabTexture(livery: number): THREE.Texture {
  const l = LIVERIES[livery % LIVERIES.length]!;
  return painted(`cab-${livery}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(l.body);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hex(l.stripe);
    ctx.fillRect(0, h * 0.7, w, h * 0.09);
    ctx.fillStyle = hex(l.trim);
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    ctx.fillStyle = "#11151f";
    roundRect(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.13, 8);
    ctx.fillStyle = "#ffb627";
    ctx.font = `900 ${h * 0.09}px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("EXPRESS", w / 2, h * 0.2);
    const glass = ctx.createLinearGradient(0, h * 0.27, 0, h * 0.6);
    glass.addColorStop(0, "#6f93bd");
    glass.addColorStop(1, "#16263d");
    ctx.fillStyle = "#e9edf3";
    roundRect(ctx, w * 0.06, h * 0.26, w * 0.88, h * 0.37, 16);
    ctx.fillStyle = glass;
    roundRect(ctx, w * 0.09, h * 0.28, w * 0.82, h * 0.33, 12);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(w * 0.2, h * 0.28, w * 0.1, h * 0.33);
    ctx.fillStyle = "#1a1d26";
    roundRect(ctx, w * 0.4, h * 0.8, w * 0.2, h * 0.08, 4);
  });
}
