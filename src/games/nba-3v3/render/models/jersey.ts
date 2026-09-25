import * as THREE from "three";
import type { Team } from "../../roster";

const W = 512;
const H = 256;

function numberText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, edge: string): void {
  ctx.font = `italic 900 ${size}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = edge;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/**
 * The jersey's print, wrapped once around the torso. The back sits at
 * both edges and the front in the middle, so the front shows the team
 * name over the number and the back shows the player's name over it.
 */
export function jerseyTexture(team: Team, number: number, name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const body = ctx.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, team.color);
  body.addColorStop(1, new THREE.Color(team.color).lerp(new THREE.Color(team.dark), 0.35).getStyle());
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, W, H);
  // Side panels under the arms, and trim at the neck and the hem.
  ctx.fillStyle = team.dark;
  for (const x of [W * 0.25, W * 0.75]) ctx.fillRect(x - 26, 0, 52, H);
  ctx.fillStyle = team.trim;
  for (const x of [W * 0.25, W * 0.75]) {
    ctx.fillRect(x - 30, 0, 5, H);
    ctx.fillRect(x + 25, 0, 5, H);
  }
  ctx.fillRect(0, 0, W, 9);
  ctx.fillStyle = team.dark;
  ctx.fillRect(0, H - 12, W, 12);

  const edge = team.dark;
  numberText(ctx, team.name.toUpperCase(), W / 2, 62, 40, team.trim, edge);
  numberText(ctx, String(number), W / 2, 150, 108, "#ffffff", edge);
  for (const x of [0, W]) {
    numberText(ctx, name.toUpperCase(), x, 50, 30, "#ffffff", edge);
    numberText(ctx, String(number), x, 140, 112, "#ffffff", edge);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
