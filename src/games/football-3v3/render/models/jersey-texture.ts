import * as THREE from "three";
import type { KitSpec } from "./kit";

const W = 512;
const H = 256;

/**
 * The jersey, printed on a canvas that wraps round the torso and pads.
 * The torso is a lathe starting at the player's left side, so a quarter
 * of the way along is the middle of the back and three quarters is the
 * chest. Football numbers are huge on both sides so the camera behind
 * the play can read them.
 */
export function jerseyTexture(kit: KitSpec): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = kit.jersey;
  ctx.fillRect(0, 0, W, H);
  // A soft shade toward the sides gives the flat print some shape.
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  for (const [at, alpha] of [[0, 0.25], [0.25, 0], [0.5, 0.25], [0.75, 0], [1, 0.25]] as const) shade.addColorStop(at, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  // Two stripes over the top of the shoulder pads, all the way round.
  ctx.fillStyle = kit.trim;
  ctx.fillRect(0, 14, W, 7);
  ctx.fillRect(0, 27, W, 7);
  // The hem is tucked into the pants, so the bottom edge is a touch darker.
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, H - 14, W, 14);
  const n = String(kit.number);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const numberFont = `900 ${n.length > 1 ? 118 : 132}px "Arial Black", Impact, sans-serif`;
  printNumber(ctx, n, 0.75 * W, 150, numberFont, kit);
  printNumber(ctx, n, 0.25 * W, 162, numberFont, kit);
  if (kit.name) {
    ctx.font = `800 26px "Arial Black", Impact, sans-serif`;
    ctx.fillStyle = kit.trim;
    ctx.fillText(kit.name, 0.25 * W, 66);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A block number with a contrasting outline, as on a real jersey. */
function printNumber(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, kit: KitSpec): void {
  ctx.font = font;
  ctx.lineJoin = "round";
  ctx.lineWidth = 10;
  ctx.strokeStyle = kit.helmet;
  // Squeezed a little wide, the way football numbers are drawn.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.15, 1);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = kit.trim;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
