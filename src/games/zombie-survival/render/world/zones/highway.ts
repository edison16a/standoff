import * as THREE from "three";
import { addLamp, barrel, car, jersey } from "../props";
import { groundSpan, type SegmentKit } from "../segment-kit";

/** A tall highway light with two arms reaching over the lanes. */
function highwayLight(kit: SegmentKit, side: number, along: number): void {
  const { b, m } = kit;
  const [x, y, z] = kit.at(side, along);
  const toward = side > 0 ? -1 : 1;
  b.post(0.14, 10, m.darkMetal, [x, y + 5, z], 8, 0.09);
  b.box(3.2, 0.1, 0.1, m.darkMetal, [x + toward * 1.6, y + 10, z], [0, 0, toward * -0.12]);
  b.box(0.9, 0.18, 0.4, m.darkMetal, [x + toward * 3.1, y + 9.8, z], undefined, 0.04);
  addLamp(kit, x + toward * 3.1, y + 9.65, z, 0xffb070, 9.3, kit.rand() < 0.25 ? 0.4 + kit.rand() : 0);
}

/** A semi truck's trailer, jackknifed across the lanes. */
function trailer(kit: SegmentKit, side: number, along: number, rotY: number): void {
  const { b, m } = kit;
  const [x, y, z] = kit.at(side, along);
  const box = new THREE.BoxGeometry(2.5, 3, 12);
  b.add(box, m.containers[4]!, [x, y + 2.1, z], [0, rotY, 0.08]);
  for (const o of [-4.5, -3.3, 4.2]) {
    b.tube(0.5, 2.3, m.tire, [x + Math.sin(rotY) * o, y + 0.5, z + Math.cos(rotY) * o], 14, 0.5, [0, rotY, Math.PI / 2]);
  }
}

/**
 * The highway out of town: four lanes between concrete barriers, dead
 * traffic slewed across them, tall orange lights, and an overhead sign
 * pointing to the port.
 */
export function buildHighway(kit: SegmentKit): void {
  const { m, seg, rand, b, hw } = kit;
  const [a0, a1] = groundSpan(seg);
  const edge = hw + 2.5;
  kit.ground(-edge, edge, a0, a1, m.road, 6);
  kit.ground(-60, 60, a0 - 10, a1 + 10, m.grass, 8, -0.4, false);
  for (const lane of [-hw / 2, hw / 2]) for (let a = a0 + 1; a < seg.length; a += 9) b.box(0.14, 0.02, 3, m.whitePaint, kit.at(lane, a, 0.012));
  for (const s of [-0.12, 0.12]) b.box(0.1, 0.02, seg.length - a0, m.paint, kit.at(s, (a0 + seg.length) / 2, 0.012));
  for (const s of [-1, 1]) {
    for (let a = a0 + 2; a < seg.length; a += 4) if (kit.free(s * (edge - 0.3), a, 0.3)) jersey(kit, s * (edge - 0.3), a, 0, 4);
  }
  for (let a = a0 + 8, i = 0; a < seg.length; a += 24, i++) highwayLight(kit, (i % 2 ? 1 : -1) * (edge + 0.4), a);

  // Dead traffic.
  const cars = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < cars; i++) {
    const side = (rand() - 0.5) * hw * 1.8;
    car(kit, side, a0 + 4 + rand() * (seg.length - a0 - 8), Math.PI / 2 + (rand() - 0.5) * 1.6, true);
  }
  if (seg.index === 18 || seg.index === 19) trailer(kit, -hw + 3, seg.length * 0.4, 0.9);
  if (rand() < 0.7) barrel(kit, (rand() < 0.5 ? -1 : 1) * (hw - 1), a0 + 10 + rand() * 20, true);

  // The overhead sign gantry.
  if (seg.index % 2 === 0) {
    const along = a0 + 18;
    for (const s of [-1, 1]) b.post(0.18, 7.5, m.darkMetal, kit.at(s * (edge + 0.6), along, 3.75), 10);
    b.box(edge * 2 + 1.2, 0.3, 0.3, m.darkMetal, kit.at(0, along, 7.3));
    b.box(edge * 2 + 1.2, 0.3, 0.3, m.darkMetal, kit.at(0, along, 6.4));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), m.highwaySign);
    sign.position.set(...kit.at(hw / 2, along - 0.2, 6.9));
    kit.group.add(sign);
  }
}
