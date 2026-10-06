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

/**
 * Net mesh: a knotted cord in 12 centimetre squares when tiled, a little
 * thicker at each knot, with soft edges so the mipmaps keep the cords
 * as the net recedes.
 */
export function netTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvasOf(128, 128);
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 7;
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(128, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 128);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,1)";
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = texture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
