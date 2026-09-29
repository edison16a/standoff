import type * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";
import { DISPLAY_FONT, drawGraffiti, drawTag, star } from "./graffiti";
import { glass, roundRect } from "./train-art";

/** A long wall of concrete panels, a graffiti piece on every other one and tags round them. */
export function graffitiWallTexture(seed: number, base: string): THREE.Texture {
  return painted(`wall-${seed}-${base}`, 1024, 256, (ctx, w, h) => {
    const rng = new Rng(seed * 31 + 7);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${rng.chance(0.5) ? "255,255,255" : "90,80,60"},${rng.range(0.03, 0.08)})`;
      ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(6, 40), rng.range(2, 10));
    }
    ctx.fillStyle = "rgba(60,50,40,0.22)";
    for (let x = 0; x < w; x += w / 4) ctx.fillRect(x, 0, 4, h);
    ctx.fillRect(0, h - 16, w, 16);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(0, 0, w, 8);
    for (let i = 0; i < 2; i++) drawGraffiti(ctx, seed * 3 + i, w * (0.04 + i * 0.5), h * 0.14, w * 0.42, h * 0.7);
    for (let i = 0; i < 5; i++) drawTag(ctx, seed * 9 + i, rng.range(0, w * 0.95), rng.range(h * 0.25, h * 0.85), rng.range(22, 34));
    for (let i = 0; i < 3; i++) star(ctx, rng.range(0, w), rng.range(20, h - 30), rng.range(8, 16), "#ffe14d");
  });
}

/**
 * The fronts of the blocks of flats, one column per colour on a single
 * texture, so a whole street of them draws in one call: rows of white
 * framed windows catching the sky, a few with curtains or a plant.
 */
export function facadeAtlas(tints: readonly string[]): THREE.Texture {
  return painted(`facades-${tints.join("-")}`, 256 * tints.length, 512, (ctx, _w, h) => {
    tints.forEach((tint, column) => {
      ctx.save();
      ctx.translate(column * 256, 0);
      facade(ctx, 256, h, tint, column * 7 + 3);
      ctx.restore();
    });
  });
}

function facade(ctx: CanvasRenderingContext2D, w: number, h: number, tint: string, seed: number): void {
  const rng = new Rng(seed);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  // Brick courses, faint, so the wall has a surface without getting busy.
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 2);
  const cols = 4;
  const rows = 8;
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(0, r * rh + rh * 0.86, w, rh * 0.06);
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.2;
      const y = r * rh + rh * 0.18;
      const ww = cw * 0.6;
      const wh = rh * 0.6;
      ctx.fillStyle = "#f7f3ea";
      roundRect(ctx, x - 5, y - 5, ww + 10, wh + 10, 3);
      glass(ctx, x, y, ww, wh, 3);
      const roll = rng.next();
      if (roll < 0.25) {
        ctx.fillStyle = ["#ff8a8a", "#ffe08a", "#9fd6ff", "#c7a8ff"][rng.int(0, 3)]!;
        ctx.fillRect(x, y, ww * 0.35, wh);
        ctx.fillRect(x + ww * 0.65, y, ww * 0.35, wh);
      } else if (roll < 0.35) {
        ctx.fillStyle = "#3fb54a";
        ctx.beginPath();
        ctx.arc(x + ww / 2, y + wh + 2, ww * 0.3, Math.PI, 0);
        ctx.fill();
      }
    }
  }
}

/** Corrugated shipping container sides, with a big stencilled name. */
export function containerTexture(color: string, name: string): THREE.Texture {
  return painted(`container-${color}-${name}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(x, 0, 6, h);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(x + 7, 0, 3, h);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, w, h);
    ctx.font = `900 ${h * 0.26}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, w / 2, h / 2);
  });
}

/** The station name board on a platform. */
export function stationSignTexture(name: string): THREE.Texture {
  return painted(`station-${name}`, 512, 96, (ctx, w, h) => {
    ctx.fillStyle = "#1f5fd6";
    roundRect(ctx, 0, 0, w, h, 16);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 8, 8, w - 16, h - 16, 10);
    ctx.fillStyle = "#e8312a";
    ctx.beginPath();
    ctx.arc(h / 2 + 6, h / 2, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(h / 2 + 6 - h * 0.34, h / 2 - 7, h * 0.68, 14);
    ctx.font = `900 ${h * 0.46}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "#1d2640";
    ctx.textBaseline = "middle";
    ctx.fillText(name, h + 14, h / 2 + 2);
  });
}

/**
 * A tunnel wall: plain concrete up high, a bold blue band, and big glazed
 * tiles below, grimy near the floor. The tiles are large so they still read
 * as tiles when the wall streams past at a glancing angle.
 */
export function tunnelTileTexture(): THREE.Texture {
  return painted("tunnel-tiles", 512, 256, (ctx, w, h) => {
    const rng = new Rng(21);
    ctx.fillStyle = "#c9c1b2";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(90,80,60,0.12)";
    for (let i = 0; i < 60; i++) ctx.fillRect(rng.range(0, w), rng.range(0, h * 0.4), rng.range(10, 60), rng.range(4, 14));
    ctx.fillStyle = "#1f6fd6";
    ctx.fillRect(0, h * 0.42, w, h * 0.1);
    ctx.fillStyle = "#6f6a60";
    ctx.fillRect(0, h * 0.52, w, h * 0.48);
    const tw = 64;
    const th = 32;
    for (let y = h * 0.52; y < h; y += th) {
      for (let x = Math.round((y - h * 0.52) / th) % 2 ? -tw / 2 : 0; x < w; x += tw) {
        const shade = rng.int(-10, 10);
        ctx.fillStyle = `rgb(${236 + shade},${232 + shade},${218 + shade})`;
        ctx.fillRect(x + 2, y + 2, tw - 4, th - 4);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(x + 5, y + 4, tw * 0.4, 3);
      }
    }
    const grime = ctx.createLinearGradient(0, h * 0.6, 0, h);
    grime.addColorStop(0, "rgba(40,32,24,0)");
    grime.addColorStop(1, "rgba(40,32,24,0.55)");
    ctx.fillStyle = grime;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) drawTag(ctx, 40 + i, rng.range(0, w * 0.8), rng.range(h * 0.65, h * 0.9), 24);
  });
}
