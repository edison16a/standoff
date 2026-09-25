import * as THREE from "three";
import { cloth, leather, metal, own, satin } from "../../kit/materials";
import type { MeshBuilder } from "../../kit/mesh-builder";
import { dressBody, fist, onTorso } from "../anatomy";
import { BODY } from "../body-rig";
import type { Dresser } from "../dresser";
import type { Look } from "./look";

/** Darker than bare steel looks, because the key spot and the hall's reflections brighten polished plate a lot. */
const STEEL = 0xa9b1bb;
const DARK = 0x5a6573;
const EMERALD = 0x1f8a5b;
const GOLD = 0xc9a227;

/**
 * Iron: a knight in full plate. A breastplate under an emerald tabard,
 * layered pauldrons, elbow and knee cops, gauntlets, dark greaves and a
 * visored helm with a crest. The player's colour is the crest, the belt and
 * the tabard's border.
 */
export function dressIron(d: Dresser, look: Look): void {
  const plate = metal(STEEL, 0.5);
  const dark = metal(DARK, 0.34);
  const tabard = cloth(EMERALD, 0.72);
  const trim = satin(look.trim);
  const gold = metal(GOLD, 0.3);
  dressBody(d, {
    top: plate,
    sleeve: plate,
    glove: metal(0x98a2ad, 0.45),
    freeHand: metal(0x98a2ad, 0.45),
    seat: cloth(0x2e3238, 0.9),
    thigh: dark,
    shin: dark,
    shoe: metal(0x2d3440, 0.35),
    sole: leather(0x1a1512, 0.7),
    swell: 1.12,
  });

  const chest = d.on("chest");
  // The tabard over the breastplate, with a border in the player's colour and a gold emblem.
  chest.lathe([[0, -0.07], [0.155, -0.06], [0.155, 0.1], [0.165, 0.24], [0.178, 0.34], [0.172, 0.4], [0, 0.41]], tabard, [0, 0, 0], [0.78, 1, 1.2], 28);
  chest.add(new THREE.TorusGeometry(0.155, 0.01, 6, 36), trim, [0, -0.06, 0], [Math.PI / 2, 0, 0], [0.78, 1.2, 1]);
  chest.add(new THREE.TorusGeometry(0.17, 0.009, 6, 36), trim, [0, 0.4, 0], [Math.PI / 2, 0, 0], [0.78, 1.2, 1]);
  const emblem = new THREE.Shape();
  emblem.moveTo(0, 0.05);
  emblem.lineTo(0.035, 0.035);
  emblem.lineTo(0.03, -0.02);
  emblem.lineTo(0, -0.05);
  emblem.lineTo(-0.03, -0.02);
  emblem.lineTo(-0.035, 0.035);
  emblem.closePath();
  chest.extrude(emblem, 0.006, gold, onTorso(0.27, 1.1, 1.14, 0.01), [0, 1.1 + Math.PI / 2, 0], 0.002);
  // A gorget round the throat, and a belt in the player's colour.
  chest.lathe([[0.1, 0.44], [0.098, 0.49], [0.075, 0.53], [0.07, 0.55]], plate, [0, 0, 0], [0.9, 1, 1], 24);
  chest.cylinder(0.162, 0.162, 0.035, trim, [0, 0.02, 0], [0, 0, 0], 28, [0.8, 1, 1.22]);
  chest.box(0.012, 0.045, 0.05, gold, onTorso(0.02, 0, 1.14, 0.03), [0, 0, 0], 0.004);
  // Layered pauldrons over each shoulder, riveted in gold.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      chest.sphere(0.095 - i * 0.012, plate, [-0.005, 0.47 - i * 0.045, side * (0.19 + i * 0.012)], [1.05, 0.6, 0.95], 18);
    }
    chest.sphere(0.008, gold, [0.05, 0.49, side * 0.21], [1, 1, 1], 6);
    chest.add(new THREE.TorusGeometry(0.075, 0.007, 6, 28), gold, [-0.005, 0.405, side * 0.215], [Math.PI / 2 + side * 0.25, 0, 0], [1.05, 0.95, 1]);
  }

  for (const side of ["F", "B"] as const) {
    // Lames down the upper arm and a vambrace over the forearm.
    for (let i = 0; i < 3; i++) d.on(`upperArm${side}`).cylinder(0.063 - i * 0.003, 0.06 - i * 0.003, 0.05, plate, [0, -0.06 - i * 0.068, 0], [0, 0, 0], 18);
    d.on(`forearm${side}`).cylinder(0.054, 0.047, 0.15, plate, [0, -0.1, 0], [0, 0, 0], 18);
    // Couters at the elbows and poleyns at the knees, each with a fan.
    d.on(`upperArm${side}`).sphere(0.056, plate, [0, -BODY.upperArm, 0], [1, 1, 1], 14);
    d.on(`upperArm${side}`).cylinder(0.05, 0.05, 0.008, plate, [-0.04, -BODY.upperArm, 0], [0, 0, Math.PI / 2], 16, [1, 1, 1.3]);
    d.on(`thigh${side}`).sphere(0.066, plate, [0.01, -BODY.thigh, 0], [1, 1, 1], 14);
    d.on(`thigh${side}`).cylinder(0.055, 0.055, 0.008, plate, [0.05, -BODY.thigh, 0], [0, 0, Math.PI / 2], 16, [1, 1, 1.3]);
    // Gauntlet cuffs and the chainmail skirt's hem at the thigh.
    d.on(`forearm${side}`).cylinder(0.062, 0.045, 0.08, metal(0x98a2ad, 0.45), [0, -BODY.forearm + 0.03, 0], [0, 0, 0], 18);
    d.on(`thigh${side}`).cylinder(0.098, 0.1, 0.08, metal(0x6b727c, 0.55), [0, -0.03, 0], [0, 0, 0], 18);
    // Sabatons: plates across the top of the foot.
    for (let i = 0; i < 3; i++) d.on(`foot${side}`).box(0.05, 0.03, 0.09, metal(0x2d3440, 0.35), [0.07 + i * 0.045, -0.035 - i * 0.004, 0], [0, 0, -0.2], 0.012);
  }
  // Plate fingers on the sword gauntlet.
  fist(d.on("handF"), metal(0x98a2ad, 0.45));
  d.on("handF").box(0.06, 0.012, 0.064, gold, [0.03, 0.036, 0], [0, 0, 0], 0.004);
  // The tabard's skirt, split, so each half follows a leg into the lunge.
  d.attach("thighF", tabardPanel(doubleSided(EMERALD), trim, true));
  d.attach("thighB", tabardPanel(doubleSided(EMERALD), trim, false));

  dressHelm(d.on("head"), plate, trim);
}

/** The tabard's skirt is a single sheet, so both of its faces are drawn. */
function doubleSided(color: number): THREE.MeshStandardMaterial {
  return own(cloth(color, 0.72), { side: THREE.DoubleSide });
}

function dressHelm(b: MeshBuilder, plate: THREE.Material, trim: THREE.Material): void {
  const slit = metal(0x0c1016, 0.6, false);
  const mail = metal(0x6b727c, 0.5);
  // The bowl, rising to a gentle point, and a mail aventail down over the neck.
  b.lathe([[0, 0.41], [0.03, 0.405], [0.08, 0.375], [0.112, 0.325], [0.125, 0.255], [0.126, 0.17], [0.12, 0.1], [0.108, 0.055], [0, 0.055]].reverse() as [number, number][], plate, [0, 0, 0], [1.06, 1, 0.97], 32);
  b.lathe([[0.155, -0.05], [0.14, 0.0], [0.118, 0.06], [0.1, 0.07]].reverse() as [number, number][], mail, [0, 0, 0], [1, 1, 1], 24);
  // The visor juts forward like a hound's muzzle, ridged down the middle, with the eye slits above it.
  b.add(new THREE.ConeGeometry(0.105, 0.2, 28), plate, [0.15, 0.185, 0], [0, 0, -Math.PI / 2], [1, 1, 1.05]);
  b.sphere(0.106, plate, [0.05, 0.185, 0], [0.9, 1, 1.02], 24);
  b.rod([0.05, 0.29, 0], [0.245, 0.19, 0], 0.008, plate, 6);
  for (const z of [-1, 1]) b.box(0.05, 0.014, 0.065, slit, [0.13, 0.232, z * 0.048], [0, z * 0.45, -0.28], 0.005);
  for (let i = 0; i < 4; i++) {
    for (const z of [-1, 1]) b.sphere(0.0075, slit, [0.2 - i * 0.02, 0.16 - i * 0.004, z * (0.02 + i * 0.012)], [1, 1, 1], 6);
  }
  // Pivots, and a crest in the player's colour from the brow to the back.
  for (const z of [-1, 1]) b.sphere(0.02, metal(GOLD, 0.3), [0.0, 0.2, z * 0.122], [1, 1, 0.5], 12);
  for (let i = 0; i < 12; i++) {
    const a = 0.25 + i * 0.22;
    b.sphere(0.036 - i * 0.0014, trim, [Math.cos(a) * 0.13 - 0.025, 0.27 + Math.sin(a) * 0.14, 0], [1, 1.1, 0.42], 10);
  }
}

/** One panel of the tabard's split skirt, hanging over the front or back of a thigh. */
function tabardPanel(cloth: THREE.Material, trim: THREE.Material, front: boolean): THREE.Group {
  const group = new THREE.Group();
  const start = front ? -Math.PI * 0.08 + Math.PI / 2 - Math.PI * 0.42 : Math.PI * 1.5 - Math.PI * 0.42;
  const arc = Math.PI * 0.84;
  const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.34, 14, 2, true, start, arc), cloth);
  panel.position.y = -0.13;
  panel.castShadow = true;
  const hem: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const theta = start + (arc * i) / 10;
    hem.push(new THREE.Vector3(0.126 * Math.sin(theta), -0.3, 0.126 * Math.cos(theta)));
  }
  const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hem), 16, 0.008, 5), trim);
  group.add(panel, edge);
  return group;
}
