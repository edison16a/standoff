import type * as THREE from "three";

/**
 * Bakes soft shade into the vertex colours: undersides and parts low by
 * the road darken, the way they would in the shadow of the kart itself.
 * Cheap stand in for ambient occlusion that grounds the kart and gives
 * the bodywork depth. Glowing parts are left alone.
 */
export function bakeOcclusion(g: THREE.BufferGeometry, floor = 0, strength = 1): THREE.BufferGeometry {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const col = g.getAttribute("color") as THREE.BufferAttribute;
  const fin = g.getAttribute("finish");
  for (let i = 0; i < pos.count; i++) {
    if (fin && fin.getW(i) > 0) continue;
    const facing = Math.min(1, Math.max(0, nor.getY(i) * 0.5 + 0.62));
    const height = Math.min(1, Math.max(0, (pos.getY(i) - floor) / 0.55));
    const shade = 1 - strength * (1 - (0.55 + 0.45 * facing) * (0.72 + 0.28 * height));
    col.setXYZ(i, col.getX(i) * shade, col.getY(i) * shade, col.getZ(i) * shade);
  }
  return g;
}
