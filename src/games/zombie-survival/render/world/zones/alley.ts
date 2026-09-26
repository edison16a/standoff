import * as THREE from "three";
import { addLamp, dumpster, trashBags } from "../props";
import { fitBlock, rowSpan } from "../row-span";
import { groundSpan, type SegmentKit } from "../segment-kit";
import { closeTheView } from "./street";

/** Still water that catches the lamps rather than a black hole in the ground. */
const PUDDLE = new THREE.MeshStandardMaterial({ color: 0x1a2129, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.4, depthWrite: false });
// Every alley's puddles share it, so dropping a segment must leave it alone.
PUDDLE.userData.shared = true;

/**
 * A narrow back alley: tall brick walls close on both sides, pipes and
 * fire escapes, bins, crates, puddles, cables overhead and bare bulbs
 * over the back doors.
 */
export function buildAlley(kit: SegmentKit): void {
  const { m, seg, rand, b } = kit;
  const [a0, a1] = groundSpan(seg);
  const wall = 3.4;
  kit.ground(-wall, wall, a0, a1, m.road, 5);
  kit.b.box(0.5, 0.03, seg.length - a0, m.curb, kit.at(0, (a0 + seg.length) / 2, 0.01));
  const gap = 0.2;
  const span = rowSpan(seg, a0 - 4, seg.length + 4, gap);
  for (const s of [-1, 1] as const) {
    let along = span.from;
    while (along < span.to) {
      const w = fitBlock(span, along, 7 + rand() * 7, gap);
      const d = 8;
      const h = 11 + rand() * 10;
      const mid = along + w / 2;
      if (kit.free(s * (wall + d / 2), mid, 4)) {
        kit.block(d, h, w, m.facades[0]!, s * (wall + d / 2), mid);
        const [x, y, z] = kit.at(s * wall, mid);
        // A back door with a bulb over it, and a drain pipe.
        b.box(0.1, 2.2, 1.1, m.darkMetal, [x - s * 0.05, y + 1.1, z]);
        b.box(0.5, 0.06, 1.3, m.darkMetal, [x - s * 0.25, y + 2.5, z]);
        if (rand() < 0.6) addLamp(kit, x - s * 0.35, y + 2.9, z, rand() < 0.5 ? 0xffd9a0 : 0xbfe0ff, 3, rand() < 0.5 ? 0.3 + rand() : 0);
        b.tube(0.08, h, m.rust, [x - s * 0.12, y + h / 2, z + w * 0.35], 8, 0.08, [0, 0, 0]);
        if (h > 14) {
          for (let f = 1; f < 4; f++) {
            b.box(1, 0.06, 2.4, m.darkMetal, [x - s * 0.5, y + f * 3 + 1, z - w * 0.2]);
            b.box(0.04, 0.9, 2.4, m.darkMetal, [x - s * 0.98, y + f * 3 + 1.45, z - w * 0.2]);
          }
        }
      }
      along += w + gap;
    }
  }
  for (let a = a0 + 6; a < seg.length; a += 11) {
    const [x, y, z] = kit.at(0, a, 0);
    // Cables sag between the walls.
    b.box(wall * 2, 0.03, 0.03, m.tire, [x, y + 6 + rand() * 2, z], [0, 0, (rand() - 0.5) * 0.1]);
  }
  dumpster(kit, 2.3, a0 + 6 + rand() * 10, 0);
  dumpster(kit, -2.3, a0 + 22 + rand() * 10, 0);
  trashBags(kit, -2.5, a0 + 12);
  trashBags(kit, 2.5, a0 + 30);
  for (let i = 0; i < 4; i++) {
    const s = rand() < 0.5 ? -1 : 1;
    kit.b.box(0.8, 0.8, 0.8, m.wood, kit.at(s * 2.7, a0 + 4 + rand() * 30, 0.4), [0, rand(), 0]);
  }
  for (let i = 0; i < 3; i++) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.8 + rand() * 0.8, 16), PUDDLE);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(...kit.at((rand() - 0.5) * 3, a0 + 5 + rand() * 30, 0.02));
    puddle.scale.set(1.4, 0.8, 1);
    kit.group.add(puddle);
  }
  closeTheView(kit);
}
