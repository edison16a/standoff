import * as THREE from "three";
import { FIELD, PIECES } from "../engine/arena";
import { FIELD_COLOURS as C } from "./palette";

/**
 * Textures drawn in code, once. The turf is one big canvas covering the
 * field and its margins, with the mowing stripes, the lines and the scuffs
 * worn in around the bunkers where players dig in.
 */

/** The ground the turf texture covers, in metres, centred on the field. */
export const GROUND = { halfWidth: FIELD.halfWidth + 5, halfLength: FIELD.halfLength + 5 } as const;

const PX = 22;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/** A small seeded random source, so the turf looks the same every run. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function turfTexture(): THREE.CanvasTexture {
  const w = GROUND.halfWidth * 2 * PX;
  const h = GROUND.halfLength * 2 * PX;
  const [c, ctx] = canvas(w, h);
  const rand = seeded(7);
  // Metres to canvas pixels: x across, z down the canvas.
  const X = (x: number) => (x + GROUND.halfWidth) * PX;
  const Z = (z: number) => (z + GROUND.halfLength) * PX;
  ctx.fillStyle = C.turf;
  ctx.fillRect(0, 0, w, h);
  // Mowing stripes across the field, 3 m wide.
  for (let z = -GROUND.halfLength, i = 0; z < GROUND.halfLength; z += 3, i++) {
    ctx.fillStyle = i % 2 ? C.turfLight : C.turf;
    ctx.fillRect(0, Z(z), w, 3 * PX);
  }
  // Blades of grass as fine specks of light and shade.
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,30,0,0.08)";
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 3);
  }
  // Worn patches where fighters crouch behind cover.
  for (const p of PIECES) {
    const r = (p.shape.type === "circle" ? p.shape.r : Math.max(p.shape.hw, p.shape.hd)) + 0.9;
    const g = ctx.createRadialGradient(X(p.x), Z(p.z), r * PX * 0.3, X(p.x), Z(p.z), r * PX);
    g.addColorStop(0, "rgba(96,86,50,0.35)");
    g.addColorStop(1, "rgba(96,86,50,0)");
    ctx.fillStyle = g;
    ctx.fillRect(X(p.x) - r * PX, Z(p.z) - r * PX, r * 2 * PX, r * 2 * PX);
  }
  // The lines: the boundary, the centre line and a dashed line at each end's base.
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 0.14 * PX;
  ctx.strokeRect(X(-FIELD.halfWidth), Z(-FIELD.halfLength), FIELD.halfWidth * 2 * PX, FIELD.halfLength * 2 * PX);
  ctx.beginPath();
  ctx.moveTo(X(-FIELD.halfWidth), Z(0));
  ctx.lineTo(X(FIELD.halfWidth), Z(0));
  ctx.stroke();
  ctx.setLineDash([0.8 * PX, 0.6 * PX]);
  for (const z of [-22, 22]) {
    ctx.beginPath();
    ctx.moveTo(X(-FIELD.halfWidth), Z(z));
    ctx.lineTo(X(FIELD.halfWidth), Z(z));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(X(0), Z(0), 3.2 * PX, 0, Math.PI * 2);
  ctx.stroke();
  // Paint splats from old games, in both team colours and the field's lime.
  const splats = ["rgba(255,63,200,0.5)", "rgba(22,217,255,0.5)", "rgba(184,244,0,0.45)"];
  for (let i = 0; i < 140; i++) {
    const x = X((rand() * 2 - 1) * FIELD.halfWidth);
    const z = Z((rand() * 2 - 1) * FIELD.halfLength);
    ctx.fillStyle = splats[i % 3]!;
    splat(ctx, x, z, (0.12 + rand() * 0.25) * PX, rand);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A blob with a few drops thrown out round it. */
export function splat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rand: () => number): void {
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = r * (0.75 + rand() * 0.5);
    if (i === 0) ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    else ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2;
    const d = r * (1.3 + rand() * 1.4);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + rand() * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The mesh of the boundary nets: thin dark strings on clear, tiled. */
export function netTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  ctx.strokeStyle = "rgba(20,24,30,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** A soft round dot, for particles and glows. */
export function dotTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** A white paint splat on clear, tinted per use. */
export function splatTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = "#ffffff";
  splat(ctx, 64, 64, 26, seeded(3));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A four pointed muzzle flash: a hot core with spikes. */
export function flashTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 40);
  g.addColorStop(0, "rgba(255,255,240,1)");
  g.addColorStop(0.3, "rgba(255,210,120,0.9)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(255,236,190,0.9)";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const len = i % 2 ? 60 : 44;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a - 0.12) * 8, 64 + Math.sin(a - 0.12) * 8);
    ctx.lineTo(64 + Math.cos(a) * len, 64 + Math.sin(a) * len);
    ctx.lineTo(64 + Math.cos(a + 0.12) * 8, 64 + Math.sin(a + 0.12) * 8);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}
