import * as THREE from "three";
import { buildShip, SHIP_DECK } from "../../models/vehicles/ship";
import { addLamp, barrel } from "../props";
import { groundSpan, type SegmentKit } from "../segment-kit";

/** A shipping container with corrugated sides, end doors and locking bars. */
function container(kit: SegmentKit, side: number, along: number, level: number, rotY = 0): void {
  const { b, m, rand } = kit;
  const mat = m.containers[Math.floor(rand() * m.containers.length)]!;
  const [x, y, z] = kit.at(side, along, 1.3 + level * 2.62);
  b.box(2.44, 2.6, 12.2, mat, [x, y, z], [0, rotY, 0]);
  for (const end of [-1, 1]) {
    const ez = z + end * 6.11 * Math.cos(rotY);
    const ex = x + end * 6.11 * Math.sin(rotY);
    b.box(2.3, 2.45, 0.04, m.darkMetal, [ex, y, ez], [0, rotY, 0]);
    for (const bar of [-0.7, -0.3, 0.3, 0.7]) b.box(0.05, 2.4, 0.06, m.chrome, [ex + bar * Math.cos(rotY), y, ez - bar * Math.sin(rotY)], [0, rotY, 0]);
  }
  if (level === 0) kit.collider(new THREE.BoxGeometry(2.44, 2.6 * 3, 12.2).rotateY(rotY).translate(x, y + 2.6, z));
}

/** A floodlight mast, three lamps on a tall pole. */
function mast(kit: SegmentKit, side: number, along: number): void {
  const [x, y, z] = kit.at(side, along);
  kit.b.post(0.2, 15, kit.m.darkMetal, [x, y + 7.5, z], 8, 0.12);
  kit.b.box(2.6, 0.2, 0.3, kit.m.darkMetal, [x, y + 15, z]);
  for (const o of [-1, 0, 1]) addLamp(kit, x + o * 1.05, y + 14.8, z, 0xe8eeff, o === 0 ? 14 : 0, o === 1 && kit.rand() < 0.4 ? 0.6 : 0);
}

/** A gantry crane beside the quay, towering into the fog. */
function crane(kit: SegmentKit, side: number, along: number): void {
  const { b, m } = kit;
  const yellow = m.containers[3]!;
  for (const [dx, dz] of [[-5, -6], [5, -6], [-5, 6], [5, 6]] as const) b.box(0.9, 30, 0.9, yellow, kit.at(side + dx, along + dz, 15));
  b.box(12, 1.4, 1.2, yellow, kit.at(side, along - 6, 28));
  b.box(12, 1.4, 1.2, yellow, kit.at(side, along + 6, 28));
  b.box(1.4, 1.6, 46, yellow, kit.at(side - 4, along, 31), [0, Math.PI / 2, 0]);
  b.box(3, 2.4, 3, m.darkMetal, kit.at(side - 10, along, 29.5));
  addLamp(kit, ...kit.at(side, along, 31.5), 0xff3030, 0, 0.9);
}

/**
 * The port: concrete quays, stacks of containers two and three high,
 * cranes and floodlight masts, bollards along the water's edge. Pier nine
 * runs out over black water to the ship waiting at its end.
 */
export function buildDocks(kit: SegmentKit): void {
  const { m, seg, rand, b } = kit;
  const [a0, a1] = groundSpan(seg);
  const pier = seg.index === 26;
  const waterRight = seg.index >= 25;
  const width = pier ? 7 : 14;
  kit.ground(-width, waterRight ? 8 : width, a0, pier ? seg.length + 2 : a1, m.sidewalk, 4);
  for (let a = a0 + 3; a < seg.length; a += 8) b.box(0.18, 0.02, 4, m.paint, kit.at(-2.5, a, 0.012));
  for (let a = a0 + 3; a < seg.length; a += 8) b.box(0.18, 0.02, 4, m.paint, kit.at(2.5, a, 0.012));
  if (waterRight || pier) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(260, seg.length + 140), m.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(...kit.at(pier ? 0 : 130, seg.length / 2, -2.2));
    kit.group.add(water);
    for (let a = a0 + 2; a < seg.length; a += 6) {
      for (const s of pier ? [-1, 1] : [1]) {
        const edge = s > 0 ? (pier ? width : 8) : -width;
        b.post(0.22, 0.6, m.darkMetal, kit.at(edge - s * 0.5, a, 0.3), 10);
        b.sphere(0.26, m.darkMetal, kit.at(edge - s * 0.5, a, 0.62), [1, 0.5, 1], 10);
        b.box(0.3, 0.3, 6, m.wood, kit.at(edge + s * 0.15, a + 3, -0.2));
      }
    }
    kit.b.box(pier ? width * 2 : 22, 2.4, seg.length, m.barrier, kit.at(pier ? 0 : -3, seg.length / 2, -1.2));
  }
  if (!pier) {
    for (let a = a0 - 4; a < seg.length + 6; a += 13) {
      for (const s of waterRight ? [-1] : [-1, 1]) {
        const side = s * (width + 1.5 + rand() * 6);
        if (!kit.free(side, a, 6.5)) continue;
        const levels = 1 + Math.floor(rand() * 3);
        for (let l = 0; l < levels; l++) container(kit, side + (rand() - 0.5) * 0.3, a, l);
        if (rand() < 0.5 && kit.free(side + s * 2.7, a, 6.5)) container(kit, side + s * 2.7, a, 0);
      }
    }
    if (seg.index % 2 === 0 && kit.free(-26, seg.length / 2, 14)) crane(kit, -26, seg.length / 2);
  }
  for (let a = a0 + 6, i = 0; a < seg.length; a += 26, i++) mast(kit, (i % 2 ? 1 : -1) * (width - 1), a);
  if (rand() < 0.7) barrel(kit, -width + 2, a0 + 8 + rand() * 20, true);
  for (let i = 0; i < 3; i++) b.box(1.2, 0.15, 1.2, m.wood, kit.at((rand() - 0.5) * width, a0 + rand() * 30, 0.08));
  if (pier) {
    const ship = buildShip();
    ship.name = "ship";
    ship.position.set(...kit.at(0, seg.length + 11, -2.2));
    kit.group.add(ship);
    // The gangway from the end of the pier up to the deck.
    const [gx, gy, gz] = kit.at(0, seg.length + 1.4, SHIP_DECK / 2 - 1.1);
    b.box(1.6, 0.12, 5.2, m.darkMetal, [gx, gy, gz], [Math.atan2(SHIP_DECK - 2.2, 4.4), 0, 0]);
    for (const s of [-0.8, 0.8]) b.box(0.05, 0.9, 5.2, m.chrome, [gx + s, gy + 0.5, gz], [Math.atan2(SHIP_DECK - 2.2, 4.4), 0, 0]);
    // Deck floodlights, lent real light by the world like any lamp.
    for (const x of [-12, 12]) addLamp(kit, ...kit.at(x, seg.length + 6, SHIP_DECK + 4), 0xfff0c0, 0, 0);
  }
}
