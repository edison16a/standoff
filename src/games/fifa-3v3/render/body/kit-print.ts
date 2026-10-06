import * as THREE from "three";
import type { Kit } from "../../looks";
import { ATLAS, SEAT_SHARE, type Region } from "./kit-layout";
import { printBack, printCrest, printMaker, printShortsNumber, printSponsor } from "./kit-marks";

/**
 * A player's whole kit printed on one canvas (kit-layout.ts): the shirt
 * with its trim, panels, sponsor, crest and the name and number on the
 * back; the sleeves with their cuffs and a patch; the shorts with a
 * stripe down each side and the number; the socks with their bands.
 * The shirt's print wraps from the player's left side: a quarter of the
 * way along is the middle of the back, three quarters is the chest.
 */

export interface KitPrint {
  kit: Kit;
  name: string;
  /** 0 prints nothing: a plain shirt, like the referee's. */
  number: number;
  keeper: boolean;
}

/** Metres round the chest and from hem to collar, for a 1.8 m player: what the shirt's print stretches over. */
const ROUND = 0.92;
const TALL = 0.735;

const rows = (r: Region, h: number) => ({ top: (1 - r.v1) * h, bottom: (1 - r.v0) * h });

export function kitTexture(p: KitPrint, fine: boolean): THREE.CanvasTexture {
  const W = fine ? 1024 : 512;
  const H = W / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  shirt(ctx, p, W, H);
  sleeves(ctx, p, W, H);
  shorts(ctx, p, W, H);
  socks(ctx, p.kit, W, H);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = fine ? 8 : 2;
  return texture;
}

function shirt(ctx: CanvasRenderingContext2D, p: KitPrint, W: number, H: number): void {
  const { kit } = p;
  const { top, bottom } = rows(ATLAS.shirt, H);
  const h = bottom - top;
  // Pixels per metre across the body and up it, and the squash that keeps print square on the body.
  const px = W / ROUND;
  const squash = h / TALL / px;
  const rowAt = (y: number) => top + h * (1 - (y - 0.8) / TALL);
  ctx.fillStyle = kit.shirt;
  ctx.fillRect(0, top, W, h);
  if (kit.stripes) {
    ctx.fillStyle = kit.stripes;
    for (let i = 0; i < 9; i++) {
      const centre = ((0.75 + i / 9) % 1) * W;
      ctx.fillRect(centre - W / 44, top, W / 22, h);
      if (centre + W / 44 > W) ctx.fillRect(centre - W / 44 - W, top, W / 22, h);
    }
  }
  // A sublimated pattern of fine diagonal pinstripes, and a keeper's bolder chevrons.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, h);
  ctx.clip();
  ctx.globalAlpha = p.keeper ? 0.16 : 0.07;
  ctx.strokeStyle = p.keeper ? "#000000" : kit.trim;
  ctx.lineWidth = p.keeper ? W / 90 : W / 400;
  const gap = p.keeper ? W / 26 : W / 60;
  for (let x = -h; x < W + h; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x + h * (p.keeper ? 0.5 : 1), top);
    if (p.keeper) ctx.lineTo(x + h, bottom);
    ctx.stroke();
  }
  ctx.restore();
  // Side panels in the trim from the armpits down, and the collar's band.
  ctx.fillStyle = kit.trim;
  for (const u of [0, 0.5, 1]) ctx.fillRect(u * W - 0.018 * px, rowAt(1.3), 0.036 * px, rowAt(0.8) - rowAt(1.3));
  ctx.fillRect(0, top, W, h * 0.03);
  ctx.fillRect(0, bottom - h * 0.012, W, h * 0.012);
  // A soft shade toward the sides lifts the chest and back.
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  for (const [at, alpha] of [[0, 0.16], [0.25, 0], [0.5, 0.16], [0.75, 0], [1, 0.16]] as const) shade.addColorStop(at, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, top, W, h);
  if (p.number <= 0) return;
  printBack(ctx, kit, p.name, p.number, 0.25 * W, rowAt(1.41), rowAt(1.2), px, squash);
  printCrest(ctx, kit, 0.825 * W, rowAt(1.34), px, squash);
  printMaker(ctx, kit, 0.675 * W, rowAt(1.345), px, squash);
  if (!p.keeper) printSponsor(ctx, kit, 0.75 * W, rowAt(1.2), px, squash);
}

function sleeves(ctx: CanvasRenderingContext2D, p: KitPrint, W: number, H: number): void {
  const { top, bottom } = rows(ATLAS.sleeve, H);
  const h = bottom - top;
  ctx.fillStyle = p.kit.shirt;
  ctx.fillRect(0, top, W, h);
  ctx.fillStyle = p.kit.trim;
  // The cuff band at the hem, and a thin line just above it.
  ctx.fillRect(0, bottom - h * 0.1, W, h * 0.1);
  ctx.fillRect(0, bottom - h * 0.19, W, h * 0.035);
  if (p.keeper) {
    // Padded elbows, a shade darker.
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0.3 * W, top + h * 0.42, 0.4 * W, h * 0.16);
    return;
  }
  if (p.number <= 0) return;
  // A league patch on the outside of each sleeve.
  const r = h * 0.14;
  ctx.fillStyle = "#f2f4f7";
  ctx.beginPath();
  ctx.ellipse(0.5 * W, top + h * 0.35, r * 2.2, r * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.kit.trim === "#ffffff" ? p.kit.shirt : p.kit.trim;
  ctx.beginPath();
  ctx.ellipse(0.5 * W, top + h * 0.35, r * 1.2, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function shorts(ctx: CanvasRenderingContext2D, p: KitPrint, W: number, H: number): void {
  const { kit } = p;
  const { top, bottom } = rows(ATLAS.shorts, H);
  const h = bottom - top;
  ctx.fillStyle = kit.shorts;
  ctx.fillRect(0, top, W, h);
  const legsTop = top + h * SEAT_SHARE;
  const legsH = bottom - legsTop;
  ctx.fillStyle = kit.trim === kit.shorts ? kit.shirt : kit.trim;
  // A stripe down the outside of each leg, half way round its own half, and the hem band.
  for (const x of [0.25, 0.75]) ctx.fillRect(x * W - W / 90, legsTop, W / 45, legsH);
  ctx.fillRect(0, bottom - legsH * 0.05, W, legsH * 0.05);
  if (p.number <= 0) return;
  // The number on the front of the left leg: the ink, unless it would vanish into the shorts.
  const ink = kit.ink.toLowerCase() === kit.shorts.toLowerCase() ? kit.shirt : kit.ink;
  const px = W / 1.1;
  printShortsNumber(ctx, { ...kit, ink }, p.number, 0.17 * W, legsTop + legsH * 0.7, px, (legsH / 0.39) / px);
}

function socks(ctx: CanvasRenderingContext2D, kit: Kit, W: number, H: number): void {
  const { top, bottom } = rows(ATLAS.socks, H);
  const h = bottom - top;
  ctx.fillStyle = kit.socks;
  ctx.fillRect(0, top, W, h);
  ctx.fillStyle = kit.trim;
  ctx.fillRect(0, top, W, h * 0.09);
  ctx.fillRect(0, top + h * 0.13, W, h * 0.03);
  // Knitted ribs down the leg.
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  for (let x = 0; x < W; x += W / 128) ctx.fillRect(x, top, W / 256, h);
}
