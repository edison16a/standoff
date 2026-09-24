import * as THREE from "three";
import { cloth, leather, metal, own, satin, skin } from "../../kit/materials";
import type { MeshBuilder, V3 } from "../../kit/mesh-builder";
import { ARM, dressBody, face, limb, onTorso } from "../anatomy";
import { BODY } from "../body-rig";
import type { Dresser } from "../dresser";
import type { Look } from "./look";

const PURPLE = 0x7b2cbf;
const DEEP = 0x3c096c;
const NIGHT = 0x240046;
const GOLD = 0xf4c542;
const PLUME = 0xff5d8f;

/**
 * Duchess: a musketeer in a royal purple doublet with puffed gold sleeves,
 * a lace collar, a baldric and a short cape, gold stockings and a plumed
 * cavalier hat. The player's colour is the baldric, the hat band and the
 * cape's lining.
 */
export function dressDuchess(d: Dresser, look: Look): void {
  const doublet = cloth(PURPLE, 0.7);
  const gold = satin(GOLD);
  const trim = satin(look.trim);
  const lace = cloth(0xfbf6ec, 0.9);
  const brass = metal(0xe0b64a, 0.3);
  dressBody(d, {
    top: doublet,
    sleeve: gold,
    forearm: doublet,
    glove: leather(DEEP, 0.5),
    freeHand: leather(DEEP, 0.5),
    seat: cloth(DEEP, 0.75),
    thigh: cloth(DEEP, 0.75),
    shin: satin(GOLD),
    shoe: leather(NIGHT, 0.45),
    sole: leather(0x160028, 0.7),
  });

  const chest = d.on("chest");
  // Gold buttons down the front, a peplum flaring below the waist, gold at its hem.
  for (let i = 0; i < 6; i++) chest.sphere(0.011, brass, onTorso(0.08 + i * 0.07, 0, 1, 0.006), [1, 1, 1], 8);
  chest.cylinder(0.14, 0.168, 0.1, doublet, [0, -0.02, 0], [0, 0, 0], 28, [0.76, 1, 1.12]);
  chest.add(new THREE.TorusGeometry(0.168, 0.007, 6, 36), gold, [0, -0.07, 0], [Math.PI / 2, 0, 0], [0.76, 1.12, 1]);
  // The baldric, over the sword shoulder and across to the far hip.
  const baldric: V3[] = [onTorso(0.47, 0.9, 1, 0.012), onTorso(0.36, 0.2, 1, 0.012), onTorso(0.2, -0.7, 1, 0.012), onTorso(0.04, -1.4, 1, 0.012)];
  chest.tube(baldric, 0.016, trim, 24, 6);
  chest.tube([onTorso(0.47, 2.2, 1, 0.012), onTorso(0.3, 3.2, 1, 0.012), onTorso(0.1, 4.2, 1, 0.012)], 0.016, trim, 16, 6);
  // A falling lace collar over the shoulders.
  chest.cylinder(0.075, 0.15, 0.03, lace, [0.005, 0.5, 0], [0, 0, 0], 28, [0.85, 1, 1]);
  chest.add(new THREE.TorusGeometry(0.15, 0.008, 6, 36), lace, [0.005, 0.485, 0], [Math.PI / 2, 0, 0], [0.85, 1, 1]);

  // Puffed and slashed upper sleeves, with lace at the wrists.
  for (const side of ["F", "B"] as const) {
    const up = d.on(`upperArm${side}`);
    limb(up, BODY.upperArm * 0.8, { top: 0.068, bulge: 0.078, bottom: 0.05, bulgeAt: 0.45 }, satin(GOLD));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      up.tube([[Math.cos(a) * 0.066, -0.02, Math.sin(a) * 0.066], [Math.cos(a) * 0.08, -0.11, Math.sin(a) * 0.08], [Math.cos(a) * 0.052, -0.23, Math.sin(a) * 0.052]], 0.006, doublet, 10, 4);
    }
    d.on(`forearm${side}`).cylinder(0.048, 0.058, 0.035, lace, [0, -BODY.forearm + 0.01, 0], [0, 0, 0], 16);
    // Breeches gathered at the knee with a gold garter.
    const shin = d.on(`shin${side}`);
    shin.cylinder(0.068, 0.062, 0.07, cloth(DEEP, 0.75), [0.004, -0.02, 0], [0, 0, 0], 18);
    shin.cylinder(0.064, 0.064, 0.012, gold, [0.004, -0.058, 0], [0, 0, 0], 18);
    d.on(`foot${side}`).box(0.03, 0.022, 0.05, brass, [0.1, -0.03, 0], [0, 0, 0], 0.004);
  }
  limb(d.on("forearmF"), 0.09, { ...ARM.fore, top: 0.056, bulge: 0.058, bottom: 0.05 }, leather(DEEP, 0.5), BODY.forearm - 0.1);

  dressHead(d.on("head"), trim);
  d.attach("chest", cape(trim));
}

/** A short cape across the back, purple outside and the player's colour inside. */
function cape(trim: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = "cape";
  // Over the back shoulder, round its outside and down the back.
  const shape = new THREE.CylinderGeometry(0.1, 0.24, 0.4, 24, 4, true, Math.PI * 0.75, Math.PI * 1.05);
  const outside = new THREE.Mesh(shape, cloth(PURPLE, 0.72));
  const lining = own(trim as THREE.MeshStandardMaterial, { side: THREE.BackSide });
  const inside = new THREE.Mesh(shape, lining);
  for (const mesh of [outside, inside]) {
    mesh.position.set(-0.03, 0.3, -0.17);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

function dressHead(b: MeshBuilder, trim: THREE.Material): void {
  const hat = cloth(NIGHT, 0.7);
  face(b, { skin: skin(0xf1c6a6), brow: cloth(0x2b1a12, 0.9), eye: satin(0x2a1a40), lips: satin(0xb0485e) });
  // A domino mask across the eyes, and long dark hair falling behind.
  const domino = new THREE.SphereGeometry(0.104, 24, 6, Math.PI - 0.9, 1.8, 1.35, 0.37);
  b.add(domino, satin(NIGHT), [0.004, 0.19, 0], [0, 0, 0], [1.04, 1.12, 0.94]);
  // Eyes glinting through the mask's holes.
  for (const z of [-0.034, 0.034]) {
    b.sphere(0.012, satin(0xf4f1ea), [0.104, 0.197, z], [0.45, 0.75, 1], 10);
    b.sphere(0.0065, satin(0x2a1a40), [0.109, 0.197, z], [0.5, 1, 1], 8);
  }
  const hair = cloth(0x2b1a12, 0.95);
  b.sphere(0.104, hair, [-0.02, 0.215, 0], [1, 1.02, 0.95], 18);
  for (const side of [-1, 1]) {
    b.sphere(0.03, hair, [0.03, 0.13, side * 0.095], [0.8, 1.5, 0.75], 10);
    b.sphere(0.026, hair, [0.01, 0.07, side * 0.09], [0.8, 1.4, 0.8], 10);
  }
  for (const [x, y, z, s] of [[-0.08, 0.12, 0.05, 0.05], [-0.085, 0.12, -0.05, 0.05], [-0.1, 0.06, 0.03, 0.045], [-0.1, 0.06, -0.03, 0.045], [-0.105, 0.0, 0, 0.042]] as const) {
    b.sphere(s, hair, [x, y, z], [0.9, 1.3, 0.9], 12);
  }
  // The cavalier hat: a wide brim cocked up on one side, a crown, a band and the plume.
  b.cylinder(0.23, 0.23, 0.012, hat, [0, 0.255, 0], [0.16, 0, 0.06], 40, [1, 1, 0.92]);
  b.lathe([[0, 0.41], [0.07, 0.405], [0.1, 0.375], [0.112, 0.32], [0.116, 0.255], [0, 0.255]].reverse() as [number, number][], hat, [0, 0, 0], [1, 1, 0.94], 28, [0.12, 0, 0.04]);
  b.add(new THREE.TorusGeometry(0.114, 0.013, 6, 32), trim, [0, 0.278, 0], [Math.PI / 2 + 0.12, 0, 0.04], [1, 0.94, 1]);
  feather(b, [[0.02, 0.3, -0.12], [-0.06, 0.4, -0.11], [-0.16, 0.44, -0.07], [-0.26, 0.41, -0.03], [-0.33, 0.33, 0.0]], satin(PLUME), 0.036);
  feather(b, [[0.0, 0.3, -0.11], [-0.07, 0.37, -0.13], [-0.17, 0.36, -0.12], [-0.24, 0.3, -0.09]], satin(0xfff1f6), 0.024);
}

/** A curling ostrich feather: a quill with soft barbs down it, widest in the middle. */
function feather(b: MeshBuilder, spine: V3[], material: THREE.Material, width: number): void {
  const curve = new THREE.CatmullRomCurve3(spine.map((p) => new THREE.Vector3(...p)));
  const count = 14;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = curve.getPoint(t);
    const size = width * Math.sin(Math.PI * (0.15 + 0.85 * t)) + 0.006;
    b.sphere(size, material, [p.x, p.y, p.z], [1.2, 0.55, 1.5], 10);
  }
}
