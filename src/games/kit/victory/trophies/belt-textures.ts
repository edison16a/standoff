import * as THREE from "three";

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  return ctx ? [c, ctx] : null;
}

/**
 * Draws the strap's leather: a grain of fine creases and a row of
 * stitches along each edge. `paint` false draws it in greys for the bump
 * map; true draws it in the leather's colour with gold thread, since a
 * tint on the whole map would darken the thread along with the leather.
 */
function drawLeather(ctx: CanvasRenderingContext2D, colour: string, paint: boolean): void {
  ctx.fillStyle = paint ? colour : "#cfcfcf";
  ctx.fillRect(0, 0, 1024, 128);
  let s = 5;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  // Grain: many short faint creases, darker or lighter than the leather.
  for (let i = 0; i < 2400; i++) {
    const v = paint ? (random() < 0.5 ? 0 : 255) : 170 + random() * 70;
    ctx.strokeStyle = `rgba(${v},${v},${v},${paint ? 0.08 : 0.5})`;
    ctx.lineWidth = 1;
    const x = random() * 1024;
    const y = random() * 128;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 10, y + (random() - 0.5) * 4);
    ctx.stroke();
  }
  // Stitches: a dashed thread in a pressed groove near each edge.
  for (const y of [14, 114]) {
    ctx.fillStyle = paint ? "rgba(0,0,0,0.35)" : "#6a6a6a";
    ctx.fillRect(0, y - 3, 1024, 6);
    ctx.fillStyle = paint ? "#d9b45a" : "#ffffff";
    for (let x = 4; x < 1024; x += 16) ctx.fillRect(x, y - 2, 10, 4);
  }
}

/**
 * The strap's leather in `colour` with gold stitching, and a matching
 * bump map in greys. Null where there is no document.
 */
export function leatherTextures(colour: string): { map: THREE.Texture; bump: THREE.Texture } | null {
  const painted = canvas(1024, 128);
  const grey = canvas(1024, 128);
  if (!painted || !grey) return null;
  drawLeather(painted[1], colour, true);
  drawLeather(grey[1], colour, false);
  const map = new THREE.CanvasTexture(painted[0]);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(grey[0]);
  for (const texture of [map, bump]) texture.wrapS = THREE.RepeatWrapping;
  return { map, bump };
}

/** A banner's lettering: gold capitals on dark enamel. */
export function bannerTexture(title: string, enamel: string): THREE.Texture | null {
  const made = canvas(512, 96);
  if (!made) return null;
  const [c, ctx] = made;
  ctx.fillStyle = enamel;
  ctx.fillRect(0, 0, 512, 96);
  const gradient = ctx.createLinearGradient(0, 18, 0, 78);
  gradient.addColorStop(0, "#fff3c4");
  gradient.addColorStop(0.5, "#f2c14e");
  gradient.addColorStop(1, "#b07a1c");
  ctx.fillStyle = gradient;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 62;
  ctx.font = `900 ${size}px Georgia, 'Times New Roman', serif`;
  while (ctx.measureText(title).width > 470 && size > 20) ctx.font = `900 ${(size -= 2)}px Georgia, 'Times New Roman', serif`;
  ctx.fillText(title, 256, 52);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
