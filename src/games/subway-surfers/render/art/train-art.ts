import type * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";
import { DISPLAY_FONT, drawGraffiti, drawTag } from "./graffiti";

export interface Livery {
  body: number;
  /** The lighter band along the top of the sides. */
  light: number;
  /** The dark skirt along the bottom. */
  skirt: number;
}

/** The four paint jobs of the yard's commuter trains: red, blue, yellow and green. */
export const LIVERIES: readonly Livery[] = [
  { body: 0xe23b2e, light: 0xf2745f, skirt: 0x8c1f18 },
  { body: 0x2e78d8, light: 0x62a4f0, skirt: 0x1a3f80 },
  { body: 0xffbf1a, light: 0xffdb6a, skirt: 0xa86f00 },
  { body: 0x34a84a, light: 0x72d17e, skirt: 0x1d6a2c },
];

/** Graffiti pieces per livery, stacked down one texture, so a whole train draws its sides in one call. */
export const PIECES = 3;

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Where the doors sit along a car side, as shares of its length. */
const DOORS = [0.17, 0.5, 0.83];
const DOOR_W = 84;

/** Glass that catches the sky: pale at the top, deep blue below, with a bright streak across. */
export function glass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 8): void {
  ctx.fillStyle = "#2a2d38";
  roundRect(ctx, x - 4, y - 4, w + 8, h + 8, r + 3);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#bfe8ff");
  g.addColorStop(0.55, "#5ea6e0");
  g.addColorStop(1, "#2f5f9c");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y);
  ctx.lineTo(x + w * 0.4, y);
  ctx.lineTo(x + w * 0.1, y + h);
  ctx.lineTo(x - w * 0.15, y + h);
  ctx.fill();
  ctx.restore();
}

/**
 * The sides of every car in one paint job: bold colour, a row of windows
 * between the doors, a white stripe and graffiti over the lower half, a
 * different piece in each of the stacked rows.
 */
export function carSideTexture(livery: number): THREE.Texture {
  const l = LIVERIES[livery % LIVERIES.length]!;
  return painted(`car-side-${livery % LIVERIES.length}`, 1024, 256 * PIECES, (ctx, w, full) => {
    const h = full / PIECES;
    for (let piece = 0; piece < PIECES; piece++) {
      ctx.save();
      ctx.translate(0, piece * h);
      side(ctx, w, h, l, livery * PIECES + piece);
      ctx.restore();
    }
  });
}

function side(ctx: CanvasRenderingContext2D, w: number, h: number, l: Livery, seed: number): void {
  const rng = new Rng(seed * 31 + 9);
  ctx.fillStyle = hex(l.body);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = hex(l.light);
  ctx.fillRect(0, 0, w, h * 0.1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, h * 0.54, w, h * 0.05);
  ctx.fillStyle = hex(l.skirt);
  ctx.fillRect(0, h * 0.9, w, h * 0.1);
  // Windows fill the spans between the doors, two to a long span.
  const spans = [[0.02, 0.12], [0.22, 0.45], [0.55, 0.78], [0.88, 0.98]] as const;
  for (const [a, b] of spans) {
    const count = b - a > 0.15 ? 2 : 1;
    const width = (b - a - 0.02 * (count - 1)) / count;
    for (let i = 0; i < count; i++) glass(ctx, (a + i * (width + 0.02)) * w, h * 0.17, width * w, h * 0.3);
  }
  for (const d of DOORS) {
    const cx = d * w;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(cx - DOOR_W / 2 - 3, h * 0.12, DOOR_W + 6, h * 0.8);
    ctx.fillStyle = hex(l.body);
    ctx.fillRect(cx - DOOR_W / 2, h * 0.13, DOOR_W, h * 0.78);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(cx - 1.5, h * 0.13, 3, h * 0.78);
    glass(ctx, cx - DOOR_W / 2 + 8, h * 0.18, DOOR_W / 2 - 14, h * 0.34, 6);
    glass(ctx, cx + 6, h * 0.18, DOOR_W / 2 - 14, h * 0.34, 6);
  }
  // The graffiti: two big pieces across the lower half, over doors and all, and tags round them.
  drawGraffiti(ctx, seed * 2, w * 0.03, h * 0.46, w * 0.46, h * 0.46);
  drawGraffiti(ctx, seed * 2 + 1, w * 0.51, h * 0.46, w * 0.46, h * 0.46);
  for (let i = 0; i < 4; i++) drawTag(ctx, seed * 5 + i, rng.range(0, w * 0.9), rng.range(h * 0.12, h * 0.5), rng.range(20, 30));
  ctx.font = `900 ${h * 0.07}px ${DISPLAY_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(String(2100 + seed * 17), w * 0.93, h * 0.08);
}

/** The cab end: a wide windscreen under a destination sign, a stripe, a number and a tag. */
export function cabTexture(livery: number): THREE.Texture {
  const l = LIVERIES[livery % LIVERIES.length]!;
  return painted(`cab-${livery % LIVERIES.length}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(l.body);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hex(l.light);
    ctx.fillRect(0, 0, w, h * 0.08);
    ctx.fillStyle = "#1f2138";
    roundRect(ctx, w * 0.2, h * 0.1, w * 0.6, h * 0.1, 6);
    ctx.fillStyle = "#ffc21a";
    ctx.font = `900 ${h * 0.07}px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CITY LOOP", w / 2, h * 0.155);
    glass(ctx, w * 0.1, h * 0.25, w * 0.8, h * 0.3, 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h * 0.62, w, h * 0.05);
    ctx.fillStyle = hex(l.skirt);
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, w * 0.4, h * 0.7, w * 0.2, h * 0.09, 5);
    ctx.fillStyle = "#1f2138";
    ctx.font = `900 ${h * 0.065}px ${DISPLAY_FONT}`;
    ctx.fillText(String(10 + livery * 7), w / 2, h * 0.748);
    drawTag(ctx, livery * 3 + 1, w * 0.62, h * 0.84, 18);
  });
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
