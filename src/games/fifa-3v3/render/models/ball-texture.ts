import * as THREE from "three";

/**
 * The classic ball: twelve black pentagons and twenty white hexagons,
 * painted texel by texel from the directions of an icosahedron's corners
 * (the pentagons) and a dodecahedron's (the hexagons), with dark seams
 * where two panels meet.
 */
export function panelTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(w, h);
  const icosahedron = new THREE.IcosahedronGeometry(1, 0);
  const corners = icosahedron.getAttribute("position");
  const centres: { v: THREE.Vector3; pent: boolean }[] = [];
  const add = (v: THREE.Vector3, pent: boolean) => {
    if (!centres.some((c) => c.v.distanceTo(v) < 1e-3)) centres.push({ v: v.normalize(), pent });
  };
  const at = (i: number) => new THREE.Vector3(corners.getX(i), corners.getY(i), corners.getZ(i));
  // Pentagons sit on the corners, hexagons on the middle of each triangular face.
  for (let i = 0; i < corners.count; i++) add(at(i), true);
  for (let i = 0; i < corners.count; i += 3) add(at(i).add(at(i + 1)).add(at(i + 2)), false);
  icosahedron.dispose();
  const dir = new THREE.Vector3();
  for (let y = 0; y < h; y++) {
    const theta = (y / h) * Math.PI;
    for (let x = 0; x < w; x++) {
      const phi = (x / w) * Math.PI * 2;
      dir.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      let best = -2;
      let second = -2;
      let pent = false;
      for (const c of centres) {
        const d = c.v.dot(dir);
        if (d > best) {
          second = best;
          best = d;
          pent = c.pent;
        } else if (d > second) second = d;
      }
      const seam = best - second < 0.012;
      const shade = seam ? 60 : pent ? 22 : 246;
      const i = (y * w + x) * 4;
      image.data[i] = shade;
      image.data[i + 1] = shade;
      image.data[i + 2] = seam ? 70 : pent ? 30 : 250;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
