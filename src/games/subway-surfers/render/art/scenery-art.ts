import type * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";
import { DISPLAY_FONT, drawGraffiti, star } from "./graffiti";
import { roundRect } from "./train-art";

/** A long wall of concrete panels, a graffiti piece on every other one. */
export function graffitiWallTexture(seed: number, base: string): THREE.Texture {
  return painted(`wall-${seed}-${base}`, 1024, 256, (ctx, w, h) => {
    const rng = new Rng(seed * 31 + 7);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${rng.chance(0.5) ? "255,255,255" : "40,30,20"},${rng.range(0.02, 0.07)})`;
      ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(6, 40), rng.range(2, 10));
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let x = 0; x < w; x += w / 4) ctx.fillRect(x, 0, 4, h);
    ctx.fillRect(0, h - 18, w, 18);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 0, w, 10);
    for (let i = 0; i < 2; i++) drawGraffiti(ctx, seed * 3 + i, w * (0.04 + i * 0.5), h * 0.14, w * 0.42, h * 0.7);
    // Tags and doodles fill the gaps, like a real yard wall.
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(rng.range(0, w), rng.range(h * 0.2, h * 0.8));
      ctx.rotate(rng.range(-0.3, 0.3));
      ctx.font = `900 ${rng.range(18, 34)}px ${DISPLAY_FONT}`;
      ctx.fillStyle = ["#ffffff", "#1d1d24", "#ff3d7f", "#2ee6a8"][rng.int(0, 3)]!;
      ctx.fillText(["K!", "ZAP", "LOL", "MX", "2ND", "YOLO"][rng.int(0, 5)]!, 0, 0);
      ctx.restore();
    }
    for (let i = 0; i < 4; i++) star(ctx, rng.range(0, w), rng.range(20, h - 30), rng.range(8, 16), "#ffe14d");
  });
}

/** A block of flats or offices: rows of windows, some lit. */
export function windowsTexture(tint: string, seed: number): THREE.Texture {
  return painted(`windows-${tint}-${seed}`, 256, 512, (ctx, w, h) => {
    const rng = new Rng(seed);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    const shade = ctx.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, "rgba(255,255,255,0.12)");
    shade.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    const cols = 4;
    const rows = 9;
    const cw = w / cols;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, r * rh + rh * 0.86, w, rh * 0.08);
      for (let c = 0; c < cols; c++) {
        const lit = rng.chance(0.3);
        const x = c * cw + cw * 0.18;
        const y = r * rh + rh * 0.18;
        ctx.fillStyle = "#f4f1ea";
        roundRect(ctx, x - 3, y - 3, cw * 0.64 + 6, rh * 0.62 + 6, 3);
        const glass = ctx.createLinearGradient(x, y, x, y + rh * 0.6);
        glass.addColorStop(0, lit ? "#ffe9a8" : "#8fc1ea");
        glass.addColorStop(1, lit ? "#ffc15c" : "#3b6b9c");
        ctx.fillStyle = glass;
        ctx.fillRect(x, y, cw * 0.64, rh * 0.62);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(x + 3, y + 3, cw * 0.12, rh * 0.5);
      }
    }
  });
}

/** Corrugated shipping container sides, with a big stencilled name. */
export function containerTexture(color: string, name: string): THREE.Texture {
  return painted(`container-${color}-${name}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(x, 0, 6, h);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 7, 0, 3, h);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, w, h);
    ctx.font = `900 ${h * 0.26}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
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

/** A glowing shop or club sign for the evening streets. */
export function neonTexture(word: string, color: string): THREE.Texture {
  return painted(`neon-${word}-${color}`, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = "#15102a";
    roundRect(ctx, 0, 0, w, h, 24);
    ctx.font = `900 ${h * 0.55}px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.strokeText(word, w / 2, h / 2 + 4);
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(word, w / 2, h / 2 + 4);
  });
}

/** Billboard art: a big coin and a word, bright enough to read at a glance. */
export function billboardTexture(seed: number): THREE.Texture {
  const words = ["SURF!", "RUN!", "COINS", "JUMP!"];
  const colors = ["#ff4d8d", "#1fc2c2", "#ff8a1f", "#8e4de8"];
  return painted(`billboard-${seed % 4}`, 512, 256, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, colors[seed % 4]!);
    bg.addColorStop(1, "#ffd21f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffc629";
    ctx.strokeStyle = "#8a4b00";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w * 0.2, h / 2, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `900 ${h * 0.34}px ${DISPLAY_FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1d1d24";
    ctx.lineWidth = 12;
    ctx.lineJoin = "round";
    ctx.textBaseline = "middle";
    ctx.strokeText(words[seed % 4]!, w * 0.4, h / 2);
    ctx.fillText(words[seed % 4]!, w * 0.4, h / 2);
  });
}

/** Glazed subway tiles with a coloured band, grimy near the floor, for the tunnels. */
export function tunnelTileTexture(): THREE.Texture {
  return painted("tunnel-tiles", 512, 256, (ctx, w, h) => {
    const rng = new Rng(21);
    ctx.fillStyle = "#6f6a60";
    ctx.fillRect(0, 0, w, h);
    const tw = 32;
    const th = 16;
    for (let y = 0; y < h; y += th) {
      for (let x = (y / th) % 2 ? -tw / 2 : 0; x < w; x += tw) {
        const band = y >= h * 0.44 && y < h * 0.56;
        const shade = rng.int(-10, 10);
        ctx.fillStyle = band ? `rgb(${31 + shade},${95 + shade},${214 + shade})` : `rgb(${236 + shade},${230 + shade},${214 + shade})`;
        ctx.fillRect(x + 1, y + 1, tw - 2, th - 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(x + 3, y + 2, tw * 0.4, 2);
      }
    }
    const grime = ctx.createLinearGradient(0, h * 0.6, 0, h);
    grime.addColorStop(0, "rgba(40,32,24,0)");
    grime.addColorStop(1, "rgba(40,32,24,0.55)");
    ctx.fillStyle = grime;
    ctx.fillRect(0, 0, w, h);
  });
}
