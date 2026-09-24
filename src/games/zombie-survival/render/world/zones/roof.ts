import * as THREE from "three";
import { addLamp } from "../props";
import type { SegmentKit } from "../segment-kit";

/** Where the roof ends and the ramp back down begins, in metres along the segment. */
const ROOF_END = 44;
const HALF = 11;

/**
 * The hospital roof, fourteen storeys of dark city below it: a helipad
 * with its painted H, stairwell huts the dead pour out of, humming air
 * units, a mast with a blinking red light, and at the far end a ramp
 * spiralling back down to the street.
 */
export function buildRoof(kit: SegmentKit): void {
  const { m, seg, b, rand } = kit;
  kit.ground(-HALF, HALF, 0, ROOF_END, m.roof, 4);
  // The building under the roof, down to the street fourteen metres below.
  const drop = seg.start.y;
  kit.b.box(HALF * 2, drop, ROOF_END, m.hospital, [0, -drop / 2 - 0.02, -ROOF_END / 2]);
  kit.collider(new THREE.BoxGeometry(HALF * 2, drop, ROOF_END).translate(0, -drop / 2, -ROOF_END / 2));
  for (const s of [-1, 1]) b.box(0.35, 1.1, ROOF_END, m.barrier, [s * (HALF - 0.17), 0.55, -ROOF_END / 2]);
  for (const s of [-1, 1]) b.box(HALF - 3.6, 1.1, 0.35, m.barrier, [s * (HALF + 3.6) / 2, 0.55, -ROOF_END + 0.17]);

  // Helipad.
  const pad = kit.at(0, 18, 0.02);
  b.post(7, 0.03, m.darkMetal, pad, 40);
  b.add(new THREE.TorusGeometry(6, 0.18, 6, 48), m.paint, [pad[0], pad[1] + 0.03, pad[2]], [Math.PI / 2, 0, 0]);
  for (const x of [-1.2, 1.2]) b.box(0.5, 0.02, 4, m.whitePaint, [pad[0] + x, pad[1] + 0.03, pad[2]]);
  b.box(2.4, 0.02, 0.5, m.whitePaint, [pad[0], pad[1] + 0.03, pad[2]]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addLamp(kit, pad[0] + Math.cos(a) * 7.2, pad[1] + 0.12, pad[2] + Math.sin(a) * 7.2, 0x9affb0, 0, 0);
  }

  // Stairwell huts with open doors, where the zombies come from.
  for (const s of [-1, 1]) {
    const [x, y, z] = kit.at(s * 6.5, 33);
    b.box(3.4, 3, 3.4, m.barrier, [x, y + 1.5, z]);
    b.box(3.6, 0.2, 3.6, m.roof, [x, y + 3.1, z]);
    b.box(1.2, 2.2, 0.05, m.tire, [x, y + 1.1, z + 1.72]);
    addLamp(kit, x, y + 2.6, z + 1.9, 0xfff0d0, 2.6, 0.8);
    kit.collider(new THREE.BoxGeometry(3.4, 3, 3.4).translate(x, y + 1.5, z));
  }
  // Air units, vents and pipes.
  for (let i = 0; i < 5; i++) {
    const s = i % 2 ? 1 : -1;
    const [x, y, z] = kit.at(s * (8.5 + rand() * 1.2), 4 + i * 8);
    b.box(2, 1.3, 2.6, m.chrome, [x, y + 0.65, z], undefined, 0.05);
    b.tube(0.6, 0.1, m.darkMetal, [x, y + 1.35, z], 16, 0.6, [0, 0, 0]);
    b.tube(0.12, 5, m.rust, [x - s * 1.2, y + 0.3, z - 2], 8);
  }
  const [mx, my, mz] = kit.at(-9, 40);
  b.post(0.12, 9, m.darkMetal, [mx, my + 4.5, mz], 8, 0.05);
  for (let h = 1.5; h < 9; h += 1.5) b.box(0.6, 0.04, 0.04, m.darkMetal, [mx, my + h, mz]);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), m.taillight.clone());
  beacon.position.set(mx, my + 9.1, mz);
  kit.group.add(beacon);
  kit.ticks.push((t) => ((beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 3) > 0.3 ? 4 : 0.2));

  // The ramp back down, with parapets, from the far end of the roof.
  const bottom = seg.length + 12;
  kit.ground(-3.6, 3.6, ROOF_END - 1, bottom, m.road, 5);
  for (let a = ROOF_END; a < seg.length; a += 2) {
    for (const s of [-1, 1]) {
      const [x, y, z] = kit.at(s * 3.75, a + 1, 0.5);
      b.box(0.3, 1, 2.05, m.barrier, [x, y, z], [Math.atan2(kit.y(a + 2) - kit.y(a), 2), 0, 0]);
    }
    if (a % 8 === 0) b.post(0.35, Math.max(0.1, kit.y(a) + drop), m.barrier, kit.at(0, a, -(kit.y(a) + drop) / 2 - 0.3), 10);
  }
  // Towers round the hospital, their tops above the roof line.
  for (let i = 0; i < 8; i++) {
    const s = i % 2 ? 1 : -1;
    const side = s * (26 + rand() * 20);
    const along = -10 + i * 9 + rand() * 6;
    const h = 20 + rand() * 30;
    if (kit.free(side, along, 8)) kit.block(14, h, 14, m.facades[i % 3]!, side, along, 0, 0, false, -drop);
  }
}
