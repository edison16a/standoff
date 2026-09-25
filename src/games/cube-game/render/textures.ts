import * as THREE from "three";

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = element.height = size;
  return [element, element.getContext("2d")!];
}

function texture(element: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(element);
  if (srgb) map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;

/**
 * The cube's face, in the spirit of the original icon: a bold outer frame,
 * an inner square, and two eyes. `glow` draws only the bright parts, for
 * the emissive map, so the lines light up while the body stays solid.
 */
export function cubeFace(main: number, trim: number, glow: boolean): THREE.CanvasTexture {
  const [element, g] = canvas(256);
  // The glow map lights the body softly and the trim fully, so the face reads before it blooms.
  g.fillStyle = css(main);
  g.globalAlpha = glow ? 0.5 : 1;
  g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 1;
  g.strokeStyle = "#10091f";
  g.lineWidth = 14;
  g.strokeRect(7, 7, 242, 242);
  g.strokeStyle = css(trim);
  g.lineWidth = 12;
  g.strokeRect(22, 22, 212, 212);
  // The inner square in the trim colour, with the face on it, like the original icon.
  g.fillStyle = "#10091f";
  g.fillRect(74, 74, 108, 108);
  g.fillStyle = css(trim);
  g.fillRect(82, 82, 92, 92);
  g.fillStyle = "#10091f";
  g.fillRect(100, 104, 16, 26);
  g.fillRect(140, 104, 16, 26);
  g.fillRect(98, 146, 60, 10);
  return texture(element);
}

/**
 * The ball's skin: bold wedges in the two colours split by dark seams,
 * so its roll is easy to see and it keeps its shape against a bright sky.
 * `glow` lights the trim fully and the body softly, as on the cube.
 */
export function ballSkin(main: number, trim: number, glow: boolean): THREE.CanvasTexture {
  const [element, g] = canvas(256);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = css(i % 2 ? trim : main);
    g.globalAlpha = glow ? (i % 2 ? 1 : 0.35) : 1;
    g.fillRect(i * 64, 0, 64, 256);
  }
  g.globalAlpha = 1;
  g.fillStyle = "#10091f";
  for (let i = 0; i < 4; i++) g.fillRect(i * 64 - 5, 0, 10, 256);
  g.fillRect(0, 120, 256, 16);
  g.fillRect(0, 0, 256, 10);
  g.fillRect(0, 246, 256, 10);
  return texture(element);
}

/** A soft round light, for halos, sparks and the sun's glow. */
export function glowSprite(): THREE.CanvasTexture {
  const [element, g] = canvas(128);
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return texture(element, false);
}

/** Words drawn into a texture, for the attempt counter floating in the level. */
export function wordsTexture(text: string, colour = "#ffffff"): THREE.CanvasTexture {
  const element = document.createElement("canvas");
  element.width = 1024;
  element.height = 192;
  const g = element.getContext("2d")!;
  g.font = "900 120px 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 18;
  g.strokeStyle = "rgba(10,4,30,0.9)";
  g.strokeText(text, 512, 100);
  g.fillStyle = colour;
  g.fillText(text, 512, 100);
  return texture(element);
}
