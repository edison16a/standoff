import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import { boreHole, gunMaterials, laserModule, marker, profile, type GunMaterials, type GunModel } from "./gun-kit";
import { portSlide, spareOf } from "./moving-parts";

const X = Math.PI / 2;

/**
 * A compact submachine gun in the classic German pattern: a round
 * receiver with the cocking tube over the barrel, a slim ribbed
 * handguard, hooded front sight and drum rear sight, a curved magazine
 * and a sliding two rod stock.
 */
export function buildSmg(): GunModel {
  const m = gunMaterials();
  const root = new THREE.Group();
  root.name = "smg";
  const b = new MeshBuilder();

  // Receiver, with the grooves of the scope claw mount on top.
  b.box(0.042, 0.056, 0.3, m.metal, [0, -0.004, -0.04], undefined, 0.012);
  for (let z = -0.14; z < 0.06; z += 0.04) b.box(0.03, 0.004, 0.012, m.steel, [0, 0.025, z]);
  b.box(0.002, 0.018, 0.05, m.hole, [0.0215, 0.004, -0.02]);
  b.box(0.03, 0.03, 0.05, m.metal, [0, -0.038, -0.09], undefined, 0.004);

  // Cocking tube running forward over the barrel, and the barrel itself.
  b.tube(0.0095, 0.17, m.metal, [0, 0.022, -0.27], 16);
  b.tube(0.009, 0.1, m.metal, [0, 0, -0.36], 16);
  b.tube(0.0125, 0.03, m.steel, [0, 0, -0.385], 16);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.box(0.006, 0.006, 0.02, m.steel, [Math.cos(a) * 0.014, Math.sin(a) * 0.014, -0.378]);
  }
  boreHole(b, m, 0.006, 0, -0.401);

  // Slim polymer handguard with finger ribs.
  b.box(0.05, 0.05, 0.15, m.polymer, [0, -0.012, -0.265], undefined, 0.014);
  for (let z = -0.21; z > -0.33; z -= 0.02) b.box(0.052, 0.005, 0.007, m.polymer, [0, -0.034, z]);

  // Sights: a hooded post at the front and a drum at the back.
  b.box(0.012, 0.022, 0.03, m.metal, [0, 0.042, -0.3]);
  b.add(new THREE.TorusGeometry(0.013, 0.003, 8, 20), m.metal, [0, 0.058, -0.3]);
  b.box(0.002, 0.016, 0.002, m.steel, [0, 0.055, -0.3]);
  b.tube(0.013, 0.022, m.metal, [0, 0.042, 0.075], 16, 0.013, [0, 0, X]);
  b.box(0.018, 0.012, 0.03, m.metal, [0, 0.03, 0.075]);

  // Trigger group, grip and selector.
  b.box(0.034, 0.034, 0.11, m.polymer, [0, -0.045, 0.035], undefined, 0.006);
  profile(b, [[0.045, -0.055], [0.09, -0.055], [0.118, -0.152], [0.1, -0.166], [0.072, -0.162], [0.066, -0.12], [0.052, -0.1]], 0.032, m.polymer);
  for (let i = 0; i < 4; i++) b.box(0.034, 0.004, 0.024, m.polymer, [0, -0.08 - i * 0.02, 0.06 + i * 0.006], [0.28, 0, 0]);
  b.box(0.012, 0.005, 0.06, m.polymer, [0, -0.078, 0.005]);
  b.box(0.005, 0.022, 0.006, m.steel, [0, -0.068, 0.012], [0.3, 0, 0]);
  b.tube(0.007, 0.004, m.steel, [-0.019, -0.04, 0.05], 12, 0.007, [0, 0, X]);

  // Two rod stock and butt plate.
  for (const x of [-0.013, 0.013]) b.tube(0.0045, 0.23, m.steel, [x, -0.005, 0.22], 10);
  b.box(0.05, 0.1, 0.018, m.rubber, [0, -0.035, 0.34], undefined, 0.006);
  b.box(0.04, 0.03, 0.03, m.metal, [0, 0.0, 0.325], undefined, 0.004);

  laserModule(b, m, 0, -0.052, -0.3);
  root.add(b.build("smg-body"));

  const { magazine, bolt } = smgParts(m, root);

  const muzzle = marker("muzzle", 0, 0, -0.405);
  const laser = marker("laser", 0, -0.052, -0.34);
  root.add(muzzle, laser);
  // The ejection port, on the right of the receiver.
  const ejector = marker("ejector", 0.024, 0.004, -0.02);
  root.add(ejector);
  return { root, muzzle, laser, ejector, magazine, pump: null, bolt, shell: null, length: 0.75 };
}

// Moving parts. Everything below is animated by the gun rig and kept apart
// from the still body above.

/** Curved steel magazine, built as a stack of slightly turned segments. */
function smgMagazine(m: GunMaterials): THREE.Group {
  const magazine = new THREE.Group();
  magazine.name = "magazine";
  const mb = new MeshBuilder();
  let y = 0;
  let z = 0;
  for (let i = 0; i < 6; i++) {
    const a = 0.05 + i * 0.07;
    mb.box(0.024, 0.036, 0.034, m.metal, [0, y - 0.018, z], [a, 0, 0], 0.003);
    y -= Math.cos(a) * 0.033;
    z -= Math.sin(a) * 0.033;
  }
  mb.box(0.03, 0.01, 0.045, m.polymer, [0, y - 0.01, z - 0.004], [0.45, 0, 0], 0.003);
  mb.box(0.018, 0.006, 0.02, m.brass, [0, 0.003, 0.004]);
  magazine.add(mb.build("magazine"));
  return magazine;
}

/** The cocking handle rests at ten o'clock on the tube, tipped up off the left side. */
const SMG_HANDLE_TILT = -0.35;

/**
 * The magazine and its spare, the bolt in the ejection port, and the
 * cocking handle at the front left of the tube over the barrel. The
 * handle's origin is on the tube's axis, so turning it about z flips it
 * up into the notch it locks in, as the real one does.
 */
function smgParts(m: GunMaterials, root: THREE.Group): { magazine: THREE.Object3D; bolt: THREE.Object3D } {
  const magazine = smgMagazine(m);
  magazine.position.set(0, -0.052, -0.09);
  const spare = spareOf(magazine, () => smgMagazine(m));

  const bolt = new THREE.Group();
  bolt.name = "bolt";
  const bb = new MeshBuilder();
  bb.box(0.026, 0.007, 0.009, m.steel, [-0.021, 0, 0.002], [0, 0.25, 0], 0.002);
  bb.sphere(0.0062, m.polymer, [-0.035, 0, -0.002], [1, 1, 1.2], 10);
  bolt.add(bb.build("bolt"));
  bolt.position.set(0, 0.022, -0.3);
  bolt.rotation.z = SMG_HANDLE_TILT;

  // The slot the handle runs back along, cut in the tube's left side.
  const slot = new MeshBuilder();
  slot.box(0.002, 0.004, 0.085, m.hole, [0, 0.0098, -0.005]);
  const slotGroup = slot.build("slot");
  slotGroup.position.set(0, 0.022, -0.26);
  slotGroup.rotation.z = SMG_HANDLE_TILT + Math.PI / 2;

  const slide = portSlide(m, 0.0222, 0.004, 0.005, 0.017, 0.05);
  root.add(magazine, spare, bolt, slide, slotGroup);
  return { magazine, bolt };
}
