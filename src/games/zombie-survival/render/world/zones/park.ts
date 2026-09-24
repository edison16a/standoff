import { buildingRow } from "../buildings";
import { addLamp, bench, tree, trashBags } from "../props";
import { groundSpan, type SegmentKit } from "../segment-kit";

/**
 * The park: wet grass under old trees, a paved path, benches, lantern
 * posts, an iron fence round the edge and a dry fountain. City blocks
 * loom beyond the fence.
 */
export function buildPark(kit: SegmentKit): void {
  const { m, seg, rand, b } = kit;
  const [a0, a1] = groundSpan(seg);
  kit.ground(-24, 24, a0 - 6, a1 + 4, m.grass, 5, -0.03);
  kit.ground(-3, 3, a0, a1, m.sidewalk, 3, 0.01);
  for (const s of [-1, 1]) for (let a = a0; a < seg.length; a += 4) b.box(0.18, 0.1, 4, m.curb, kit.at(s * 3.05, a + 2, 0.03));

  for (let i = 0; i < 16; i++) {
    const s = rand() < 0.5 ? -1 : 1;
    const side = s * (7 + rand() * 14);
    const along = a0 + rand() * (seg.length - a0);
    if (kit.free(side, along, 3)) tree(kit, side, along, 0.9 + rand() * 0.5);
  }
  for (let a = a0 + 5, i = 0; a < seg.length; a += 14, i++) {
    const s = i % 2 ? 1 : -1;
    const [x, y, z] = kit.at(s * 3.6, a);
    b.post(0.07, 3.8, m.darkMetal, [x, y + 1.9, z], 8);
    b.box(0.32, 0.4, 0.32, m.darkMetal, [x, y + 3.95, z], undefined, 0.05);
    addLamp(kit, x, y + 3.9, z, 0xd6e6ff, 3.8, rand() < 0.3 ? 0.5 + rand() : 0);
    bench(kit, s * 4.2, a + 4, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  // The iron fence round the park.
  for (const s of [-1, 1]) {
    for (let a = a0 - 4; a < a1; a += 2.5) {
      if (!kit.free(s * 22, a, 0.5)) continue;
      const [x, y, z] = kit.at(s * 22, a);
      b.box(0.06, 1.8, 0.06, m.darkMetal, [x, y + 0.9, z]);
      b.box(0.04, 0.05, 2.5, m.darkMetal, [x, y + 1.6, z - 1.25]);
      b.box(0.04, 0.05, 2.5, m.darkMetal, [x, y + 0.4, z - 1.25]);
    }
  }
  // The fountain, off to one side of the path.
  const fs = seg.index % 2 ? 11 : -11;
  const [fx, fy, fz] = kit.at(fs, seg.length * 0.5);
  b.post(4, 0.7, m.barrier, [fx, fy + 0.35, fz], 28);
  b.post(3.6, 0.1, m.water, [fx, fy + 0.66, fz], 28);
  b.post(0.5, 2.2, m.barrier, [fx, fy + 1.1, fz], 12);
  b.post(1.3, 0.25, m.barrier, [fx, fy + 2.2, fz], 16);
  kit.block(8, 1, 8, m.collider, fs, seg.length * 0.5, 0, 0.3);
  trashBags(kit, -4, a0 + 10);
  buildingRow(kit, 1, 25, a0 - 10, seg.length + 10, [14, 30]);
  buildingRow(kit, -1, 25, a0 - 10, seg.length + 10, [14, 30]);
}
