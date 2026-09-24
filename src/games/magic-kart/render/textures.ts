import * as THREE from "three";
import type { Theme } from "./themes";

/**
 * Textures drawn at load time on a canvas, so the game ships no images:
 * the tarmac with its painted lines, the chequered start line, the
 * chevron boards and arrows, the cube faces and a few soft sprites.
 */

function canvas(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Tarmac, one tile covering the road's full width and 16 metres of length. */
export function roadTexture(theme: Theme): THREE.CanvasTexture {
  const texture = canvas(256, 512, (ctx) => {
    ctx.fillStyle = theme.road;
    ctx.fillRect(0, 0, 256, 512);
    // Speckles give the surface grain, so speed reads even on a straight.
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? theme.roadSpeckle : "rgba(0,0,0,0.12)";
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
    }
    ctx.fillStyle = theme.line;
    ctx.fillRect(8, 0, 7, 512);
    ctx.fillRect(241, 0, 7, 512);
    ctx.fillStyle = theme.centre;
    ctx.fillRect(124, 0, 8, 190);
    ctx.fillRect(124, 256, 8, 190);
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function checkerTexture(): THREE.CanvasTexture {
  const texture = canvas(128, 32, (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 4; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#16161c";
        ctx.fillRect(x * 8, y * 8, 8, 8);
      }
    }
  });
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

/** Three chevrons pointing right. Flipped in the mesh for left hand bends. */
export function chevronTexture(theme: Theme): THREE.CanvasTexture {
  return canvas(256, 128, (ctx) => {
    ctx.fillStyle = theme.sign;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = theme.signInk;
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * 64;
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x + 40, 64);
      ctx.lineTo(x, 112);
      ctx.lineTo(x + 20, 112);
      ctx.lineTo(x + 60, 64);
      ctx.lineTo(x + 20, 16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = theme.signInk;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
  });
}

/**
 * A painted arrow bending right, laid on the road before a corner. A
 * decal lying flat and facing along the road shows the canvas upside
 * down and mirrored, so it is drawn turned half a circle.
 */
export function arrowTexture(color: string): THREE.CanvasTexture {
  return canvas(128, 256, (ctx) => {
    ctx.translate(128, 256);
    ctx.rotate(Math.PI);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(52, 246);
    ctx.lineTo(52, 130);
    ctx.quadraticCurveTo(52, 80, 88, 70);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(78, 22);
    ctx.lineTo(124, 70);
    ctx.lineTo(78, 118);
    ctx.closePath();
    ctx.fill();
  });
}

/** Chevrons for a boost pad, scrolled along to look like they rush forward. */
export function padTexture(color: string): THREE.CanvasTexture {
  const texture = canvas(128, 128, (ctx) => {
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(14, 20);
    ctx.lineTo(64, 70);
    ctx.lineTo(114, 20);
    ctx.lineTo(114, 52);
    ctx.lineTo(64, 102);
    ctx.lineTo(14, 52);
    ctx.closePath();
    ctx.fill();
  });
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** One face of a power up cube: a glassy frame with a white star in the middle. */
export function cubeFaceTexture(): THREE.CanvasTexture {
  return canvas(128, 128, (ctx) => {
    const glass = ctx.createRadialGradient(64, 64, 10, 64, 64, 90);
    glass.addColorStop(0, "rgba(255,255,255,0.25)");
    glass.addColorStop(1, "rgba(255,255,255,0.55)");
    ctx.fillStyle = glass;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 40 : 17;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** Soft round sprite for particles, shadows and glows. */
export function softDot(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)"): THREE.CanvasTexture {
  return canvas(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}
