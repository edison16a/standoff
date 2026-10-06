import * as THREE from "three";
import { Rng } from "../../engine/rng";

/** The tile is this many metres square on the turf. */
export const GRASS_TILE = 0.5;
const PX = 512;

/**
 * Half a metre of turf seen from above, a millimetre a pixel: a dark
 * thatch underneath and thousands of blades over it, each a tapered
 * stroke in its own green, most leaning the way the mower laid them.
 * It tiles, so a blade that runs off one edge comes back on the other.
 * Its average is about 0.62, which the turf's shader divides back out.
 */
export function grassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PX;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(92,104,70)";
  ctx.fillRect(0, 0, PX, PX);
  const rng = new Rng(17);
  const blade = (x: number, y: number, length: number, lean: number, width: number, shade: number) => {
    const tipX = x + Math.sin(lean) * length;
    const tipY = y - Math.cos(lean) * length;
    const g = Math.round(150 + shade * 90);
    ctx.fillStyle = `rgb(${Math.round(g * 0.78)},${g},${Math.round(g * 0.6)})`;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.quadraticCurveTo((x + tipX) / 2 + lean * 3, (y + tipY) / 2, tipX, tipY);
    ctx.lineTo(x + width / 2, y);
    ctx.closePath();
    ctx.fill();
  };
  for (let i = 0; i < 9000; i++) {
    const x = rng.next() * PX;
    const y = rng.next() * PX;
    const length = 10 + rng.next() * 22;
    const lean = rng.range(-0.5, 0.5) + 0.25;
    const width = 1.6 + rng.next() * 1.8;
    const shade = rng.next() * rng.next();
    // Each blade is drawn again a tile over wherever it would cross an edge, so the tile has no seam.
    for (const dx of [-PX, 0, PX]) for (const dy of [-PX, 0, PX]) if (x + dx > -40 && x + dx < PX + 40 && y + dy > -40 && y + dy < PX + 40) blade(x + dx, y + dy, length, lean, width, shade);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
