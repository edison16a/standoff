import * as THREE from "three";
import { cloth, leather, metal, own, pinstripe, satin, skin } from "../../kit/materials";
import type { MeshBuilder, V3 } from "../../kit/mesh-builder";
import { dressBody, face, limb, onTorso } from "../anatomy";
import { BODY } from "../body-rig";
import type { Dresser } from "../dresser";
import type { Look } from "./look";

const NAVY = 0x1d3557;
const TAN = 0xd4a373;
const BOOT = 0x2b1b12;
const BROWN = 0x6b4226;
const RED = 0xe63946;

/**
 * Marrow: a sea captain in a long navy coat with brass buttons, a cream
 * waistcoat, a red bandana and a beard, tan trousers tucked into tall
 * boots, and a curved saber. The player's colour is the sash at his waist,
 * the big turned back cuffs and the coat's lining.
 */
export function dressMarrow(d: Dresser, look: Look): void {
  const coat = cloth(NAVY, 0.74);
  const trim = satin(look.trim);
  const brass = metal(0xd9a93a, 0.3);
  const boot = leather(BOOT, 0.42);
  dressBody(d, {
    top: coat,
    sleeve: coat,
    glove: leather(BROWN, 0.5),
    freeHand: leather(BROWN, 0.5),
    seat: pinstripe(TAN),
    thigh: pinstripe(TAN),
    shin: boot,
    shoe: boot,
    sole: leather(0x140c07, 0.7),
    swell: 1.04,
  });

  const chest = d.on("chest");
  // The cream waistcoat showing down the open front, and the navy lapels either side.
  chest.tube([0.06, 0.16, 0.26, 0.36, 0.44].map((y) => onTorso(y, 0, 1.04, 0.002)), 0.045, cloth(0xefe2c6, 0.85), 16, 10);
  for (const side of [-1, 1]) {
    const lapel: V3[] = [0.12, 0.22, 0.32, 0.42, 0.49].map((y, i) => onTorso(y, side * (0.42 + i * 0.1), 1.04, 0.01));
    chest.tube(lapel, 0.018, coat, 16, 6);
    for (let i = 0; i < 4; i++) chest.sphere(0.012, brass, onTorso(0.14 + i * 0.09, side * 0.62, 1.04, 0.016), [1, 1, 0.8], 10);
  }
  // A white cravat at the throat.
  chest.sphere(0.04, cloth(0xf8f4ea, 0.9), onTorso(0.47, 0, 1.04, 0.0), [0.8, 1.1, 1], 12);
  // Sash, knotted on the hip, with a belt and buckle over it.
  chest.cylinder(0.143, 0.146, 0.07, trim, [0, 0.03, 0], [0, 0, 0], 28, [0.77, 1, 1.17]);
  chest.cylinder(0.147, 0.147, 0.03, leather(BROWN, 0.5), [0, 0.035, 0], [0, 0, 0], 28, [0.78, 1, 1.18]);
  chest.box(0.012, 0.04, 0.05, brass, onTorso(0.035, 0, 1.04, 0.014), [0, 0, 0], 0.004);
  chest.sphere(0.03, trim, onTorso(0.03, 1.35, 1.04, 0.02), [0.9, 1, 0.8], 10);
  chest.tube([onTorso(0.03, 1.35, 1.04, 0.03), [0.02, -0.08, 0.2], [0.0, -0.2, 0.2]], 0.014, trim, 12, 6);

  for (const side of ["F", "B"] as const) {
    // Big turned back cuffs with buttons.
    const fore = d.on(`forearm${side}`);
    fore.cylinder(0.068, 0.058, 0.09, trim, [0, -BODY.forearm + 0.06, 0], [0, 0, 0], 20);
    for (let i = 0; i < 2; i++) fore.sphere(0.009, brass, [-0.064, -BODY.forearm + 0.04 + i * 0.03, 0], [1, 1, 1], 8);
    // The coat's skirt, split behind each leg, lined in the player's colour.
    d.attach(`thigh${side}`, coatTail(trim));
    // Boots to the knee with a folded cuff.
    d.on(`shin${side}`).cylinder(0.078, 0.066, 0.08, boot, [0.006, -0.04, 0], [0, 0, 0], 20);
  }
  limb(d.on("upperArmF"), BODY.upperArm, { top: 0.058, bulge: 0.06, bottom: 0.046, bulgeAt: 0.3 }, coat);

  dressHead(d.on("head"), satin(RED));
}

/** One back panel of the long coat, hanging from the hip to the knee. */
function coatTail(trim: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = "coat-tail";
  const shape = new THREE.CylinderGeometry(0.1, 0.125, 0.5, 16, 3, true, Math.PI * 0.85, Math.PI * 1.1);
  const lining = own(trim as THREE.MeshStandardMaterial, { side: THREE.BackSide });
  for (const material of [cloth(NAVY, 0.74), lining]) {
    const mesh = new THREE.Mesh(shape, material);
    mesh.position.set(-0.015, -0.2, 0);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

function dressHead(b: MeshBuilder, bandana: THREE.Material): void {
  const beard = cloth(0x3a2417, 0.95);
  face(b, { skin: skin(0xc98b5e), brow: beard, eye: satin(0x1d1410), white: satin(0xf2ece2) });
  // A full beard along the jaw, and a moustache.
  b.sphere(0.07, beard, [0.04, 0.115, 0], [1.05, 0.8, 1.02], 16);
  b.sphere(0.03, beard, [0.1, 0.09, 0], [0.9, 1, 1.2], 10);
  b.box(0.016, 0.014, 0.06, beard, [0.106, 0.138, 0], [0, 0, 0], 0.006);
  // The bandana: a cap of red cloth from the brow up, knotted behind with two tails.
  const cap = new THREE.SphereGeometry(0.106, 26, 14, 0, Math.PI * 2, 0, 1.45);
  b.add(cap, bandana, [-0.004, 0.2, 0], [0, 0, -0.18], [1.03, 1.12, 0.94]);
  b.sphere(0.03, bandana, [-0.108, 0.22, 0], [0.9, 1, 1.2], 10);
  b.tube([[-0.11, 0.21, 0.02], [-0.16, 0.16, 0.04], [-0.2, 0.08, 0.05]], 0.016, bandana, 10, 6);
  b.tube([[-0.11, 0.21, -0.02], [-0.15, 0.14, -0.05], [-0.17, 0.06, -0.07]], 0.014, bandana, 10, 6);
  // A gold ring in the ear toward the camera.
  b.add(new THREE.TorusGeometry(0.013, 0.003, 6, 16), metal(0xf2c14e, 0.25), [0.005, 0.155, 0.1], [0, 0, 0]);
}
