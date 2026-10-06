import * as THREE from "three";

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")!];
}

function texture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A soft round blob, for shadows under players and the glow round lamps. */
export function blobTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvasOf(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return texture(canvas);
}

/** Net mesh: white cords on a clear background, in 12 centimetre squares when tiled. */
export function netTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvasOf(64, 64);
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 64, 64);
  const t = texture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
