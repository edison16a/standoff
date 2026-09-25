import type * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";
import { roundRect } from "./train-art";

const NEON = ["#ff2bd6", "#21f3ff", "#ffd21f", "#9dff2b", "#8a5bff"];

/**
 * The far city: towers in silhouette with lit windows, antenna lamps and
 * the odd neon crown, on a strip that wraps round the horizon. White and
 * black only where it matters, so the sky tints it with the zone.
 */
export function skylineTexture(): THREE.Texture {
  return painted("skyline", 2048, 256, (ctx, w, h) => {
    const rng = new Rng(41);
    ctx.clearRect(0, 0, w, h);
    for (const layer of [0, 1]) {
      let x = -20;
      while (x < w) {
        const tw = rng.range(36, 110) * (layer ? 1 : 0.8);
        const th = h * (layer ? rng.range(0.25, 0.7) : rng.range(0.45, 0.95));
        ctx.fillStyle = layer ? "#0b0a1c" : "#16132e";
        ctx.fillRect(x, h - th, tw, th);
        if (rng.chance(0.3)) ctx.fillRect(x + tw * 0.4, h - th - 18, 3, 18);
        // Rows of windows, a few lit warm and a few cool.
        for (let y = h - th + 8; y < h - 6; y += 9) {
          for (let wx = x + 5; wx < x + tw - 6; wx += 8) {
            if (!rng.chance(layer ? 0.22 : 0.12)) continue;
            ctx.fillStyle = rng.chance(0.7) ? "rgba(255,214,150,0.9)" : "rgba(150,230,255,0.9)";
            ctx.fillRect(wx, y, 3, 4);
          }
        }
        if (rng.chance(0.35)) {
          ctx.fillStyle = NEON[rng.int(0, NEON.length - 1)]!;
          ctx.fillRect(x + 3, h - th, tw - 6, 3);
        }
        x += tw + rng.range(2, 14);
      }
    }
    // Wrapped round the sky, the two ends meet: they fade to the same dark so the seam never shows.
    ctx.fillStyle = "#0b0a1c";
    ctx.fillRect(0, h - 10, w, 10);
  });
}

/** A block of flats at night: dark, with rows of windows, a few lit warm or blue from a screen. */
export function nightWindowsTexture(tint: string, seed: number): THREE.Texture {
  return painted(`night-windows-${tint}-${seed}`, 256, 512, (ctx, w, h) => {
    const rng = new Rng(seed * 7 + 3);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    const cols = 4;
    const rows = 9;
    const cw = w / cols;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.18;
        const y = r * rh + rh * 0.2;
        const lit = rng.chance(0.4);
        ctx.fillStyle = lit ? (rng.chance(0.75) ? "#ffd48a" : "#8fe8ff") : "#0a0916";
        ctx.fillRect(x, y, cw * 0.64, rh * 0.58);
        if (lit) {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(x, y + rh * 0.4, cw * 0.64, rh * 0.18);
        }
      }
    }
  });
}

/** A hologram's picture: bold white shapes the shader tints and makes flicker. */
export function holoArtTexture(kind: number): THREE.Texture {
  const words = ["RUN", "NEO", "SURF", "24/7"];
  return painted(`holo-${kind % 4}`, 512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.lineWidth = 16;
    ctx.beginPath();
    if (kind % 2 === 0) {
      // A coin, big and round, spinning in the light.
      ctx.arc(w / 2, h * 0.4, w * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `900 ${h * 0.22}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", w / 2, h * 0.41);
    } else {
      // A sneaker in outline, the city's favourite advert.
      ctx.moveTo(w * 0.2, h * 0.5);
      ctx.lineTo(w * 0.3, h * 0.26);
      ctx.lineTo(w * 0.48, h * 0.3);
      ctx.lineTo(w * 0.8, h * 0.45);
      ctx.lineTo(w * 0.82, h * 0.55);
      ctx.lineTo(w * 0.2, h * 0.55);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.font = `900 ${h * 0.2}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(words[kind % 4]!, w / 2, h * 0.78);
  });
}

/** Wet asphalt between the tracks: dark, with a few puddles that shine. */
export function wetGroundTexture(): THREE.Texture {
  return painted(
    "wet-ground",
    256,
    256,
    (ctx, w, h) => {
      const rng = new Rng(19);
      ctx.fillStyle = "#23202e";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        const shade = rng.int(20, 70);
        ctx.fillStyle = `rgb(${shade},${shade - 4},${shade + 12})`;
        const r = rng.range(1, 3.2);
        ctx.beginPath();
        ctx.ellipse(rng.range(0, w), rng.range(0, h), r, r * 0.8, rng.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(10,8,20,0.55)";
      for (let i = 0; i < 6; i++) roundRect(ctx, rng.range(0, w), rng.range(0, h), rng.range(30, 70), rng.range(12, 30), 12);
    },
    true,
  );
}
