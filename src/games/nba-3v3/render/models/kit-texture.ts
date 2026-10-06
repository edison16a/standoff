import * as THREE from "three";
import type { Team } from "../../roster";

/**
 * The kit's print: one texture for the jersey and the shorts. The top
 * band wraps round the torso starting under the left arm, so the back
 * is a quarter of the way across and the front three quarters; the
 * armholes and the neck are cut out of it (transparent) and edged with
 * piping. The bottom band is the shorts: waistband, side stripes, hem.
 */

/** Drawn in a 1024 unit square, onto a smaller canvas: sharp enough for any shot the cameras take, at a fraction of the memory. */
const SIZE = 1024;
const PIXELS = 640;
/** Where each garment sits on the texture, in v (0 at the bottom). */
export const ATLAS = {
  jersey: [0.42, 1] as const,
  shorts: [0, 0.38] as const,
};

/** Canvas y for a v on the texture. */
const Y = (v: number) => (1 - v) * SIZE;
/** Canvas y for a v within the jersey band. */
const JY = (v: number) => Y(ATLAS.jersey[0] + (ATLAS.jersey[1] - ATLAS.jersey[0]) * v);

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: string, edge: string, width = 0): void {
  ctx.font = `italic 900 ${size}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const measured = ctx.measureText(s).width;
  ctx.save();
  ctx.translate(x, y);
  if (width && measured > width) ctx.scale(width / measured, 1);
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = edge;
  ctx.strokeText(s, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

/** Draws a shape at u and again one texture width over, so a shape on the wrap seam shows on both sides of it. */
function wrapped(draw: (x: number) => void, u: number): void {
  for (const k of [-1, 0, 1]) draw((u + k) * SIZE);
}

/** One closed ellipse as its own subpath, so separate holes are never joined by a stray edge. */
function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** The holes in the jersey, in canvas space, for cutting and for piping round. */
function holes(ctx: CanvasRenderingContext2D, referee: boolean): void {
  ctx.beginPath();
  if (!referee) {
    for (const u of [0, 0.5]) wrapped((x) => oval(ctx, x, JY(0.745), 0.085 * SIZE, (JY(0.585) - JY(0.905)) / 2), u);
  }
  // A scooped neck in front, shallower behind.
  oval(ctx, 0.75 * SIZE, JY(1.0), 0.12 * SIZE, JY(0.885) - JY(1.0));
  oval(ctx, 0.25 * SIZE, JY(1.0), 0.09 * SIZE, JY(0.955) - JY(1.0));
}

function fabricGrain(ctx: CanvasRenderingContext2D, top: number, bottom: number): void {
  // Faint vertical ribs, the way a knit catches the light.
  ctx.globalAlpha = 0.05;
  for (let x = 0; x < SIZE; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? "#ffffff" : "#000000";
    ctx.fillRect(x, top, 2, bottom - top);
  }
  ctx.globalAlpha = 1;
}

export interface KitPrint {
  team: Team;
  number: number;
  name: string;
  /** Black and white stripes, no numbers, and dark trousers, for the referee. */
  referee?: boolean;
}

export function kitTexture(p: KitPrint): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = PIXELS;
  canvas.height = PIXELS;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(PIXELS / SIZE, PIXELS / SIZE);
  const { team } = p;
  const top = Y(ATLAS.jersey[1]);
  const bottom = Y(ATLAS.jersey[0]);

  // The jersey: a soft fall of light down the body, darker side panels, and the print.
  const body = ctx.createLinearGradient(0, top, 0, bottom);
  body.addColorStop(0, p.referee ? "#f2f2ef" : team.color);
  body.addColorStop(1, p.referee ? "#d9d9d6" : new THREE.Color(team.color).lerp(new THREE.Color(team.dark), 0.3).getStyle());
  ctx.fillStyle = body;
  ctx.fillRect(0, top, SIZE, bottom - top + 4);
  if (p.referee) {
    ctx.fillStyle = "#141414";
    for (let x = 0; x < SIZE; x += 32) ctx.fillRect(x, top, 16, bottom - top + 4);
  } else {
    ctx.fillStyle = team.dark;
    for (const u of [0, 0.5]) wrapped((x) => ctx.fillRect(x - 46, JY(0.0), 92, JY(0.58) - JY(0.0)), u);
    ctx.fillStyle = team.trim;
    for (const u of [0, 0.5]) wrapped((x) => { ctx.fillRect(x - 50, JY(0.0), 5, JY(0.6) - JY(0.0)); ctx.fillRect(x + 45, JY(0.0), 5, JY(0.6) - JY(0.0)); }, u);
    text(ctx, team.name.toUpperCase(), 0.75 * SIZE, JY(0.665), 50, team.trim, team.dark, 190);
    text(ctx, String(p.number), 0.75 * SIZE, JY(0.45), 150, "#ffffff", team.dark);
    text(ctx, p.name.toUpperCase(), 0.25 * SIZE, JY(0.79), 44, "#ffffff", team.dark, 210);
    text(ctx, String(p.number), 0.25 * SIZE, JY(0.53), 168, "#ffffff", team.dark);
  }
  fabricGrain(ctx, top, bottom);
  // Piping round every opening, then the openings cut away.
  ctx.save();
  holes(ctx, !!p.referee);
  ctx.lineWidth = 22;
  ctx.strokeStyle = p.referee ? "#141414" : team.trim;
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = p.referee ? "#141414" : team.dark;
  ctx.stroke();
  ctx.globalCompositeOperation = "destination-out";
  holes(ctx, !!p.referee);
  ctx.fill();
  ctx.restore();

  // The shorts: team colour, or dark trousers for the referee.
  const shortsTop = Y(ATLAS.shorts[1]);
  const shorts = ctx.createLinearGradient(0, shortsTop, 0, SIZE);
  shorts.addColorStop(0, p.referee ? "#1a1a1a" : team.color);
  shorts.addColorStop(1, p.referee ? "#111111" : new THREE.Color(team.color).lerp(new THREE.Color(team.dark), 0.4).getStyle());
  ctx.fillStyle = shorts;
  ctx.fillRect(0, shortsTop - 4, SIZE, SIZE - shortsTop + 4);
  if (!p.referee) {
    ctx.fillStyle = team.dark;
    ctx.fillRect(0, shortsTop - 4, SIZE, 26);
    // One stripe down the outside of each leg (the right leg's print is mirrored onto the left's).
    for (const u of [0.25]) {
      ctx.fillStyle = team.trim;
      ctx.fillRect(u * SIZE - 26, shortsTop, 52, SIZE - shortsTop);
      ctx.fillStyle = team.dark;
      ctx.fillRect(u * SIZE - 9, shortsTop, 18, SIZE - shortsTop);
    }
    ctx.fillStyle = team.trim;
    ctx.fillRect(0, SIZE - 16, SIZE, 16);
  }
  fabricGrain(ctx, shortsTop, SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
