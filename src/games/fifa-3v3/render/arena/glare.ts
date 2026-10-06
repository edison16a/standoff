import * as THREE from "three";

/**
 * The glare of a floodlight bank seen by a camera: a hot core, a soft
 * halo, six thin rays like a lens's aperture throws, and a long flat
 * streak across it, as broadcast lenses show a lamp.
 */
export function glareTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.08, "rgba(255,248,235,0.85)");
  halo.addColorStop(0.3, "rgba(255,235,205,0.18)");
  halo.addColorStop(1, "rgba(255,230,200,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate((i * Math.PI) / 3 + 0.3);
    const ray = ctx.createLinearGradient(0, 0, c, 0);
    ray.addColorStop(0, "rgba(255,245,230,0.5)");
    ray.addColorStop(1, "rgba(255,245,230,0)");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(0, -2.5);
    ctx.lineTo(c, 0);
    ctx.lineTo(0, 2.5);
    ctx.fill();
    ctx.restore();
  }
  const streak = ctx.createLinearGradient(0, 0, size, 0);
  streak.addColorStop(0, "rgba(200,220,255,0)");
  streak.addColorStop(0.5, "rgba(220,235,255,0.55)");
  streak.addColorStop(1, "rgba(200,220,255,0)");
  ctx.fillStyle = streak;
  ctx.fillRect(0, c - 2, size, 4);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * How strongly a lamp facing `facing` glares into a camera looking from
 * `toCamera` (both unit vectors from the lamp): nothing from behind or
 * the side, rising steeply as the camera comes into the beam.
 */
export function glareStrength(facing: THREE.Vector3, toCamera: THREE.Vector3): number {
  const d = facing.dot(toCamera);
  return d <= 0.2 ? 0 : Math.min(1, ((d - 0.2) / 0.8) ** 2.2 * 1.6);
}
