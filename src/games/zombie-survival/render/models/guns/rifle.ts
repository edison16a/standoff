import * as THREE from "three";
import { MeshBuilder, type V3 } from "../../mesh-builder";
import { boreHole, gunMaterials, laserModule, marker, type GunMaterials, type GunModel } from "./gun-kit";

/** A picatinny rail: a flat bar with a row of teeth. */
function rail(b: MeshBuilder, m: GunMaterials, at: V3, length: number, rot: V3 = [0, 0, 0]): void {
  const holder = new MeshBuilder();
  holder.box(0.022, 0.006, length, m.metal, [0, 0, 0]);
  for (let z = -length / 2 + 0.008; z < length / 2; z += 0.016) holder.box(0.022, 0.0025, 0.007, m.metal, [0, 0.004, z]);
  // Rails lie on every face of the handguard, so build flat and turn into place.
  const group = holder.build();
  group.rotation.set(...rot);
  group.position.set(...at);
  group.updateMatrixWorld(true);
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) b.add(child.geometry.clone().applyMatrix4(child.matrixWorld), m.metal);
  });
}

/**
 * A carbine in the modern American pattern: flat top receiver with a
 * holographic sight, quad rail handguard with a light and laser, A frame
 * front sight, bird cage flash hider, a tan polymer magazine and a
 * collapsible stock on the buffer tube.
 */
export function buildRifle(): GunModel {
  const m = gunMaterials();
  const root = new THREE.Group();
  root.name = "rifle";
  const b = new MeshBuilder();

  // Upper and lower receivers.
  b.box(0.04, 0.046, 0.21, m.metal, [0, 0.004, -0.03], undefined, 0.004);
  rail(b, m, [0, 0.03, -0.03], 0.2);
  b.box(0.002, 0.016, 0.05, m.hole, [0.0205, 0.006, -0.02]);
  b.box(0.003, 0.02, 0.055, m.metal, [0.022, 0.004, -0.02]);
  b.tube(0.007, 0.03, m.metal, [0.024, 0.014, 0.035], 10, 0.007, [Math.PI / 2, 0, 0]);
  b.box(0.036, 0.042, 0.17, m.metal, [0, -0.036, -0.015], undefined, 0.004);
  b.box(0.034, 0.05, 0.075, m.metal, [0, -0.07, -0.07], undefined, 0.004);
  b.tube(0.005, 0.004, m.steel, [-0.019, -0.035, 0.02], 10, 0.005, [0, 0, Math.PI / 2]);

  // Holographic sight: a window in a hood, with a red dot floating in it.
  b.box(0.03, 0.012, 0.07, m.polymer, [0, 0.043, -0.01], undefined, 0.003);
  for (const x of [-0.016, 0.016]) b.box(0.004, 0.035, 0.05, m.polymer, [x, 0.066, -0.01]);
  b.box(0.036, 0.004, 0.05, m.polymer, [0, 0.085, -0.01]);
  b.box(0.028, 0.03, 0.002, m.glass, [0, 0.066, -0.03]);
  b.sphere(0.0018, m.lens, [0, 0.066, -0.031], [1, 1, 1], 8);

  // Quad rail handguard with a flashlight on the right.
  b.box(0.046, 0.046, 0.3, m.metal, [0, 0, -0.285], undefined, 0.006);
  rail(b, m, [0, 0.026, -0.285], 0.28);
  rail(b, m, [0, -0.026, -0.285], 0.28, [Math.PI, 0, 0]);
  rail(b, m, [0.026, 0, -0.285], 0.28, [0, 0, -Math.PI / 2]);
  rail(b, m, [-0.026, 0, -0.285], 0.28, [0, 0, Math.PI / 2]);
  b.tube(0.012, 0.09, m.polymer, [0.04, 0, -0.35], 16);
  b.tube(0.014, 0.02, m.polymer, [0.04, 0, -0.4], 16);
  b.tube(0.011, 0.003, m.glass, [0.04, 0, -0.411], 16);

  // Barrel, A frame front sight and bird cage flash hider.
  b.tube(0.008, 0.16, m.metal, [0, 0, -0.5], 14);
  b.box(0.018, 0.012, 0.03, m.metal, [0, -0.004, -0.47]);
  b.box(0.008, 0.055, 0.012, m.metal, [0, 0.03, -0.475], [0.25, 0, 0]);
  b.box(0.008, 0.055, 0.012, m.metal, [0, 0.03, -0.465], [-0.25, 0, 0]);
  b.box(0.003, 0.014, 0.003, m.steel, [0, 0.063, -0.47]);
  b.tube(0.011, 0.05, m.steel, [0, 0, -0.6], 16);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box(0.004, 0.004, 0.03, m.hole, [Math.cos(a) * 0.0105, Math.sin(a) * 0.0105, -0.605]);
  }
  boreHole(b, m, 0.007, 0, -0.626);

  // Grip, trigger, guard.
  b.box(0.03, 0.095, 0.04, m.polymer, [0, -0.095, 0.045], [0.35, 0, 0], 0.008);
  b.box(0.012, 0.005, 0.07, m.metal, [0, -0.078, -0.005]);
  b.box(0.005, 0.02, 0.006, m.steel, [0, -0.065, 0.005], [0.3, 0, 0]);

  // Buffer tube and collapsible stock.
  b.tube(0.015, 0.24, m.metal, [0, -0.006, 0.19], 16);
  b.box(0.045, 0.075, 0.16, m.polymer, [0, -0.03, 0.27], undefined, 0.01);
  b.box(0.035, 0.02, 0.12, m.polymer, [0, 0.013, 0.28], undefined, 0.006);
  b.box(0.047, 0.095, 0.02, m.rubber, [0, -0.038, 0.355], undefined, 0.005);

  laserModule(b, m, 0, -0.05, -0.36);
  root.add(b.build("rifle-body"));

  const magazine = new THREE.Group();
  magazine.name = "magazine";
  const mb = new MeshBuilder();
  let y = 0;
  let z = 0;
  for (let i = 0; i < 5; i++) {
    const a = 0.03 + i * 0.035;
    mb.box(0.024, 0.04, 0.062, m.tan, [0, y - 0.02, z], [a, 0, 0], 0.003);
    for (const x of [-0.0125, 0.0125]) mb.box(0.002, 0.03, 0.05, m.tan, [x, y - 0.02, z], [a, 0, 0]);
    y -= Math.cos(a) * 0.036;
    z -= Math.sin(a) * 0.036;
  }
  mb.box(0.03, 0.012, 0.07, m.tan, [0, y - 0.004, z], [0.2, 0, 0], 0.004);
  mb.box(0.012, 0.004, 0.03, m.brass, [0, 0.002, 0.005]);
  magazine.add(mb.build("magazine"));
  magazine.position.set(0, -0.09, -0.07);
  root.add(magazine);

  const bolt = new THREE.Group();
  bolt.name = "bolt";
  const bb = new MeshBuilder();
  bb.box(0.04, 0.008, 0.012, m.metal, [0, 0.02, 0.085]);
  bb.box(0.01, 0.006, 0.03, m.metal, [0, 0.02, 0.068]);
  bolt.add(bb.build("bolt"));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0, -0.628);
  const laser = marker("laser", 0, -0.05, -0.4);
  root.add(muzzle, laser);
  return { root, muzzle, laser, magazine, pump: null, bolt, shell: null, length: 1 };
}
