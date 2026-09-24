import * as THREE from "three";

/**
 * Every texture in the booth is painted on a canvas at start up, so the
 * game ships no image files and each looks crisp at any size.
 */

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available.");
  return [element, ctx];
}

function finish(element: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A small seeded noise, so the painted grain looks the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Red and cream awning stripes, one pair per texture repeat. A faint weave
 * and a soft shade toward each seam make it read as canvas cloth.
 */
export function stripeTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 256);
  const colours = ["#c8142f", "#f1e7d3"];
  colours.forEach((colour, i) => {
    const x = i * 128;
    const shade = ctx.createLinearGradient(x, 0, x + 128, 0);
    shade.addColorStop(0, colour);
    shade.addColorStop(0.5, colour);
    shade.addColorStop(1, i === 0 ? "#a80f27" : "#dcd0b8");
    ctx.fillStyle = shade;
    ctx.fillRect(x, 0, 128, 256);
  });
  const random = seeded(7);
  ctx.globalAlpha = 0.03;
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = random() > 0.5 ? "#000" : "#fff";
    ctx.fillRect(0, y, 256, 1);
  }
  ctx.globalAlpha = 1;
  return finish(element, true);
}

/**
 * Long wood grain in greys, meant to be tinted by a material colour. The
 * streaks run along the texture's x axis. Every streak waves a whole
 * number of times across the width and wraps top to bottom, so the
 * texture tiles without a seam. `strength` below 1 gives a faint grain
 * under paint, and bare wood gets knots as well.
 */
export function grainTexture(seed = 3, strength = 1): THREE.CanvasTexture {
  const [element, ctx] = canvas(512, 128);
  const base = Math.round(255 - 38 * strength);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, 512, 128);
  const random = seeded(seed);
  // One slow sway shared by every streak keeps them flowing side by side, as real grain does.
  const sway = random() * Math.PI * 2;
  for (let i = 0; i < 70; i++) {
    const y = random() * 128;
    const amp = 0.5 + random() * 1.5;
    const cycles = 2 + Math.floor(random() * 3);
    const phase = random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(${random() > 0.5 ? "70,50,40" : "255,245,230"},${(0.08 + random() * 0.2) * strength})`;
    ctx.lineWidth = 0.6 + random() * 2.2;
    for (const wrap of [-128, 0, 128]) {
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const u = (x / 512) * Math.PI * 2;
        ctx.lineTo(x, wrap + y + Math.sin(u + sway) * 6 + Math.sin(u * cycles + phase) * amp);
      }
      ctx.stroke();
    }
  }
  if (strength < 1) return finish(element, true);
  // A couple of knots, kept clear of the edges so they never cross a seam.
  for (let k = 0; k < 2; k++) {
    const x = 60 + random() * 390;
    const y = 20 + random() * 88;
    for (let r = 10; r > 1; r -= 2.5) {
      ctx.strokeStyle = `rgba(60,40,30,${0.12 + (10 - r) * 0.02})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 2.2, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return finish(element, true);
}

/** Red and white rings with a dark centre, like the cover's targets. */
export function bullseyeTexture(rings = 5): THREE.CanvasTexture {
  const [element, ctx] = canvas(512, 512);
  const c = 256;
  for (let i = 0; i < rings; i++) {
    const r = 256 * (1 - i / rings);
    ctx.fillStyle = i % 2 === 0 ? "#d91a2a" : "#f7f1e6";
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#2b0c10";
  ctx.beginPath();
  ctx.arc(c, c, 256 / rings / 2.4, 0, Math.PI * 2);
  ctx.fill();
  // A worn edge on each ring, since these have been shot at for years.
  const random = seeded(11);
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = random() > 0.5 ? "#000" : "#fff";
    ctx.fillRect(random() * 512, random() * 512, 2 + random() * 5, 1 + random() * 2);
  }
  ctx.globalAlpha = 1;
  return finish(element);
}

/** A soft round glow for bulbs, laser dots and puffs, white so it can be tinted. */
export function glowTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return finish(element);
}

/** A lumpy cloud of smoke, white so it can be tinted. */
export function puffTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(128, 128);
  const random = seeded(5);
  for (let i = 0; i < 14; i++) {
    const x = 40 + random() * 48;
    const y = 40 + random() * 48;
    const r = 14 + random() * 22;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  return finish(element);
}

/** Candy stripes wound round a post: diagonal red and cream bands that tile. */
export function spiralTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(128, 128);
  ctx.fillStyle = "#f1e7d3";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#c8142f";
  for (let i = -2; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 64, 128);
    ctx.lineTo(i * 64 + 32, 128);
    ctx.lineTo(i * 64 + 32 + 128, 0);
    ctx.lineTo(i * 64 + 128, 0);
    ctx.closePath();
    ctx.fill();
  }
  return finish(element, true);
}

/** A dark pock mark with a lighter lip, left where a BB strikes. */
export function dentTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(64, 64);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(20,10,8,0.95)");
  gradient.addColorStop(0.35, "rgba(40,25,20,0.8)");
  gradient.addColorStop(0.55, "rgba(255,240,220,0.25)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return finish(element);
}
