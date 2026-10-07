import * as THREE from "three";
import type { V3 } from "../mesh-builder";
import type { Dresser } from "./rig";
import { denim, fleece, gloss, matte, satin, shadeOf, type Look } from "./runner-look";
import { stitches } from "./shapes";

/**
 * The runner's top half: a grey hoodie with its hood down behind the neck,
 * a pale denim vest over it with a collar, chest pockets and stitched seams,
 * and a red neckerchief. Seen from behind, the hood, the vest's pointed
 * yoke and its seams carry the silhouette.
 */
export function dressTorso(dress: Dresser, look: Look): void {
  dress.on("neck").post(0.05, 0.11, matte(look.skin), [0, 0.03, 0], 14);
  chest(dress, look);
  belly(dress, look);
}

function chest(dress: Dresser, look: Look): void {
  const b = dress.on("chest");
  const hoodie = fleece(look.hoodie);
  const vest = denim(look.vest);
  const thread = satin(look.thread);
  b.box(0.31, 0.28, 0.2, hoodie, [0, 0.07, 0], undefined, 0.09);
  // Sleeve heads under the vest's arm holes.
  for (const x of [-1, 1]) b.sphere(0.064, hoodie, [x * 0.175, 0.17, 0], [1, 1, 1.05], 14);
  // The vest: a back and two fronts, open down the middle over the hoodie.
  b.box(0.33, 0.27, 0.12, vest, [0, 0.075, 0.048], undefined, 0.055);
  for (const x of [-1, 1]) {
    b.box(0.122, 0.262, 0.12, vest, [x * 0.1, 0.075, -0.044], [0, 0, x * 0.03], 0.05);
    // A chest pocket with a buttoned flap.
    b.box(0.07, 0.034, 0.014, denim(shadeOf(look.vest, 0.88)), [x * 0.098, 0.135, -0.106], undefined, 0.006);
  }
  // The hood, bunched behind the neck, its grey lining showing at the top.
  b.sphere(0.12, hoodie, [0, 0.225, 0.088], [1.32, 0.56, 0.78], 18, [-0.3, 0, 0]);
  b.sphere(0.085, fleece(look.hoodieRib), [0, 0.248, 0.072], [1.3, 0.4, 0.7], 14, [-0.3, 0, 0]);
  // The collar stands round the neck, open at the front, its points folded down onto the chest.
  const collar = new THREE.TorusGeometry(0.082, 0.024, 8, 22, Math.PI * 1.55);
  collar.rotateX(Math.PI / 2);
  collar.rotateY(-Math.PI * 0.5 - Math.PI * 0.775);
  b.add(collar, vest, [0, 0.205, 0.005], undefined, [1, 0.85, 1]);
  for (const x of [-1, 1]) b.box(0.065, 0.06, 0.014, vest, [x * 0.052, 0.19, -0.1], [-0.35, 0, x * 0.75], 0.008);
  neckerchief(dress, look);

  const d = dress.detail("chest");
  for (const x of [-1, 1]) {
    d.sphere(0.009, gloss(0xd9dde4), [x * 0.098, 0.124, -0.115], [1, 1, 0.5], 8);
    // Stitching down each front edge, round each pocket flap and down the back panels.
    stitches(d, [[x * 0.04, 0.19, -0.106], [x * 0.042, -0.05, -0.106]], thread);
    stitches(d, [[x * 0.065, 0.118, -0.114], [x * 0.131, 0.118, -0.114]], thread, 0.01, 0.007);
    stitches(d, [[x * 0.075, 0.13, 0.112], [x * 0.085, -0.055, 0.112]], thread);
  }
  // The pointed yoke across the upper back.
  stitches(d, [[-0.155, 0.16, 0.11], [0, 0.11, 0.112], [0.155, 0.16, 0.11]], thread);
  stitches(d, [[-0.155, 0.145, 0.11], [0, 0.095, 0.112], [0.155, 0.145, 0.11]], thread);
}

/** A red neckerchief: a band round the neck, a knot at the side and its point hanging on the chest. */
function neckerchief(dress: Dresser, look: Look): void {
  const b = dress.on("chest");
  const red = satin(look.bandana);
  const band = new THREE.TorusGeometry(0.066, 0.02, 8, 20);
  band.rotateX(Math.PI / 2);
  b.add(band, red, [0, 0.232, -0.004], [0.12, 0, 0]);
  b.box(0.11, 0.11, 0.018, red, [0, 0.172, -0.098], [-0.28, 0, Math.PI / 4], 0.012);
  b.sphere(0.026, red, [0.058, 0.226, -0.045], [1, 0.9, 1], 10);
  for (const z of [0.05, -0.06]) b.box(0.03, 0.06, 0.012, red, [0.075, 0.2, -0.045], [0, 0, 0.4 + z * 3], 0.006);
  // A scatter of white dots, like a bandana print.
  const d = dress.detail("chest");
  const dots: V3[] = [[0, 0.155, -0.112], [-0.025, 0.18, -0.106], [0.025, 0.18, -0.106], [0, 0.205, -0.1], [0.026, 0.13, -0.116]];
  for (const p of dots) d.sphere(0.0065, matte(0xffffff), p, [1, 1, 0.4], 6);
}

/** The belly: the hoodie and the vest's lower half, a stitched hem, and the hoodie's ribbed band below it. */
function belly(dress: Dresser, look: Look): void {
  const b = dress.on("spine");
  const vest = denim(look.vest);
  const thread = satin(look.thread);
  b.box(0.29, 0.2, 0.19, fleece(look.hoodie), [0, 0.08, 0], undefined, 0.08);
  b.box(0.31, 0.13, 0.11, vest, [0, 0.105, 0.046], undefined, 0.05);
  for (const x of [-1, 1]) b.box(0.115, 0.13, 0.11, vest, [x * 0.094, 0.105, -0.042], [0, 0, x * 0.02], 0.045);
  b.box(0.3, 0.05, 0.2, fleece(look.hoodieRib), [0, 0.0, 0], undefined, 0.022);
  const d = dress.detail("spine");
  // The hem stitched all round, and ribs down the hoodie's band.
  stitches(d, [[-0.15, 0.055, 0.1], [0.15, 0.055, 0.1]], thread);
  for (const x of [-1, 1]) stitches(d, [[x * 0.04, 0.055, -0.098], [x * 0.145, 0.055, -0.095]], thread);
  for (let i = -6; i <= 6; i++) {
    d.box(0.006, 0.042, 0.006, fleece(shadeOf(look.hoodieRib, 0.86)), [i * 0.022, 0, 0.101]);
    d.box(0.006, 0.042, 0.006, fleece(shadeOf(look.hoodieRib, 0.86)), [i * 0.022, 0, -0.101]);
  }
}
