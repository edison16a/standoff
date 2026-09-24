import * as THREE from "three";
import { MeshBuilder } from "../mesh-builder";
import { glowTexture } from "../textures";
import type { SegmentKit } from "./segment-kit";

/**
 * Street furniture, placed in a segment's frame: lamps, cars, bins and
 * barrels. Static parts go into the segment's merged mesh. Only what
 * glows or flickers is kept apart.
 */

/** A light with a bulb, a halo in the fog and a faint cone of light under it. */
export function addLamp(kit: SegmentKit, x: number, y: number, z: number, colour = 0xffc98a, cone = 6, flicker = 0): void {
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: colour, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
  halo.scale.setScalar(2.6);
  halo.position.set(x, y - 0.1, z);
  kit.group.add(halo);
  let shaft: THREE.Mesh | null = null;
  if (cone > 0) {
    const geo = new THREE.CylinderGeometry(0.15, cone * 0.42, cone, 16, 1, true);
    const material = kit.m.cone.clone();
    material.color.set(colour);
    shaft = new THREE.Mesh(geo, material);
    shaft.position.set(x, y - cone / 2 - 0.1, z);
    kit.group.add(shaft);
  }
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.2), flicker ? kit.m.bulb.clone() : kit.m.bulb);
  bulb.position.set(x, y, z);
  kit.group.add(bulb);
  const at = new THREE.Vector3(x, y, z).applyMatrix4(kit.group.matrixWorld);
  kit.lamps.push({ at, colour, flicker, halo, cone: shaft, bulb });
}

/** A street lamp on the pavement, its arm reaching out over the road. */
export function streetLamp(kit: SegmentKit, side: number, along: number, height = 6.6): void {
  const { b, m } = kit;
  const toward = side > 0 ? -1 : 1;
  const [x, y, z] = kit.at(side, along);
  b.post(0.16, 0.5, m.darkMetal, [x, y + 0.25, z], 10);
  b.post(0.08, height, m.darkMetal, [x, y + height / 2, z], 10, 0.06);
  b.box(1.9, 0.08, 0.08, m.darkMetal, [x + toward * 0.95, y + height, z]);
  b.box(0.7, 0.16, 0.32, m.darkMetal, [x + toward * 1.8, y + height - 0.02, z], undefined, 0.04);
  const flicker = kit.rand() < 0.3 ? 0.2 + kit.rand() : 0;
  addLamp(kit, x + toward * 1.8, y + height - 0.12, z, 0xffc88a, height - 0.3, flicker);
}

/** A parked or wrecked car. */
export function car(kit: SegmentKit, side: number, along: number, rotY: number, wrecked = false): void {
  const { b, m, rand } = kit;
  const paint = m.carPaints[Math.floor(rand() * m.carPaints.length)]!;
  const [x, y, z] = kit.at(side, along);
  const tilt = wrecked ? (rand() - 0.5) * 0.12 : 0;
  const part = new THREE.Group();
  const pb = new MeshBuilder();
  pb.box(4.3, 0.62, 1.8, paint, [0, 0.62, 0], undefined, 0.12);
  pb.box(2.4, 0.56, 1.62, paint, [-0.2, 1.18, 0], undefined, 0.14);
  pb.box(2.2, 0.46, 1.66, m.glass, [-0.2, 1.2, 0]);
  pb.box(0.08, 0.5, 1.5, m.glass, [0.95, 1.16, 0], [0, 0, 0.5]);
  pb.box(4.4, 0.18, 1.84, m.chrome, [0, 0.36, 0]);
  for (const [wx, wz] of [[1.35, 0.82], [1.35, -0.82], [-1.35, 0.82], [-1.35, -0.82]] as const) {
    pb.tube(0.34, 0.24, m.tire, [wx, 0.34, wz], 16, 0.34, [Math.PI / 2, 0, 0]);
    pb.tube(0.2, 0.26, m.chrome, [wx, 0.34, wz], 12, 0.2, [Math.PI / 2, 0, 0]);
  }
  for (const s of [-0.6, 0.6]) {
    pb.box(0.06, 0.14, 0.34, wrecked && s > 0 ? m.glass : m.headlight, [2.16, 0.68, s]);
    pb.box(0.06, 0.12, 0.3, m.taillight, [-2.16, 0.7, s]);
    pb.box(0.1, 0.1, 0.14, paint, [0.7, 1.05, s * 1.6]);
  }
  pb.box(0.04, 0.12, 0.36, m.whitePaint, [-2.18, 0.5, 0]);
  if (wrecked) pb.box(1.2, 0.08, 1.2, m.rust, [1.4, 0.95, 0], [0.2, 0.3, 0.1]);
  const built = pb.build("car");
  part.add(built);
  part.position.set(x, y, z);
  part.rotation.set(tilt, rotY, tilt * 0.5);
  part.updateMatrix();
  for (const child of built.children) {
    if (child instanceof THREE.Mesh) b.add((child.geometry as THREE.BufferGeometry).clone().applyMatrix4(part.matrix), child.material as THREE.Material);
  }
  // No collider: a car must never soak up a shot at the zombie walking past it.
}

export function dumpster(kit: SegmentKit, side: number, along: number, rotY = 0): void {
  const { b, m } = kit;
  const [x, y, z] = kit.at(side, along);
  const green = m.containers[2]!;
  b.box(1.9, 1.2, 1.1, green, [x, y + 0.7, z], [0, rotY, 0], 0.03);
  b.box(2, 0.08, 1.2, m.darkMetal, [x, y + 1.36, z], [0.15, rotY, 0]);
  for (const s of [-0.8, 0.8]) b.post(0.08, 0.14, m.tire, [x + s * Math.cos(rotY), y + 0.07, z - s * Math.sin(rotY)], 8);
}

export function trashBags(kit: SegmentKit, side: number, along: number): void {
  for (let i = 0; i < 4; i++) {
    const [x, y, z] = kit.at(side + (kit.rand() - 0.5) * 1.2, along + (kit.rand() - 0.5) * 1.2);
    kit.b.sphere(0.35 + kit.rand() * 0.15, kit.m.trash, [x, y + 0.28, z], [1, 0.75, 1.1], 10);
  }
}

/** An oil drum, sometimes with a fire going in it. The fire flickers and lights the street. */
export function barrel(kit: SegmentKit, side: number, along: number, burning: boolean): void {
  const [x, y, z] = kit.at(side, along);
  kit.b.post(0.32, 0.9, kit.m.rust, [x, y + 0.45, z], 14);
  for (const h of [0.2, 0.7]) kit.b.post(0.335, 0.05, kit.m.darkMetal, [x, y + h, z], 14);
  if (!burning) return;
  const flames = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2 - i * 0.04, 0.7 + i * 0.2, 8), kit.m.fire);
    flame.position.set((i - 1) * 0.08, 0.35 + i * 0.1, 0);
    flames.add(flame);
  }
  flames.position.set(x, y + 0.9, z);
  kit.group.add(flames);
  kit.ticks.push((t) => {
    flames.children.forEach((f, i) => {
      f.scale.y = 0.8 + Math.sin(t * (9 + i * 3) + i) * 0.25;
      f.rotation.y = t * (1 + i);
    });
  });
  addLamp(kit, x, y + 1.4, z, 0xff8a3a, 0, 0.9);
}

export function hydrant(kit: SegmentKit, side: number, along: number): void {
  const [x, y, z] = kit.at(side, along);
  const red = kit.m.carPaints[0]!;
  kit.b.post(0.14, 0.6, red, [x, y + 0.3, z], 10);
  kit.b.sphere(0.15, red, [x, y + 0.62, z], [1, 0.8, 1], 10);
  kit.b.tube(0.06, 0.4, red, [x, y + 0.42, z], 8, 0.06, [0, 0, Math.PI / 2]);
}

/** A concrete jersey barrier, the kind that lines highways and blocks roads. */
export function jersey(kit: SegmentKit, side: number, along: number, rotY = 0, length = 3.8): void {
  const [x, y, z] = kit.at(side, along);
  kit.b.box(0.62, 0.35, length, kit.m.barrier, [x, y + 0.17, z], [0, rotY, 0]);
  kit.b.box(0.3, 0.55, length, kit.m.barrier, [x, y + 0.6, z], [0, rotY, 0], 0.04);
  kit.b.box(0.32, 0.12, length * 0.3, kit.m.paint, [x, y + 0.72, z], [0, rotY, 0]);
}

export function bench(kit: SegmentKit, side: number, along: number, rotY: number): void {
  const [x, y, z] = kit.at(side, along);
  const { b, m } = kit;
  for (let i = 0; i < 3; i++) b.box(1.8, 0.05, 0.12, m.wood, [x, y + 0.48, z + (i - 1) * 0.14], [0, rotY, 0]);
  b.box(1.8, 0.36, 0.05, m.wood, [x, y + 0.8, z - 0.24], [0.2, rotY, 0]);
  for (const s of [-0.75, 0.75]) b.box(0.06, 0.48, 0.5, m.darkMetal, [x + s * Math.cos(rotY), y + 0.24, z - s * Math.sin(rotY)], [0, rotY, 0]);
}

/** A tree: trunk, a few boughs and clumps of dark leaves. */
export function tree(kit: SegmentKit, side: number, along: number, size = 1): void {
  const { b, m, rand } = kit;
  const [x, y, z] = kit.at(side, along);
  const h = (4.5 + rand() * 2) * size;
  b.post(0.22 * size, h, m.bark, [x, y + h / 2, z], 8, 0.12 * size);
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    b.box(0.1, 1.6 * size, 0.1, m.bark, [x + Math.cos(a) * 0.5, y + h * 0.75, z + Math.sin(a) * 0.5], [Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6]);
  }
  const leaves = m.leaves[Math.floor(rand() * m.leaves.length)]!;
  for (let i = 0; i < 6; i++) {
    const r = (1 + rand() * 0.9) * size;
    b.sphere(r, leaves, [x + (rand() - 0.5) * 2.4 * size, y + h + (rand() - 0.3) * 1.6 * size, z + (rand() - 0.5) * 2.4 * size], [1, 0.8, 1], 9);
  }
}
