import * as THREE from "three";
import { CORNER_Z } from "../../engine/court";
import { seeded } from "../../engine/rng";
import { COURT, RIM } from "../../engine/tuning";

/** The floor the texture covers, in court metres. It runs past the lines onto the apron. */
export const FLOOR = { minX: -10, maxX: 10, minZ: -3, maxZ: 14 } as const;

const PX = 110;
const KEY = "#4a1f8c";
const APRON = "#11163a";
const LINE = "#f8fafc";

/**
 * Paints the court: polished maple planks running toward the hoop, a
 * purple key, white lines for the arc, the key, the circles and the half
 * court line, and a dark apron with the game's name around it.
 */
export function floorTexture(): THREE.CanvasTexture {
  const w = Math.round((FLOOR.maxX - FLOOR.minX) * PX);
  const h = Math.round((FLOOR.maxZ - FLOOR.minZ) * PX);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const X = (x: number) => (x - FLOOR.minX) * PX;
  const Z = (z: number) => (z - FLOOR.minZ) * PX;

  ctx.fillStyle = APRON;
  ctx.fillRect(0, 0, w, h);
  wood(ctx, X(-COURT.halfWidth), Z(0), COURT.halfWidth * 2 * PX, (COURT.depth + 0.6) * PX);

  // The key, glossy purple, and the restricted arc under the rim.
  ctx.fillStyle = KEY;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(X(-COURT.keyHalfWidth), Z(0), COURT.keyHalfWidth * 2 * PX, COURT.keyDepth * PX);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.06 * PX;
  ctx.strokeRect(X(-COURT.halfWidth), Z(0), COURT.halfWidth * 2 * PX, COURT.depth * PX);
  ctx.strokeRect(X(-COURT.keyHalfWidth), Z(0), COURT.keyHalfWidth * 2 * PX, COURT.keyDepth * PX);
  const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
    ctx.beginPath();
    ctx.arc(X(cx), Z(cz), r * PX, a0, a1);
    ctx.stroke();
  };
  arc(0, COURT.keyDepth, 1.8, 0, Math.PI * 2);
  arc(RIM.x, RIM.z, 1.25, 0, Math.PI);
  arc(0, COURT.depth, 1.8, Math.PI, Math.PI * 2);
  // The three point line: straight in the corners, then the arc.
  const start = Math.atan2(CORNER_Z - RIM.z, COURT.cornerX);
  ctx.beginPath();
  ctx.moveTo(X(COURT.cornerX), Z(0));
  ctx.lineTo(X(COURT.cornerX), Z(CORNER_Z));
  ctx.arc(X(RIM.x), Z(RIM.z), COURT.arcRadius * PX, start, Math.PI - start);
  ctx.lineTo(X(-COURT.cornerX), Z(0));
  ctx.stroke();
  // Hash marks on the lane, as on a real court.
  for (const side of [-1, 1]) {
    for (const z of [1.75, 2.6, 3.45, 4.3]) {
      ctx.beginPath();
      ctx.moveTo(X(side * COURT.keyHalfWidth), Z(z));
      ctx.lineTo(X(side * (COURT.keyHalfWidth + 0.2)), Z(z));
      ctx.stroke();
    }
  }

  logo(ctx, X(0), Z(COURT.depth), 1.8 * PX);
  ctx.font = `italic 900 ${0.95 * PX}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("STANDOFF  ARENA", X(0), Z(-1.5));
  ctx.save();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(X(side * 8.8), Z(5.5));
    ctx.rotate(side * Math.PI / 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `italic 900 ${0.8 * PX}px Impact, "Arial Black", sans-serif`;
    ctx.fillText("NBA 3V3", 0, 0);
    ctx.restore();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Maple planks along the length of the court, each a slightly different tone, with a faint grain. */
function wood(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number): void {
  const rng = seeded(7);
  const plank = 0.075 * PX;
  for (let x = 0; x < w; x += plank) {
    let y = -rng() * 3 * PX;
    while (y < h) {
      const len = (1.6 + rng() * 2.4) * PX;
      const tone = 0.9 + rng() * 0.16;
      ctx.fillStyle = `rgb(${Math.round(222 * tone)},${Math.round(172 * tone)},${Math.round(112 * tone)})`;
      ctx.fillRect(x0 + x, y0 + Math.max(0, y), plank, Math.min(len, h - y));
      ctx.fillStyle = "rgba(90,50,20,0.25)";
      ctx.fillRect(x0 + x, y0 + Math.max(0, y), 1, Math.min(len, h - y));
      if (y > 0) ctx.fillRect(x0 + x, y0 + y, plank, 1);
      y += len;
    }
  }
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rng() < 0.5 ? "rgba(120,70,30,0.08)" : "rgba(255,230,190,0.07)";
    ctx.fillRect(x0 + rng() * w, y0 + rng() * h, 1.5, 6 + rng() * 26);
  }
}

/** The centre circle logo: a ball behind the name, cut in half by the half court line. */
function logo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.96, 0, Math.PI * 2);
  ctx.fillStyle = KEY;
  ctx.fill();
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
  ctx.moveTo(x - r * 0.62, y);
  ctx.lineTo(x + r * 0.62, y);
  ctx.moveTo(x, y - r * 0.62);
  ctx.lineTo(x, y + r * 0.62);
  ctx.stroke();
  ctx.font = `italic 900 ${r * 0.62}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = "#11163a";
  ctx.strokeText("3V3", x, y - r * 0.4);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("3V3", x, y - r * 0.4);
  ctx.restore();
}
