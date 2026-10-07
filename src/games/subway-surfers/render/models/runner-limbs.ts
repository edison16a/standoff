import type { Dresser } from "./rig";
import { denim, fleece, matte, satin, shadeOf, type Look } from "./runner-look";
import { highTop } from "./runner-shoe";
import { arc, stitches } from "./shapes";

/**
 * Arms in the hoodie's sleeves with ribbed cuffs and mitten hands, and
 * legs in light jeans with stitched seams and back pockets, flaring a
 * little over the high tops. Sleeves and legs are slim, so a pumping arm
 * or a folded knee never pokes through the body.
 */
export function dressLimbs(dress: Dresser, look: Look): void {
  for (const side of [-1, 1] as const) {
    arm(dress, look, side);
    leg(dress, look, side);
  }
  seat(dress, look);
}

function arm(dress: Dresser, look: Look, side: -1 | 1): void {
  const s = side < 0 ? "L" : "R";
  const sleeve = fleece(look.hoodie);
  dress.on(`shoulder${s}`).capsule(0.058, 0.15, sleeve, [0, -0.115, 0]);
  const forearm = dress.on(`elbow${s}`);
  forearm.sphere(0.056, sleeve, [0, 0, 0], [1, 1, 1], 12);
  forearm.capsule(0.053, 0.12, sleeve, [0, -0.085, 0]);
  // The sleeve bunches above a ribbed cuff.
  forearm.post(0.06, 0.03, sleeve, [0, -0.155, 0], 14, 0.055);
  forearm.post(0.052, 0.045, fleece(look.hoodieRib), [0, -0.195, 0], 14);
  // Big mitten hands with a thumb, easy to read in motion.
  const hand = dress.on(`hand${s}`);
  const skin = matte(look.skin);
  hand.sphere(0.056, skin, [0, -0.045, -0.004], [0.82, 1.08, 1.02], 14);
  hand.sphere(0.026, skin, [-side * 0.036, -0.03, -0.03], [1, 1.35, 1], 10, [0.4, 0, 0]);
  // The knuckles, a row of bumps round the curled fingers.
  for (let i = 0; i < 4; i++) hand.sphere(0.019, skin, [side * 0.012, -0.088, -0.032 + i * 0.021], [1.05, 0.9, 0.9], 8);
  if (side < 0) dress.on("elbowL").post(0.056, 0.022, satin(look.accent), [0, -0.225, 0], 14);
}

function leg(dress: Dresser, look: Look, side: -1 | 1): void {
  const s = side < 0 ? "L" : "R";
  const jeans = denim(look.jeans);
  const thread = satin(look.thread);
  dress.on(`hip${s}`).capsule(0.08, 0.22, jeans, [0, -0.17, 0]);
  const shin = dress.on(`knee${s}`);
  shin.sphere(0.075, jeans, [0, 0, 0], [1, 1, 1], 14);
  shin.capsule(0.07, 0.19, jeans, [0, -0.14, 0]);
  // The hem flares and stacks over the high top's collar.
  shin.post(0.088, 0.075, jeans, [0, -0.29, 0], 16, 0.072);
  shin.post(0.091, 0.022, denim(shadeOf(look.jeans, 0.9)), [0, -0.33, 0], 16, 0.089);
  // The outer seam, stitched down each leg.
  stitches(dress.detail(`hip${s}`), [[side * 0.082, -0.06, 0.004], [side * 0.082, -0.34, 0.004]], thread);
  stitches(dress.detail(`knee${s}`), [[side * 0.073, -0.03, 0.004], [side * 0.073, -0.24, 0.004], [side * 0.09, -0.3, 0.004]], thread);
  highTop(dress.on(`ankle${s}`), dress.detail(`ankle${s}`), look, side);
}

/** The seat of the jeans: a waistband with loops, two stitched back pockets and a leather patch. */
function seat(dress: Dresser, look: Look): void {
  const b = dress.on("hips");
  const jeans = denim(look.jeans);
  b.box(0.32, 0.16, 0.2, jeans, [0, -0.03, 0], undefined, 0.07);
  b.box(0.326, 0.036, 0.206, denim(shadeOf(look.jeans, 0.92)), [0, 0.036, 0], undefined, 0.015);
  for (const x of [-0.11, 0, 0.11]) b.box(0.016, 0.04, 0.008, jeans, [x, 0.036, 0.105]);
  const d = dress.detail("hips");
  const thread = satin(look.thread);
  for (const x of [-1, 1]) {
    d.box(0.085, 0.085, 0.008, denim(shadeOf(look.jeans, 0.95)), [x * 0.07, -0.04, 0.102], [0.1, 0, 0], 0.012);
    stitches(d, arc([x * 0.07, -0.025, 0.108], 0.036, 0.05, Math.PI, Math.PI * 2, 8), thread, 0.01, 0.006);
  }
  d.box(0.05, 0.028, 0.006, matte(0x8a5a32), [0.075, 0.036, 0.11]);
  // The fly, a curved line of stitching at the front.
  stitches(d, [[0.03, 0.02, -0.102], [0.03, -0.06, -0.1], [0.0, -0.085, -0.1]], thread, 0.01, 0.006);
}
