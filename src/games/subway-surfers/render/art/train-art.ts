import type * as THREE from "three";
import { painted } from "../textures";
import { DISPLAY_FONT, drawGraffiti } from "./graffiti";

export interface Livery {
  body: number;
  stripe: number;
  trim: number;
  /** The glowing strips along the car. */
  neon: number;
}

/** Night paint jobs: deep bodies that make the neon trims and lit windows sing. */
export const LIVERIES: readonly Livery[] = [
  { body: 0x1f2a5a, stripe: 0x21f3ff, trim: 0x10142a, neon: 0x21f3ff },
  { body: 0x5a1a4a, stripe: 0xff2bd6, trim: 0x220a1c, neon: 0xff2bd6 },
  { body: 0x2a2a38, stripe: 0xffd21f, trim: 0x14141c, neon: 0xffb020 },
  { body: 0x163f3a, stripe: 0x9dff2b, trim: 0x0a1c1a, neon: 0x9dff2b },
  { body: 0xc9ccd8, stripe: 0x8a5bff, trim: 0x2a2640, neon: 0x8a5bff },
  { body: 0x3a1f66, stripe: 0x21f3ff, trim: 0x160c2a, neon: 0xff2bd6 },
  { body: 0x6a1c1c, stripe: 0xff8a1f, trim: 0x240a0a, neon: 0xff5a1f },
  { body: 0x0f4a5a, stripe: 0xffffff, trim: 0x0a1f26, neon: 0x21f3ff },
];

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Where the doors and the windows between them sit along a car side, as shares of its length. */
const DOORS = [0.17, 0.5, 0.83];
const SPANS = [[0.025, 0.115], [0.225, 0.445], [0.555, 0.775], [0.885, 0.975]] as const;
const DOOR_W = 88;

/**
 * One side of a car: the paint, a stripe, doors, a row of lit windows
 * and a fleet number. Some cars carry a graffiti piece too.
 */
export function carSideTexture(livery: number, graffiti: number | null): THREE.Texture {
  const l = LIVERIES[livery % LIVERIES.length]!;
  return painted(`car-${livery}-${graffiti}`, 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(l.body);
    ctx.fillRect(0, 0, w, h);
    // Shading from the roof down, so the flat side reads as rounded.
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(255,255,255,0.22)");
    shade.addColorStop(0.5, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hex(l.stripe);
    ctx.fillRect(0, h * 0.7, w, h * 0.06);
    ctx.fillStyle = hex(l.trim);
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    for (const d of DOORS) door(ctx, d * w, h, l);
    windows(ctx, w, h, "#ffe2a8");
    ctx.font = `900 ${h * 0.09}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(String(4000 + livery * 137 + (graffiti ?? 0) * 11), w * 0.03, h * 0.86);
    if (graffiti !== null) drawGraffiti(ctx, graffiti, w * 0.2, h * 0.2, w * 0.6, h * 0.62);
  });
}

/** What glows on a car side at night: the windows and the stripe. The same for every car, so one texture serves all. */
export function carGlowTexture(): THREE.Texture {
  return painted("car-glow", 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h * 0.7, w, h * 0.06);
    windows(ctx, w, h, "#ffffff");
  });
}

function windows(ctx: CanvasRenderingContext2D, w: number, h: number, light: string): void {
  // Windows fill the panels between the doors, two to a long panel.
  for (const [a, b] of SPANS) {
    const count = b - a > 0.15 ? 2 : 1;
    const width = (b - a - 0.015 * (count - 1)) / count;
    for (let i = 0; i < count; i++) window_(ctx, (a + i * (width + 0.015)) * w, h * 0.24, width * w, h * 0.34, light);
  }
  for (const d of DOORS) {
    const cx = d * w;
    window_(ctx, cx - DOOR_W / 2 + 8, h * 0.24, DOOR_W / 2 - 12, h * 0.3, light);
    window_(ctx, cx + 4, h * 0.24, DOOR_W / 2 - 12, h * 0.3, light);
  }
}

function door(ctx: CanvasRenderingContext2D, cx: number, h: number, l: Livery): void {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(cx - DOOR_W / 2 - 3, h * 0.16, DOOR_W + 6, h * 0.74);
  ctx.fillStyle = hex(l.body);
  ctx.fillRect(cx - DOOR_W / 2, h * 0.17, DOOR_W, h * 0.72);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(cx - 1.5, h * 0.17, 3, h * 0.72);
  ctx.fillStyle = hex(l.stripe);
  ctx.fillRect(cx - DOOR_W / 2, h * 0.17, DOOR_W, 5);
}

/** A lit window: warm light inside, a darker band where the seats are. */
function window_(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: string): void {
  ctx.fillStyle = light;
  roundRect(ctx, x, y, w, h, 9);
  if (light !== "#ffffff") {
    ctx.fillStyle = "rgba(60,30,80,0.35)";
    ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  }
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
    ctx.fillRect(0, h * 0.7, w, h * 0.06);
    ctx.fillStyle = hex(l.trim);
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    cabLights(ctx, w, h, false);
    ctx.fillStyle = "#1a1d26";
    roundRect(ctx, w * 0.4, h * 0.8, w * 0.2, h * 0.08, 4);
  });
}

/** What glows on a cab: the destination sign and the windscreen. */
export function cabGlowTexture(): THREE.Texture {
  return painted("cab-glow", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    cabLights(ctx, w, h, true);
  });
}

function cabLights(ctx: CanvasRenderingContext2D, w: number, h: number, glow: boolean): void {
  ctx.fillStyle = glow ? "#000000" : "#11151f";
  roundRect(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.13, 8);
  ctx.fillStyle = "#ffb627";
  ctx.font = `900 ${h * 0.09}px ${DISPLAY_FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("EXPRESS", w / 2, h * 0.2);
  ctx.fillStyle = glow ? "#3a3f60" : "#1a2030";
  roundRect(ctx, w * 0.09, h * 0.28, w * 0.82, h * 0.33, 12);
}
