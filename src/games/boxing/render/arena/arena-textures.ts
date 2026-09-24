import * as THREE from "three";
import { seeded } from "../../engine/random";

/**
 * The arena's printed surfaces, drawn on canvases at load: the branded
 * canvas mat, the apron's banner, the corner pads and the ringside LED
 * boards. Seeded, so the showcase draws them the same every time.
 */

export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export const BRAND = { purple: "#9b45f0", blue: "#233b82", navy: "#101a3c", red: "#d7263d", corner: "#1e63d6", gold: "#f5c542" };

function wordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, glow: string): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `italic 900 ${size}px Impact, 'Arial Black', sans-serif`;
  ctx.shadowColor = glow;
  ctx.shadowBlur = size * 0.25;
  ctx.fillStyle = fill;
  ctx.fillText("STANDOFF", x, y);
  ctx.restore();
}

/** The canvas the boxers stand on: the logo in the middle, corner colours, and the wear of a fight night. */
export function matTexture(): THREE.CanvasTexture {
  const S = 2048;
  const random = seeded(4242);
  return paint(S, S, (ctx) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.7);
    g.addColorStop(0, "#34509c");
    g.addColorStop(1, BRAND.blue);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // Weave and scuffs.
    for (let i = 0; i < 60000; i++) {
      ctx.fillStyle = random() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(random() * S, random() * S, 2 + random() * 3, 2);
    }
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.02 + random() * 0.04})`;
      ctx.lineWidth = 6 + random() * 20;
      ctx.beginPath();
      const x = S * 0.2 + random() * S * 0.6;
      const y = S * 0.2 + random() * S * 0.6;
      ctx.arc(x, y, 30 + random() * 90, random() * 6, random() * 6 + 1.5);
      ctx.stroke();
    }
    // The apron outside the ropes is dark, with the ring's name round it.
    const edge = S * 0.06;
    ctx.fillStyle = BRAND.navy;
    ctx.fillRect(0, 0, S, edge);
    ctx.fillRect(0, S - edge, S, edge);
    ctx.fillRect(0, 0, edge, S);
    ctx.fillRect(S - edge, 0, edge, S);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 10;
    ctx.strokeRect(edge, edge, S - 2 * edge, S - 2 * edge);
    // Red and blue corner triangles.
    const tri = (x: number, y: number, dx: number, dy: number, colour: string) => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * 300, y);
      ctx.lineTo(x, y + dy * 300);
      ctx.closePath();
      ctx.fill();
    };
    tri(edge, edge, 1, 1, BRAND.red);
    tri(S - edge, S - edge, -1, -1, BRAND.corner);
    // The logo, big enough to read from any camera.
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.fillStyle = "rgba(10,14,40,0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = BRAND.purple;
    ctx.stroke();
    wordmark(ctx, 0, -30, 250, "#ffffff", BRAND.purple);
    ctx.font = "900 110px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = BRAND.gold;
    ctx.fillText("BOXING", 0, 150);
    ctx.restore();
  });
}

/** The skirt hanging from the ring's edge to the floor. Repeats round all four sides. */
export function apronTexture(): THREE.CanvasTexture {
  const texture = paint(1024, 256, (ctx) => {
    ctx.fillStyle = "#07080f";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = BRAND.purple;
    ctx.fillRect(0, 0, 1024, 14);
    ctx.fillRect(0, 242, 1024, 14);
    wordmark(ctx, 300, 128, 130, "#ffffff", BRAND.purple);
    ctx.font = "900 70px Impact, 'Arial Black', sans-serif";
    ctx.fillStyle = BRAND.gold;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FIGHT NIGHT", 780, 132);
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** A corner pad: the corner's colour with the logo down it. */
export function padTexture(colour: string): THREE.CanvasTexture {
  return paint(128, 512, (ctx) => {
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 128, 512);
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, "rgba(0,0,0,0.25)");
    g.addColorStop(0.5, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 512);
    ctx.save();
    ctx.translate(64, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "italic 900 58px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colour === "#f4f4f4" ? BRAND.navy : "#ffffff";
    ctx.fillText("STANDOFF", 0, 0);
    ctx.restore();
  });
}

/** The glowing boards round the ringside. */
export function ledTexture(): THREE.CanvasTexture {
  const texture = paint(1024, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 1024, 0);
    g.addColorStop(0, "#2a0a52");
    g.addColorStop(0.5, "#5b1aa8");
    g.addColorStop(1, "#2a0a52");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 128);
    wordmark(ctx, 256, 66, 84, "#ffffff", "#e0b0ff");
    ctx.font = "900 60px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = BRAND.gold;
    ctx.fillText("CHAMPIONSHIP BOXING", 700, 68);
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** A soft round glow, for lamp faces, flashes and sparks. */
export function glowTexture(): THREE.CanvasTexture {
  return paint(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}
