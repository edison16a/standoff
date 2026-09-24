import * as THREE from "three";
import { signTexture } from "../../textures";
import { buildingRow } from "../buildings";
import { addLamp, car, streetLamp } from "../props";
import { groundSpan, type SegmentKit } from "../segment-kit";

/** An ambulance: a boxy white van with a red stripe and a dead light bar. */
function ambulance(kit: SegmentKit, side: number, along: number, rotY: number): void {
  const { m } = kit;
  const white = m.hospital;
  const [x, y, z] = kit.at(side, along);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const parts: [number, number, number, THREE.Material, number, number, number][] = [
    [5.6, 2.2, 2.1, white, 0, 1.45, 0],
    [1.6, 1.2, 2.0, white, 2.9, 0.95, 0],
    [0.05, 0.3, 2.12, m.redCross, 0, 1.3, 0],
    [1.2, 0.18, 0.4, m.taillight, 1.2, 2.62, 0],
    [0.05, 0.7, 1.8, m.glass, 3.72, 1.35, 0],
  ];
  for (const [w, h, d, mat, px, py, pz] of parts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(px, py, pz);
    g.add(mesh);
  }
  for (const [wx, wz] of [[1.9, 1], [1.9, -1], [-1.8, 1], [-1.8, -1]] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), m.tire);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    g.add(wheel);
  }
  kit.group.add(g);
}

/** The hospital car park: bays, ambulances, and the hospital itself glowing white on the right. */
export function buildHospitalLot(kit: SegmentKit): void {
  const { m, seg, b } = kit;
  const [a0, a1] = groundSpan(seg);
  kit.ground(-12, 12, a0, a1, m.road, 6);
  for (const s of [-1, 1]) for (let a = a0 + 2; a < seg.length - 2; a += 3) b.box(2.6, 0.02, 0.1, m.whitePaint, kit.at(s * 9.5, a, 0.012));
  ambulance(kit, 8.6, a0 + 12, Math.PI / 2 + 0.2);
  ambulance(kit, -9, a0 + 26, Math.PI / 2 - 0.1);
  car(kit, 9.5, a0 + 22, Math.PI / 2, false);
  car(kit, -9.5, a0 + 8, Math.PI / 2, true);
  for (let a = a0 + 6, i = 0; a < seg.length; a += 16, i++) streetLamp(kit, (i % 2 ? 1 : -1) * 11.6, a);
  const [hx, hy, hz] = kit.at(24, seg.length * 0.4);
  kit.block(22, 30, 36, m.hospital, 24, seg.length * 0.4);
  const cross = new THREE.Group();
  for (const [w, h] of [[5, 1.6], [1.6, 5]] as const) cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, h, w), m.redCross));
  cross.position.set(hx - 11.2, hy + 22, hz);
  kit.group.add(cross);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2),
    new THREE.MeshBasicMaterial({ map: signTexture("er", ["EMERGENCY"], "#200404", "#ff3a3a", 512, 102), toneMapped: false }),
  );
  sign.position.set(hx - 11.1, hy + 5, hz);
  sign.rotation.y = -Math.PI / 2;
  kit.group.add(sign);
  addLamp(kit, hx - 11.5, hy + 4, hz, 0xff4a4a, 0, 0);
  buildingRow(kit, -1, 12.5, a0 - 6, seg.length + 6, [10, 22]);
  addLamp(kit, hx - 11.5, hy + 2.6, hz + 8, 0xe0f0ff, 3, 0.6);
}

/** The parking ramp up to the roof: a sloping deck with parapets, pillars and wall lights. */
export function buildRamp(kit: SegmentKit): void {
  const { m, seg, b } = kit;
  const [a0, a1] = groundSpan(seg);
  const half = 4.6;
  kit.ground(-half, half, a0, a1, m.road, 5);
  kit.ground(-24, 24, a0, seg.length, m.road, 8, -0.05, false);
  for (let a = a0; a < seg.length; a += 2) {
    for (const s of [-1, 1]) {
      const [x, y, z] = kit.at(s * (half + 0.15), a + 1, 0.55);
      b.box(0.3, 1.1, 2.05, m.barrier, [x, y, z], [Math.atan2(kit.y(a + 2) - kit.y(a), 2), 0, 0]);
      if (a % 8 === 0 && kit.y(a) > 1.5) b.post(0.3, kit.y(a), m.barrier, [x, kit.y(a) / 2 - 0.2, z], 8);
    }
    if (a % 10 === 0) {
      const [x, y, z] = kit.at(half, a, 1.3);
      addLamp(kit, x - 0.2, y, z, 0xe8f2ff, 0, a % 20 === 0 ? 0.7 : 0);
    }
  }
  for (let i = 0; i < seg.length; i += 3) b.box(0.1, 0.02, 1.5, m.paint, kit.at(0, i + 1, 0.02));
  buildingRow(kit, -1, 6, a0 - 4, seg.length, [10, 18]);
}
