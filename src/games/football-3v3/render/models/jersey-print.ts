import * as THREE from "three";
import type { TeamId } from "../../teams";
import type { KitSpec } from "./kit";
import { drawLogo } from "./logos";
import { sample } from "./loft";
import type { Dims } from "./rig";
import { collarV, JERSEY_U, TORSO_V0, torsoStations, torsoV } from "./torso";

/**
 * The jersey's print, laid out for the torso and sleeve texture
 * coordinates: the torso on the top three quarters (collar at the top,
 * hem at the bottom, the chest a quarter of the way across and the back
 * three quarters), the sleeves side by side underneath. Numbers, the
 * name and the logo are drawn at their real size on the body: each is
 * scaled by how many texels a metre of jersey gets there.
 */

const FONT = `"Arial Black", "Helvetica Neue", Arial, sans-serif`;

/** Half the perimeter of a torso section at height `y`, measured round its points. */
function perimeter(d: Dims, y: number): number {
  const keys = torsoStations(d);
  let lo = keys[0]!.t;
  let hi = keys[7]!.t;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (sample(keys, mid).y < y) lo = mid;
    else hi = mid;
  }
  const s = sample(keys, lo);
  // Ramanujan's ellipse perimeter with the mean depth; the squared off pads add a little.
  const a = (s.l + s.r) / 2;
  const b = (s.f + s.b) / 2;
  const h = ((a - b) / (a + b)) ** 2;
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))) * (1 + (s.p - 2) * 0.04);
}

export function printJersey(kit: KitSpec, d: Dims, team: TeamId, width: number): THREE.CanvasTexture {
  const W = width;
  const Hc = Math.round(width * 0.75);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Hc;
  const ctx = canvas.getContext("2d")!;
  const H = d.height;
  /** Canvas row of a world height on the torso. */
  const row = (y: number) => (1 - torsoV(d, y)) * Hc;
  /** Texels per metre across and up the torso at height `y`. */
  const across = (y: number) => W / perimeter(d, y);
  const up = (y: number) => Math.abs(row(y + 0.01) - row(y)) / 0.01;

  ctx.fillStyle = kit.jersey;
  ctx.fillRect(0, 0, W, Hc);
  // Mesh side panels from the hem to the armpit, a shade darker.
  const pit = row(0.735 * H);
  const hem = (1 - TORSO_V0) * Hc;
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (const x of [0, W / 2, W]) ctx.fillRect(x - 0.045 * W, pit, 0.09 * W, hem - pit);
  // Seams: down each side panel and across the yoke over the pads.
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 2;
  for (const x of [0.045, 0.455, 0.545, 0.955]) line(ctx, x * W, pit, x * W, hem);
  line(ctx, 0, row(0.81 * H), W, row(0.81 * H));
  // The collar's trim: a band along the edge, which the V neck dips at the front.
  const collar = (1 - collarV(d)) * Hc;
  ctx.fillStyle = kit.trim;
  ctx.fillRect(0, collar - 0.004 * Hc, W, 0.02 * Hc);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, collar + 0.016 * Hc, W, 0.004 * Hc);
  // Soft folds where the jersey bunches into the belt.
  const folds = ctx.createLinearGradient(0, hem - 0.06 * Hc, 0, hem);
  folds.addColorStop(0, "rgba(0,0,0,0)");
  folds.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = folds;
  ctx.fillRect(0, hem - 0.06 * Hc, W, 0.06 * Hc);
  creases(ctx, W, pit, hem);

  const n = String(kit.number);
  const span = (top: number, bottom: number) => ({ top: row(top * H), bottom: row(bottom * H), metres: (top - bottom) * H });
  number(ctx, n, JERSEY_U.front * W, span(0.776, 0.668), across(0.72 * H), kit);
  number(ctx, n, JERSEY_U.back * W, span(0.775, 0.642), across(0.71 * H), kit);
  if (kit.name) name(ctx, kit, JERSEY_U.back * W, row(0.796 * H), 0.05 * H * up(0.796 * H), across(0.796 * H) / up(0.796 * H));
  // The team mark at the bottom of the collar's V.
  const mark = 0.026 * H * up(0.795 * H);
  const squeeze = across(0.795 * H) / up(0.795 * H);
  ctx.save();
  ctx.translate(JERSEY_U.front * W - mark * 0.5 * squeeze, row(0.808 * H));
  ctx.scale(squeeze, 1);
  drawLogo(ctx, team, mark);
  ctx.restore();
  sleeves(ctx, kit, W, Hc, H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Baked creases: the jersey pulls tight from under each pad down toward
 * the waist, and bunches in soft horizontal ripples above the belt. Faint,
 * so the numbers stay clean, but enough that the cloth reads as cloth.
 */
function creases(ctx: CanvasRenderingContext2D, W: number, pit: number, hem: number): void {
  ctx.save();
  ctx.lineCap = "round";
  const span = hem - pit;
  for (const centre of [0.25, 0.75]) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x0 = (centre + side * (0.2 - i * 0.025)) * W;
        const x1 = (centre + side * (0.13 - i * 0.03)) * W;
        ctx.strokeStyle = `rgba(0,0,0,${0.07 - i * 0.015})`;
        ctx.lineWidth = 5 - i;
        ctx.beginPath();
        ctx.moveTo(x0, pit - span * 0.15 + i * 6);
        ctx.quadraticCurveTo((x0 + x1) / 2 + side * 6, pit + span * 0.3, x1, pit + span * (0.55 + i * 0.08));
        ctx.stroke();
      }
    }
  }
  for (let k = 0; k < 4; k++) {
    const y = hem - span * (0.05 + k * 0.045);
    ctx.strokeStyle = `rgba(0,0,0,${0.06 - k * 0.012})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + k * 1.7) * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** A block number with a contrasting outline, fitted between two rows and stretched across so it keeps its true shape on the body. */
function number(ctx: CanvasRenderingContext2D, text: string, x: number, box: { top: number; bottom: number; metres: number }, perMetre: number, kit: KitSpec): void {
  const h = box.bottom - box.top;
  const squeeze = perMetre / (h / box.metres);
  ctx.save();
  ctx.translate(x, (box.top + box.bottom) / 2);
  // Football numbers are drawn a little wide.
  ctx.scale(squeeze * 1.12, 1);
  ctx.font = `900 ${h * 1.32}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = h * 0.09;
  ctx.strokeStyle = kit.helmet;
  ctx.strokeText(text, 0, h * 0.04);
  ctx.fillStyle = kit.trim;
  ctx.fillText(text, 0, h * 0.04);
  ctx.restore();
}

/** The name across the shoulders: `squeeze` keeps the letters' true shape, and a long name shrinks to fit. */
function name(ctx: CanvasRenderingContext2D, kit: KitSpec, x: number, y: number, h: number, squeeze: number): void {
  ctx.save();
  ctx.font = `800 ${h}px ${FONT}`;
  const text = kit.name ?? "";
  const room = ctx.canvas.width * 0.3;
  const fit = Math.min(1, room / Math.max(1, ctx.measureText(text).width * squeeze));
  ctx.translate(x, y);
  ctx.scale(squeeze * fit, fit);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = kit.trim;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** The sleeves: stripes round the cuff and the number on the outside of each. */
function sleeves(ctx: CanvasRenderingContext2D, kit: KitSpec, W: number, Hc: number, H: number): void {
  const top = 0.76 * Hc;
  const bottom = 0.995 * Hc;
  const span = bottom - top;
  ctx.fillStyle = kit.jersey;
  ctx.fillRect(0, top, W, Hc - top);
  for (const x0 of [0, W / 2]) {
    ctx.fillStyle = kit.trim;
    ctx.fillRect(x0, bottom - span * 0.2, W / 2, span * 0.06);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0, bottom - span * 0.12, W / 2, span * 0.04);
    if (kit.sleeves === "bare") continue;
    const h = span * 0.32;
    // A metre round the arm takes about twice the texels a metre down it.
    const sx = (W / 2 / (0.44 * H / 1.85)) / (span / (0.24 * H / 1.85));
    ctx.save();
    ctx.translate(x0 + W / 4, top + span * 0.5);
    ctx.scale(sx * 1.05, 1);
    ctx.font = `900 ${h * 1.3}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = h * 0.1;
    ctx.strokeStyle = kit.helmet;
    ctx.strokeText(String(kit.number), 0, 0);
    ctx.fillStyle = kit.trim;
    ctx.fillText(String(kit.number), 0, 0);
    ctx.restore();
  }
}
