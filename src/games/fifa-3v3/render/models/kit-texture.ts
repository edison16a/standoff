import * as THREE from "three";
import type { Kit } from "../../roster";

const W = 512;
const H = 256;

/**
 * The shirt, printed on a canvas that wraps round the torso. The torso
 * is a lathe starting at the player's left side, so a quarter of the
 * way along is the middle of the back and three quarters is the chest.
 * The back carries the name and a big number, the chest a crest and a
 * small number, like a real kit.
 */
export function jerseyTexture(kit: Kit, name: string, number: number, keeper = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = kit.shirt;
  ctx.fillRect(0, 0, W, H);
  if (kit.stripes) {
    ctx.fillStyle = kit.stripes;
    // Nine stripes round the body, one straight down the middle of the chest.
    for (let i = 0; i < 9; i++) {
      const centre = ((0.75 + i / 9) % 1) * W;
      const band = W / 22;
      ctx.fillRect(centre - band / 2, 0, band, H);
      if (centre + band / 2 > W) ctx.fillRect(centre - band / 2 - W, 0, band, H);
    }
  }
  // A soft shade toward the sides gives the flat print some shape.
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  for (const [at, alpha] of [[0, 0.22], [0.25, 0], [0.5, 0.22], [0.75, 0], [1, 0.22]] as const) shade.addColorStop(at, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = kit.trim;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 8, W, 8);
  // Side panels in the trim colour.
  for (const u of [0, 0.5, 1]) ctx.fillRect(u * W - 5, 0, 10, H);
  if (keeper) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000000";
    for (let y = 30; y < H; y += 26) ctx.fillRect(0, y, W, 8);
    ctx.globalAlpha = 1;
  }
  printBack(ctx, kit, name, number);
  printFront(ctx, kit, number);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, kit: Kit, stroke: number): void {
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke;
  ctx.strokeStyle = kit.ink === kit.trim ? "rgba(0,0,0,0.35)" : kit.trim;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = kit.ink;
  ctx.fillText(text, x, y);
}

function printBack(ctx: CanvasRenderingContext2D, kit: Kit, name: string, number: number): void {
  const x = 0.25 * W;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = name.length > 8 ? 22 : 26;
  ctx.font = `800 ${size}px Arial, Helvetica, sans-serif`;
  outlined(ctx, name, x, 44, kit, 4);
  ctx.font = "900 118px Arial Black, Arial, Helvetica, sans-serif";
  outlined(ctx, String(number), x, 138, kit, 8);
}

function printFront(ctx: CanvasRenderingContext2D, kit: Kit, number: number): void {
  const x = 0.75 * W;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 58px Arial Black, Arial, Helvetica, sans-serif";
  outlined(ctx, String(number), x, 128, kit, 5);
  // A little shield crest over the heart, which is on the player's left, the viewer's right.
  const cx = x + 0.07 * W;
  const cy = 58;
  ctx.beginPath();
  ctx.moveTo(cx - 13, cy - 15);
  ctx.lineTo(cx + 13, cy - 15);
  ctx.lineTo(cx + 13, cy + 3);
  ctx.quadraticCurveTo(cx + 12, cy + 15, cx, cy + 20);
  ctx.quadraticCurveTo(cx - 12, cy + 15, cx - 13, cy + 3);
  ctx.closePath();
  ctx.fillStyle = kit.trim;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = kit.ink;
  ctx.stroke();
  // And the maker's mark on the other side.
  ctx.fillStyle = kit.ink;
  ctx.beginPath();
  ctx.moveTo(x - 0.075 * W - 12, 62);
  ctx.quadraticCurveTo(x - 0.075 * W, 70, x - 0.075 * W + 14, 50);
  ctx.quadraticCurveTo(x - 0.075 * W + 2, 62, x - 0.075 * W - 12, 62);
  ctx.fill();
}
