import * as THREE from "three";
import { FIELD, YARD } from "../../engine/field";
import { TEAMS } from "../../teams";
import { END_ZONES, hashMarks, NUMBER_HEIGHT, numerals, yardLines, type Line } from "./marks";

/** The painted area: the field plus a 2 metre white bordered strip all round. */
export const PAINT_MARGIN = 2;
export const PAINT_W = 2 * (FIELD.endX + PAINT_MARGIN);
export const PAINT_H = 2 * (FIELD.halfWidth + PAINT_MARGIN);

/**
 * Paints the field on a canvas: mowed grass in 5 yard bands, the yard
 * lines, hash marks and numbers, both end zones in team colours with
 * the team names, and a logo at midfield. Canvas left is field -x and
 * canvas top is field -z, the way the ground plane maps it.
 */
export function fieldTexture(pxPerMetre: number, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAINT_W * pxPerMetre);
  canvas.height = Math.round(PAINT_H * pxPerMetre);
  const ctx = canvas.getContext("2d")!;
  const k = canvas.width / PAINT_W;
  const X = (x: number) => (x + PAINT_W / 2) * k;
  const Z = (z: number) => (z + PAINT_H / 2) * k;
  grass(ctx, canvas.width, canvas.height, X);
  for (const ez of END_ZONES) {
    ctx.fillStyle = TEAMS[ez.team].color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(X(ez.x0), Z(-FIELD.halfWidth), (ez.x1 - ez.x0) * k, 2 * FIELD.halfWidth * k);
    ctx.globalAlpha = 1;
    endZoneWord(ctx, TEAMS[ez.team].name.toUpperCase(), X((ez.x0 + ez.x1) / 2), Z(0), FIELD.halfWidth * 1.3 * k, (ez.x1 - ez.x0) * 0.62 * k, ez.team === 0);
  }
  ctx.fillStyle = "#f7f7f2";
  const paint = (l: Line) => ctx.fillRect(X(l.x - l.width / 2), Z(Math.min(l.z0, l.z1)), l.width * k, Math.abs(l.z1 - l.z0) * k);
  for (const l of yardLines()) paint(l);
  for (const l of hashMarks()) paint(l);
  // The end lines, and the wide white border round the whole field.
  for (const x of [-FIELD.endX, FIELD.endX]) paint({ x, z0: -FIELD.halfWidth, z1: FIELD.halfWidth, width: 0.2 });
  const b = 1.83 * k;
  ctx.fillRect(X(-FIELD.endX) - b, Z(-FIELD.halfWidth) - b, (2 * FIELD.endX) * k + 2 * b, b);
  ctx.fillRect(X(-FIELD.endX) - b, Z(FIELD.halfWidth), (2 * FIELD.endX) * k + 2 * b, b);
  ctx.fillRect(X(-FIELD.endX) - b, Z(-FIELD.halfWidth) - b, b, 2 * FIELD.halfWidth * k + 2 * b);
  ctx.fillRect(X(FIELD.endX), Z(-FIELD.halfWidth) - b, b, 2 * FIELD.halfWidth * k + 2 * b);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${NUMBER_HEIGHT * k * 0.95}px "Arial Black", Impact, sans-serif`;
  for (const n of numerals()) {
    ctx.save();
    ctx.translate(X(n.x), Z(n.z));
    if (n.flip) ctx.rotate(Math.PI);
    // Wide numerals straddle their yard line with a small gap for it.
    ctx.fillText(n.text.split("").join(" "), 0, 0);
    ctx.restore();
  }
  midfieldLogo(ctx, X(0), Z(0), 5 * YARD * k);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function grass(ctx: CanvasRenderingContext2D, w: number, h: number, X: (x: number) => number): void {
  ctx.fillStyle = "#2f7a32";
  ctx.fillRect(0, 0, w, h);
  // Mowed bands every 5 yards, alternating light and dark as the mower went up and back.
  ctx.fillStyle = "#378a39";
  for (let y = -10; y < 110; y += 10) ctx.fillRect(X((y - 50) * YARD), 0, X((y - 45) * YARD) - X((y - 50) * YARD), h);
  // A fine speckle so the grass is not a flat colour up close.
  let seed = 12345;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 90; i++) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? "rgba(120,190,110,0.12)" : "rgba(10,40,10,0.14)";
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
}

function endZoneWord(ctx: CanvasRenderingContext2D, word: string, cx: number, cy: number, length: number, height: number, left: boolean): void {
  ctx.save();
  ctx.translate(cx, cy);
  // The words run across the field, reading from the end line toward the goal line.
  ctx.rotate(left ? -Math.PI / 2 : Math.PI / 2);
  ctx.font = `900 ${height}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const measured = ctx.measureText(word).width;
  ctx.scale(Math.min(1, length / measured), 1);
  ctx.lineWidth = height * 0.08;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.strokeText(word, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillText(word, 0, 0);
  ctx.restore();
}

/** A star in a ring at midfield, the league's mark. */
function midfieldLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#12203f";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = "#f7f7f2";
  ctx.stroke();
  ctx.fillStyle = "#f5c518";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r * 0.62 : r * 0.26;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
