import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import { boreHole, gunMaterials, laserModule, marker, profile, type GunModel } from "./gun-kit";

/**
 * The AK-47: stamped steel receiver with a ribbed dust cover, wooden
 * handguards over the gas tube, the tall front sight tower, a slant
 * muzzle brake, the long safety lever, a steel banana magazine and the
 * classic dropped wooden stock.
 */
export function buildAk47(): GunModel {
  const m = gunMaterials();
  const root = new THREE.Group();
  root.name = "ak47";
  const b = new MeshBuilder();

  // Receiver and dust cover.
  b.box(0.042, 0.05, 0.25, m.metal, [0, -0.008, -0.015], undefined, 0.004);
  b.box(0.038, 0.022, 0.23, m.metal, [0, 0.02, -0.01], undefined, 0.01);
  for (let z = -0.08; z < 0.1; z += 0.03) b.box(0.039, 0.003, 0.006, m.steel, [0, 0.031, z]);
  b.box(0.002, 0.014, 0.1, m.hole, [0.0215, 0.012, -0.03]);
  b.box(0.003, 0.014, 0.1, m.steel, [0.023, -0.004, -0.015], [0, 0, 0.05]);
  b.box(0.028, 0.02, 0.05, m.metal, [0, 0.028, -0.14]);
  b.box(0.022, 0.006, 0.06, m.metal, [0, 0.04, -0.14], [0.05, 0, 0]);

  // Gas tube over the barrel, wrapped in wood, with the steel retainer bands.
  b.tube(0.009, 0.22, m.metal, [0, 0.024, -0.25], 14);
  b.box(0.034, 0.026, 0.15, m.wood, [0, 0.026, -0.225], undefined, 0.011);
  b.box(0.05, 0.05, 0.19, m.wood, [0, -0.014, -0.24], undefined, 0.014);
  for (let z = -0.19; z > -0.31; z -= 0.028) b.box(0.052, 0.006, 0.01, m.darkWood, [0, -0.02, z]);
  for (const z of [-0.14, -0.335]) b.box(0.054, 0.066, 0.012, m.metal, [0, -0.004, z], undefined, 0.004);

  // Barrel, gas block, front sight tower, cleaning rod and muzzle brake.
  b.tube(0.009, 0.25, m.metal, [0, 0, -0.46], 14);
  b.box(0.028, 0.05, 0.034, m.metal, [0, 0.012, -0.36], undefined, 0.004);
  b.tube(0.013, 0.03, m.metal, [0, 0, -0.52], 14);
  b.box(0.012, 0.04, 0.02, m.metal, [0, 0.03, -0.52]);
  for (const x of [-0.009, 0.009]) b.box(0.004, 0.03, 0.012, m.metal, [x, 0.058, -0.52]);
  b.box(0.003, 0.018, 0.003, m.steel, [0, 0.058, -0.52]);
  b.tube(0.0028, 0.22, m.steel, [0, -0.02, -0.45], 8);
  b.tube(0.012, 0.042, m.steel, [0, 0, -0.598], 14);
  b.box(0.018, 0.014, 0.03, m.hole, [0.004, 0.009, -0.604], [0.5, 0, 0]);
  boreHole(b, m, 0.007, 0, -0.62);

  // Pistol grip, trigger and guard.
  profile(b, [[0.036, -0.03], [0.08, -0.03], [0.114, -0.136], [0.1, -0.15], [0.07, -0.146]], 0.03, m.darkWood);
  b.box(0.012, 0.005, 0.08, m.metal, [0, -0.074, 0.015]);
  b.box(0.012, 0.03, 0.005, m.metal, [0, -0.06, -0.025]);
  b.box(0.005, 0.022, 0.006, m.steel, [0, -0.058, 0.02], [0.3, 0, 0]);
  b.box(0.012, 0.012, 0.012, m.metal, [0, -0.04, -0.075]);

  // The dropped wooden stock and its steel butt plate.
  profile(b, [[0.1, 0.012], [0.44, -0.052], [0.44, -0.176], [0.34, -0.152], [0.2, -0.086], [0.13, -0.058], [0.1, -0.034]], 0.042, m.wood);
  b.box(0.044, 0.128, 0.012, m.metal, [0, -0.114, 0.446], undefined, 0.004);
  b.box(0.043, 0.008, 0.012, m.metal, [0, -0.06, 0.3]);

  laserModule(b, m, 0, -0.056, -0.305);
  root.add(b.build("ak-body"));

  // The banana magazine curves hard forward.
  const magazine = new THREE.Group();
  magazine.name = "magazine";
  const mb = new MeshBuilder();
  let y = 0;
  let z = 0;
  for (let i = 0; i < 7; i++) {
    const a = 0.1 + i * 0.075;
    mb.box(0.026, 0.034, 0.056, m.metal, [0, y - 0.017, z], [a, 0, 0], 0.003);
    mb.box(0.028, 0.03, 0.008, m.metal, [0, y - 0.017, z - 0.025], [a, 0, 0]);
    y -= Math.cos(a) * 0.031;
    z -= Math.sin(a) * 0.031;
  }
  mb.box(0.03, 0.01, 0.062, m.metal, [0, y - 0.003, z], [0.62, 0, 0], 0.003);
  mb.box(0.014, 0.005, 0.03, m.brass, [0, 0.002, 0.004]);
  magazine.add(mb.build("magazine"));
  magazine.position.set(0, -0.034, -0.08);
  root.add(magazine);

  // The charging handle rides the bolt carrier on the right.
  const bolt = new THREE.Group();
  bolt.name = "bolt";
  const bb = new MeshBuilder();
  bb.box(0.022, 0.009, 0.012, m.steel, [0.03, 0.012, -0.05]);
  bb.sphere(0.007, m.steel, [0.042, 0.012, -0.05]);
  bolt.add(bb.build("bolt"));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0, -0.622);
  const laser = marker("laser", 0, -0.056, -0.345);
  root.add(muzzle, laser);
  return { root, muzzle, laser, magazine, pump: null, bolt, shell: null, length: 1.06 };
}
