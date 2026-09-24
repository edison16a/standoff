import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import { boreHole, gunMaterials, laserModule, marker, type GunModel } from "./gun-kit";

const Z = Math.PI / 2;

/**
 * A pump action shotgun: long barrel with a vent rib and brass bead, the
 * magazine tube under it, a ridged wooden slide, a steel receiver with a
 * side saddle of spare shells, and a walnut stock with a rubber pad.
 */
export function buildShotgun(): GunModel {
  const m = gunMaterials();
  const root = new THREE.Group();
  root.name = "shotgun";
  const b = new MeshBuilder();

  // Barrel, rib and bead.
  b.tube(0.0115, 0.52, m.metal, [0, 0, -0.4], 20);
  b.tube(0.0122, 0.012, m.steel, [0, 0, -0.655], 20);
  b.box(0.007, 0.004, 0.5, m.metal, [0, 0.0135, -0.4]);
  for (let z = -0.18; z > -0.64; z -= 0.045) b.box(0.004, 0.003, 0.008, m.metal, [0, 0.0105, z]);
  b.sphere(0.0032, m.brass, [0, 0.019, -0.652], [1, 1, 1], 10);
  boreHole(b, m, 0.009, 0, -0.662);

  // Magazine tube, its cap and the clamp that ties it to the barrel.
  b.tube(0.0125, 0.42, m.metal, [0, -0.031, -0.35], 18);
  b.tube(0.0145, 0.03, m.steel, [0, -0.031, -0.575], 18);
  b.box(0.028, 0.058, 0.016, m.metal, [0, -0.016, -0.548], undefined, 0.004);
  b.tube(0.004, 0.034, m.steel, [0, -0.016, -0.548], 8, 0.004, [0, 0, Z]);

  // Receiver with its ports, pins and the trigger group.
  b.box(0.05, 0.08, 0.23, m.metal, [0, -0.018, -0.03], undefined, 0.006);
  b.box(0.044, 0.01, 0.2, m.steel, [0, 0.026, -0.03], undefined, 0.003);
  b.box(0.002, 0.024, 0.065, m.hole, [0.0255, 0.002, -0.065]);
  b.box(0.03, 0.002, 0.075, m.hole, [0, -0.0585, -0.07]);
  for (const z of [0.02, -0.1]) b.tube(0.004, 0.052, m.steel, [0, -0.035, z], 8, 0.004, [0, 0, Z]);
  b.box(0.012, 0.006, 0.075, m.metal, [0, -0.088, 0.03]);
  b.box(0.012, 0.035, 0.006, m.metal, [0, -0.07, -0.006]);
  b.box(0.006, 0.03, 0.007, m.steel, [0, -0.071, 0.022], [0.35, 0, 0]);
  b.tube(0.0045, 0.058, m.steel, [0, -0.052, -0.012], 10, 0.0045, [0, 0, Z]);

  // Side saddle with four spare shells.
  b.box(0.012, 0.05, 0.11, m.polymer, [-0.031, -0.02, -0.035], undefined, 0.003);
  for (let i = 0; i < 4; i++) {
    const z = -0.075 + i * 0.026;
    b.post(0.0095, 0.05, m.shellRed, [-0.041, -0.012, z], 12);
    b.post(0.0102, 0.014, m.brass, [-0.041, -0.043, z], 12);
  }

  // Walnut stock, grip and rubber pad.
  b.box(0.04, 0.052, 0.11, m.wood, [0, -0.052, 0.135], [-0.28, 0, 0], 0.012);
  b.box(0.044, 0.1, 0.25, m.wood, [0, -0.085, 0.31], [-0.1, 0, 0], 0.016);
  b.box(0.046, 0.115, 0.022, m.rubber, [0, -0.1, 0.44], [-0.1, 0, 0], 0.006);
  b.tube(0.004, 0.012, m.steel, [0, -0.13, 0.36], 8);

  laserModule(b, m, 0, -0.064, -0.5);
  root.add(b.build("shotgun-body"));

  // The slide and its action bars move together.
  const pump = new THREE.Group();
  pump.name = "pump";
  const p = new MeshBuilder();
  p.tube(0.024, 0.17, m.darkWood, [0, -0.031, -0.28], 20);
  for (let i = 0; i < 9; i++) p.tube(0.0252, 0.007, m.darkWood, [0, -0.031, -0.215 - i * 0.015], 20);
  p.tube(0.021, 0.012, m.polymer, [0, -0.031, -0.37], 20);
  for (const x of [-0.015, 0.015]) p.box(0.003, 0.006, 0.13, m.steel, [x, -0.03, -0.15]);
  pump.add(p.build("pump"));
  root.add(pump);

  const shell = new THREE.Group();
  shell.name = "loose-shell";
  const s = new MeshBuilder();
  s.tube(0.0095, 0.05, m.shellRed, [0, 0, -0.01], 12);
  s.tube(0.0102, 0.014, m.brass, [0, 0, 0.022], 12);
  shell.add(s.build("shell"));
  shell.position.set(0, -0.09, -0.02);
  shell.visible = false;
  root.add(shell);

  const muzzle = marker("muzzle", 0, 0, -0.665);
  const laser = marker("laser", 0, -0.064, -0.54);
  root.add(muzzle, laser);
  return { root, muzzle, laser, magazine: null, pump, bolt: null, shell, length: 1.12 };
}
