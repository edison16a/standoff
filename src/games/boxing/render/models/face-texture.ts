import * as THREE from "three";
import { seeded, type Random } from "../../engine/random";
import type { Look } from "./looks";

const SIZE = 1024;

/**
 * The head's skin painted on a canvas: shading, brows, lips, hair and
 * beard, and the damage a fight leaves. The head is sculpted with the
 * front of the face in the middle of the texture, so a feature at angle
 * theta and height t sits at x = (theta / 2pi + 0.5) and y = t.
 */
export class FaceTexture {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private level = -1;

  constructor(private readonly look: Look) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = SIZE;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.setDamage(0);
  }

  /** Repaints for a damage level from 0 (fresh) to 4 (battered). Cheap to call every frame. */
  setDamage(level: number): void {
    const next = Math.max(0, Math.min(4, Math.floor(level)));
    if (next === this.level) return;
    this.level = next;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    const random = seeded(this.look.id.length * 977 + 13);
    paintSkin(ctx, this.look);
    paintHair(ctx, this.look, random);
    paintBeard(ctx, this.look, random);
    paintFeatures(ctx, this.look);
    paintDamage(ctx, next);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

/** Canvas x for an angle around the head, 0 being the front. */
export const ax = (theta: number) => (theta / (Math.PI * 2) + 0.5) * SIZE;
export const ty = (t: number) => t * SIZE;

function blob(ctx: CanvasRenderingContext2D, theta: number, t: number, rx: number, ry: number, colour: string, alpha: number): void {
  const x = ax(theta);
  const y = ty(t);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, colour);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintSkin(ctx: CanvasRenderingContext2D, look: Look): void {
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.skin;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Warm cheeks and ears, a shaded jaw and a touch of shine on the brow.
  blob(ctx, 0.62, 0.6, 70, 50, "#c0504a", 0.18);
  blob(ctx, -0.62, 0.6, 70, 50, "#c0504a", 0.18);
  blob(ctx, 0, 0.92, 200, 70, look.skinShade, 0.35);
  blob(ctx, 0, 0.3, 120, 60, "#ffffff", 0.08);
  // Sockets a little darker, so the eyes sit deep under the brow.
  for (const side of [-1, 1]) blob(ctx, side * 0.37, 0.5, 40, 26, look.skinShade, 0.45);
}

/** Where the hair stops, as t down the head for each angle: low at the back, high on the forehead. */
export function hairline(theta: number): number {
  const a = Math.abs(theta);
  if (a < 0.9) return 0.3 + 0.03 * (a / 0.9);
  if (a < 1.5) return 0.33 + 0.2 * ((a - 0.9) / 0.6);
  if (a < 2.2) return 0.53 + 0.13 * ((a - 1.5) / 0.7);
  return 0.66;
}

function paintHair(ctx: CanvasRenderingContext2D, look: Look, random: Random): void {
  if (look.hairStyle === "bald") {
    blob(ctx, 0, 0.12, 260, 90, "#ffffff", 0.12);
    return;
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= SIZE; x += 8) ctx.lineTo(x, ty(hairline((x / SIZE - 0.5) * Math.PI * 2)));
  ctx.lineTo(SIZE, 0);
  ctx.closePath();
  ctx.fill();
  // Short hair shows skin through it, most at the hairline.
  for (let i = 0; i < 9000; i++) {
    const x = random() * SIZE;
    const edge = ty(hairline((x / SIZE - 0.5) * Math.PI * 2));
    const y = random() * (edge + 18);
    ctx.globalAlpha = y > edge - 14 ? 0.5 : 0.18;
    ctx.fillStyle = random() < 0.5 ? look.skin : "#000000";
    ctx.fillRect(x, y, 2, 2);
  }
}

function paintBeard(ctx: CanvasRenderingContext2D, look: Look, random: Random): void {
  if (look.beard === "none") return;
  const dense = look.beard === "full" ? 0.95 : look.beard === "stubble" ? 0.3 : 0;
  if (dense > 0) {
    for (let i = 0; i < 26000; i++) {
      const theta = (random() - 0.5) * 3.0;
      const t = 0.6 + random() * 0.4;
      // Leave the lips and the cheeks above the jaw line clear.
      if (Math.abs(theta) < 0.22 && t > 0.69 && t < 0.77) continue;
      if (t < 0.62 + 0.22 * Math.max(0, 1 - Math.abs(Math.abs(theta) - 1.0) * 2) && Math.abs(theta) < 1.3) continue;
      ctx.globalAlpha = dense * (0.35 + random() * 0.4);
      ctx.fillStyle = look.hair;
      ctx.fillRect(ax(theta), ty(t), 3, 3);
    }
  }
  if (look.beard === "moustache" || look.beard === "full") {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.ellipse(ax(0), ty(0.675), 52, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) ctx.fillRect(ax(side * 0.26) - 7, ty(0.68), 14, look.beard === "moustache" ? 58 : 30);
  }
}

function paintFeatures(ctx: CanvasRenderingContext2D, look: Look): void {
  // Brows: thick, angled down toward the nose for a hard stare.
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = look.hair;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(ax(side * 0.16), ty(0.462));
    ctx.quadraticCurveTo(ax(side * 0.36), ty(0.418), ax(side * 0.56), ty(0.445));
    ctx.lineTo(ax(side * 0.55), ty(0.462));
    ctx.quadraticCurveTo(ax(side * 0.36), ty(0.44), ax(side * 0.17), ty(0.482));
    ctx.closePath();
    ctx.fill();
  }
  // Lips, with the line between them dark.
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = look.skinShade;
  ctx.beginPath();
  ctx.ellipse(ax(0), ty(0.73), 34, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "#2a1410";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax(-0.16), ty(0.724));
  ctx.quadraticCurveTo(ax(0), ty(0.719), ax(0.16), ty(0.724));
  ctx.stroke();
}

/** Redness first, then a swelling bruise, then a cut over the eye, then both eyes and the lip. */
function paintDamage(ctx: CanvasRenderingContext2D, level: number): void {
  if (level >= 1) {
    blob(ctx, 0.62, 0.6, 60, 44, "#d02030", 0.35);
    blob(ctx, -0.55, 0.62, 50, 40, "#d02030", 0.25);
  }
  if (level >= 2) {
    blob(ctx, 0.4, 0.545, 46, 30, "#5a1a4a", 0.7);
    blob(ctx, 0.42, 0.56, 70, 44, "#a02040", 0.35);
  }
  if (level >= 3) {
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "#7a0a10";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ax(-0.5), ty(0.43));
    ctx.lineTo(ax(-0.3), ty(0.415));
    ctx.stroke();
    ctx.strokeStyle = "#c4101c";
    ctx.lineWidth = 3;
    ctx.stroke();
    // A trickle of blood down past the eye.
    ctx.fillStyle = "#b00c18";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(ax(-0.42), ty(0.425), 5, 42);
    blob(ctx, -0.4, 0.43, 60, 30, "#a02040", 0.35);
  }
  if (level >= 4) {
    blob(ctx, -0.38, 0.55, 48, 30, "#4a1440", 0.75);
    blob(ctx, 0.1, 0.745, 22, 12, "#9a0c18", 0.9);
  }
  ctx.globalAlpha = 1;
}
