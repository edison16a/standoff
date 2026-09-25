import * as THREE from "three";

/**
 * Small canvas textures for the glowing effects, drawn once in white so
 * each effect tints them its own colour.
 */

function draw(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  paint(c.getContext("2d")!, size);
  return new THREE.CanvasTexture(c);
}

/** A soft round dot, for particles. */
export function dotTexture(): THREE.CanvasTexture {
  return draw(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** A spiky comic book impact star with a hot centre. */
export function starTexture(): THREE.CanvasTexture {
  return draw(256, (ctx, s) => {
    const c = s / 2;
    ctx.translate(c, c);
    ctx.beginPath();
    const points = 10;
    for (let i = 0; i <= points * 2; i++) {
      const r = i % 2 === 0 ? c * (i % 4 === 0 ? 0.98 : 0.78) : c * 0.3;
      const a = (i / (points * 2)) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.5);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-c, -c, s, s);
  });
}

/** A thin bright ring, for shockwaves. */
export function ringTexture(): THREE.CanvasTexture {
  return draw(256, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, c * 0.62, c, c, c);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.55, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** A beam that is brightest at its left end and fades out to the right, soft at the sides. */
export function beamTexture(): THREE.CanvasTexture {
  return draw(256, (ctx, s) => {
    const along = ctx.createLinearGradient(0, 0, s, 0);
    along.addColorStop(0, "rgba(255,255,255,1)");
    along.addColorStop(0.3, "rgba(255,255,255,0.75)");
    along.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, s, s);
    // Fade the long edges, so the beam reads as light and not a strip.
    ctx.globalCompositeOperation = "destination-in";
    const across = ctx.createLinearGradient(0, 0, 0, s);
    across.addColorStop(0, "rgba(0,0,0,0)");
    across.addColorStop(0.5, "rgba(0,0,0,1)");
    across.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, s, s);
  });
}

/** A soft dark disc, for the shadows under the fighters. */
export function blobTexture(): THREE.CanvasTexture {
  return draw(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.6)");
    g.addColorStop(0.6, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** A ray of light: bright all along with soft edges, fading only at its far end. */
export function rayTexture(): THREE.CanvasTexture {
  return draw(128, (ctx, s) => {
    const along = ctx.createLinearGradient(0, 0, s, 0);
    along.addColorStop(0, "rgba(255,255,255,1)");
    along.addColorStop(0.82, "rgba(255,255,255,0.95)");
    along.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, s, s);
    ctx.globalCompositeOperation = "destination-in";
    const across = ctx.createLinearGradient(0, 0, 0, s);
    across.addColorStop(0, "rgba(0,0,0,0)");
    across.addColorStop(0.35, "rgba(0,0,0,0.9)");
    across.addColorStop(0.5, "rgba(0,0,0,1)");
    across.addColorStop(0.65, "rgba(0,0,0,0.9)");
    across.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, s, s);
  });
}

/** Solid at the bottom and fading upward, for energy rising off the floor. */
export function riseTexture(): THREE.CanvasTexture {
  return draw(64, (ctx, s) => {
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.6, "rgba(255,255,255,0.75)");
    g.addColorStop(1, "rgba(255,255,255,0.2)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}
