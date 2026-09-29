import * as THREE from "three";

/**
 * Raised continents for a gold globe: a map in an equirectangular
 * layout where land is bright and sea darker. Used as both the colour
 * and the bump, so the land stands proud and catches the light. The
 * shapes are rough blobs, a hint of a world rather than an atlas.
 */
export function globeTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#b8862c";
  ctx.fillRect(0, 0, 512, 256);
  // Each land mass as a cluster of overlapping blobs, placed roughly where the real ones are.
  const lands: [number, number, number, number][] = [
    [120, 70, 60, 34], [150, 115, 28, 30], [165, 165, 26, 44], [255, 70, 36, 22],
    [270, 130, 34, 50], [330, 70, 90, 34], [360, 110, 40, 22], [420, 175, 30, 18],
    [95, 45, 34, 14], [300, 40, 50, 10], [390, 140, 16, 20],
  ];
  let s = 7;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  ctx.fillStyle = "#ffe29a";
  for (const [x, y, w, h] of lands) {
    for (let k = 0; k < 16; k++) {
      ctx.beginPath();
      ctx.ellipse(x + (random() - 0.5) * w * 1.3, y + (random() - 0.5) * h * 1.3, w * (0.25 + random() * 0.3), h * (0.25 + random() * 0.3), random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
