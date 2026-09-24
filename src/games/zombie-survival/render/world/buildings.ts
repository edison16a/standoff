import * as THREE from "three";
import type { SegmentKit } from "./segment-kit";

const SHOP_SIGNS = [0xff3a5a, 0x3affc8, 0xffc23a, 0x6a8aff];

/**
 * One city building: a textured block with a shop front at street level,
 * an awning, a parapet and some roof clutter. `face` is +1 when its
 * front looks toward +x.
 */
export function building(kit: SegmentKit, side: number, along: number, w: number, d: number, h: number, face: 1 | -1): void {
  const { b, m, rand } = kit;
  const mat = m.facades[Math.floor(rand() * m.facades.length)]!;
  kit.block(d, h, w, mat, side, along);
  const [x, y, z] = kit.at(side, along);
  const front = x + (face * d) / 2;
  // Shop front: dark glass, a door and a coloured awning.
  b.box(0.1, 2.6, w * 0.8, m.glass, [front + face * 0.04, y + 1.5, z]);
  b.box(0.12, 0.3, w * 0.84, m.darkMetal, [front + face * 0.05, y + 2.95, z]);
  const awning = m.carPaints[Math.floor(rand() * m.carPaints.length)]!;
  b.box(1.3, 0.08, w * 0.7, awning, [front + face * 0.65, y + 3.2, z], [0, 0, face * -0.25]);
  if (rand() < 0.55) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, Math.min(3, w * 0.4)),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: SHOP_SIGNS[Math.floor(rand() * SHOP_SIGNS.length)]!, emissiveIntensity: 1.4 }),
    );
    sign.position.set(front + face * 0.12, y + 3.7, z);
    kit.group.add(sign);
  }
  // Parapet and roof clutter.
  b.box(d + 0.3, 0.6, w + 0.3, m.roof, [x, y + h - 0.2, z]);
  b.box(d - 0.6, 0.1, w - 0.6, m.roof, [x, y + h + 0.02, z]);
  if (rand() < 0.4) {
    const tx = x + (rand() - 0.5) * d * 0.4;
    const tz = z + (rand() - 0.5) * w * 0.4;
    b.post(1.1, 2, m.wood, [tx, y + h + 2.2, tz], 12);
    b.add(new THREE.ConeGeometry(1.2, 0.8, 12), m.darkMetal, [tx, y + h + 3.6, tz]);
    for (const [ox, oz] of [[-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7]] as const) b.post(0.06, 1.2, m.darkMetal, [tx + ox, y + h + 0.6, tz + oz], 6);
  }
  for (let i = 0; i < 2; i++) b.box(1.2, 0.8, 1.2, m.darkMetal, [x + (rand() - 0.5) * d * 0.6, y + h + 0.4, z + (rand() - 0.5) * w * 0.6]);
  // Fire escape zigzags on some fronts.
  if (h > 10 && rand() < 0.45) {
    for (let floor = 1; floor < Math.floor(h / 3) - 1; floor++) {
      const fy = y + floor * 3 + 0.8;
      b.box(1.1, 0.06, 2.6, m.darkMetal, [front + face * 0.55, fy, z + w * 0.2]);
      b.box(0.05, 0.9, 2.6, m.darkMetal, [front + face * 1.08, fy + 0.45, z + w * 0.2]);
      b.box(0.9, 0.05, 3.2, m.darkMetal, [front + face * 0.55, fy + 1.5, z + w * 0.2], [floor % 2 ? 0.8 : -0.8, 0, 0]);
    }
  }
}

/**
 * A row of buildings down one side of the road, from along a0 to a1.
 * `inner` is the distance from the road's middle to the building fronts.
 */
export function buildingRow(kit: SegmentKit, sign: 1 | -1, inner: number, a0: number, a1: number, height: [number, number] = [9, 26]): void {
  let along = a0;
  while (along < a1) {
    const w = 8 + kit.rand() * 8;
    const d = 10 + kit.rand() * 6;
    const h = height[0] + kit.rand() * (height[1] - height[0]);
    const mid = along + w / 2;
    const side = sign * (inner + d / 2);
    if (kit.free(side, mid, Math.max(w, d) / 2)) building(kit, side, mid, w, d, h, sign === 1 ? -1 : 1);
    along += w + 0.4;
  }
}
