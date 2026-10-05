import * as THREE from "three";
import { ATLAS_SIZE, REGIONS } from "./atlas-layout";
import { inRegion, type Ctx } from "./atlas-draw";
import { drawBadges } from "./atlas-badges";
import { drawTyres } from "./atlas-tyres";

let shared: THREE.CanvasTexture | null = null;

/**
 * The one texture every kart uses, drawn on a canvas the first time a
 * kart is shown. Shared by all karts on the page, so four karts cost one
 * texture. Pictures meant to take the kart's colour are drawn in greys,
 * which the part's own colour then tints.
 */
export function kartAtlas(): THREE.CanvasTexture | null {
  if (shared) return shared;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawPlain(ctx);
  drawTyres(ctx);
  drawBadges(ctx);
  shared = new THREE.CanvasTexture(canvas);
  shared.colorSpace = THREE.SRGBColorSpace;
  shared.anisotropy = 8;
  shared.generateMipmaps = true;
  shared.minFilter = THREE.LinearMipmapLinearFilter;
  return shared;
}

/** The small greyscale pictures: white, eyes, lamps, grilles, quilting, carbon, vents and bolts. */
function drawPlain(ctx: Ctx): void {
  inRegion(ctx, REGIONS.white, (w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  });
  inRegion(ctx, REGIONS.eye, (w) => {
    const c = w / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, w);
    const iris = ctx.createRadialGradient(c, c, 4, c, c, c);
    iris.addColorStop(0, "#3a3a3a");
    iris.addColorStop(0.45, "#c8c8c8");
    iris.addColorStop(0.92, "#8a8a8a");
    iris.addColorStop(1, "#202020");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(c, c, c - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * c * 0.38, c + Math.sin(a) * c * 0.38);
      ctx.lineTo(c + Math.cos(a) * c * 0.85, c + Math.sin(a) * c * 0.85);
      ctx.stroke();
    }
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.arc(c, c, c * 0.36, 0, Math.PI * 2);
    ctx.fill();
  });
  inRegion(ctx, REGIONS.lamp, (w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 2, c, c, c);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#fff8e6");
    g.addColorStop(0.75, "#d9d4c8");
    g.addColorStop(1, "#8d8a84");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    // Fresnel rings of the lens.
    ctx.strokeStyle = "rgba(120,110,100,0.35)";
    for (let rr = 10; rr < c; rr += 9) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c, c, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  inRegion(ctx, REGIONS.tail, (w, h) => {
    ctx.fillStyle = "#ff2a2a";
    ctx.fillRect(0, 0, w, h);
    // Little prisms, the way a tail lamp lens breaks up the light.
    for (let y = 0; y < h; y += 12) {
      for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) {
        ctx.fillStyle = (x + y) % 24 === 0 ? "#ff6a5a" : "#c4100e";
        ctx.beginPath();
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 12, y + 6);
        ctx.lineTo(x + 6, y + 12);
        ctx.lineTo(x, y + 6);
        ctx.fill();
      }
    }
  });
  inRegion(ctx, REGIONS.grille, (w, h) => {
    ctx.fillStyle = "#101012";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#7a7a80";
    ctx.lineWidth = 2.2;
    const s = 9;
    for (let row = 0; row * s * 1.5 < h + s; row++) {
      for (let col = 0; col * s * 1.732 < w + s; col++) {
        const cx = col * s * 1.732 + (row % 2 ? s * 0.866 : 0);
        const cy = row * s * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) ctx.lineTo(cx + Math.cos((k / 6) * Math.PI * 2 + Math.PI / 6) * s, cy + Math.sin((k / 6) * Math.PI * 2 + Math.PI / 6) * s);
        ctx.closePath();
        ctx.stroke();
      }
    }
  });
  inRegion(ctx, REGIONS.quilt, (w, h) => {
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(0, 0, w, h);
    // Diamond quilting with stitch lines, shaded so each pad looks puffed up.
    const s = 32;
    for (let y = -s; y < h + s; y += s) {
      for (let x = -s; x < w + s; x += s) {
        const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s * 0.7);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#a8a8a8");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + s / 2, y);
        ctx.lineTo(x + s, y + s / 2);
        ctx.lineTo(x + s / 2, y + s);
        ctx.lineTo(x, y + s / 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    for (let k = -h; k < w + h; k += s / 2) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + h, h);
      ctx.moveTo(k, h);
      ctx.lineTo(k + h, 0);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  });
  inRegion(ctx, REGIONS.carbon, (w, h) => {
    // Twill weave: each tow a little gradient, alternating direction.
    const s = 8;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const along = ((x + y) / s) % 4 < 2;
        const g = along ? ctx.createLinearGradient(x, y, x + s, y) : ctx.createLinearGradient(x, y, x, y + s);
        g.addColorStop(0, "#2a2a2e");
        g.addColorStop(0.5, "#5c5c64");
        g.addColorStop(1, "#202024");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, s, s);
      }
    }
  });
  inRegion(ctx, REGIONS.vent, (w, h) => {
    ctx.fillStyle = "#d0d0d0";
    ctx.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 6; y += 16) {
      const g = ctx.createLinearGradient(0, y, 0, y + 10);
      g.addColorStop(0, "#0c0c0e");
      g.addColorStop(1, "#5a5a60");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(10, y, w - 20, 9, 4);
      ctx.fill();
    }
  });
  inRegion(ctx, REGIONS.bolt, (w) => {
    const c = w / 2;
    ctx.fillStyle = "#9a9aa0";
    ctx.fillRect(0, 0, w, w);
    const g = ctx.createRadialGradient(c - 6, c - 6, 2, c, c, c);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#6a6a70");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(c + Math.cos((k / 6) * Math.PI * 2) * c * 0.9, c + Math.sin((k / 6) * Math.PI * 2) * c * 0.9);
    ctx.fill();
    ctx.fillStyle = "#3a3a40";
    ctx.beginPath();
    ctx.arc(c, c, c * 0.25, 0, Math.PI * 2);
    ctx.fill();
  });
}
