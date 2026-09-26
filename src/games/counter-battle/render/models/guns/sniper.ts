import * as THREE from "three";
import { ball, box, cyl, paint, rod, roundBox } from "../../geo";
import { CUP_L, GRIP_R, GunPiece, marker, tubeZ, type GunModel } from "./gun-kit";

const OLIVE = "#4a5236";
const BLACK = "#17191c";

/**
 * The sniper rifle: a long fluted barrel with a big brake, a scope with
 * a wide front lens, a bolt handle on the right, a thumbhole stock with a
 * cheek riser, a folded bipod and a box magazine in the team colour.
 */
export function buildSniper(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("metal", paint(tubeZ(0.024, 0.024, 0.28, 18), BLACK, { at: [0, 0.07, 0.03] }));
  body.add("metal", paint(tubeZ(0.015, 0.012, 0.62), BLACK, { at: [0, 0.07, 0.48] }));
  body.add("metal", paint(roundBox(0.036, 0.036, 0.08, 0.008), "#23262b", { at: [0, 0.07, 0.83] }));
  for (const z of [0.81, 0.835, 0.86]) body.add("metal", paint(box(0.04, 0.012, 0.008), "#08090a", { at: [0, 0.07, z] }));
  // Stock: the long forend, a thumbhole grip and the cheek riser, in olive.
  body.add("poly", paint(roundBox(0.05, 0.055, 0.46, 0.02), OLIVE, { at: [0, 0.04, 0.3] }));
  body.add("poly", paint(roundBox(0.034, 0.1, 0.045, 0.012), OLIVE, { at: [0, -0.02, -0.03], rot: [0.3, 0, 0] }));
  body.add("poly", paint(roundBox(0.046, 0.06, 0.26, 0.02), OLIVE, { at: [0, 0.05, -0.18] }));
  body.add("poly", paint(roundBox(0.044, 0.05, 0.12, 0.018), OLIVE, { at: [0, -0.005, -0.26], rot: [0.12, 0, 0] }));
  body.add("poly", paint(roundBox(0.04, 0.03, 0.14, 0.012), accent, { at: [0, 0.092, -0.18] }));
  body.add("poly", paint(roundBox(0.048, 0.13, 0.024, 0.01), BLACK, { at: [0, 0.035, -0.33] }));
  body.add("metal", paint(box(0.008, 0.006, 0.07), BLACK, { at: [0, 0.012, 0.02] }));
  // The scope on its rings.
  body.add("metal", paint(tubeZ(0.02, 0.02, 0.3, 18), BLACK, { at: [0, 0.14, 0.06] }));
  body.add("metal", paint(tubeZ(0.02, 0.034, 0.07, 18), BLACK, { at: [0, 0.14, 0.24] }));
  body.add("metal", paint(tubeZ(0.034, 0.034, 0.04, 18), BLACK, { at: [0, 0.14, 0.295] }));
  body.add("metal", paint(tubeZ(0.024, 0.02, 0.04, 16), BLACK, { at: [0, 0.14, -0.1] }));
  body.add("glass", paint(cyl(0.03, 0.03, 0.004, 18), "#233a52", { at: [0, 0.14, 0.316], rot: [Math.PI / 2, 0, 0] }));
  body.add("glass", paint(cyl(0.02, 0.02, 0.004, 16), "#233a52", { at: [0, 0.14, -0.121], rot: [Math.PI / 2, 0, 0] }));
  body.add("metal", paint(cyl(0.012, 0.012, 0.03, 10), BLACK, { at: [0, 0.17, 0.06] }));
  body.add("metal", paint(cyl(0.012, 0.012, 0.03, 10), BLACK, { at: [0.03, 0.14, 0.06], rot: [0, 0, Math.PI / 2] }));
  for (const z of [-0.02, 0.14]) body.add("metal", paint(box(0.03, 0.05, 0.02), BLACK, { at: [0, 0.105, z] }));
  // The bipod, folded along the forend.
  for (const x of [-0.016, 0.016]) body.add("metal", rod([x, 0.01, 0.5], [x, 0.012, 0.28], 0.006, BLACK, 6));
  const geos = body.build(root);

  const mag = new THREE.Group();
  const m = new GunPiece().add("metal", paint(box(0.034, 0.08, 0.08), BLACK, { at: [0, -0.04, 0] }));
  m.add("poly", paint(box(0.038, 0.012, 0.084), accent, { at: [0, -0.082, 0] }));
  geos.push(...m.build(mag));
  mag.position.set(0, 0.03, 0.07);
  root.add(mag);

  // The bolt handle sticks out to the right and turns up to open.
  const bolt = new THREE.Group();
  const b = new GunPiece();
  b.add("metal", rod([0, 0, 0], [-0.06, -0.02, 0], 0.006, "#8d939c", 6));
  b.add("metal", paint(ball(0.014, 10, 8), BLACK, { at: [-0.064, -0.022, 0] }));
  geos.push(...b.build(bolt));
  bolt.position.set(-0.02, 0.08, -0.05);
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.07, 0.875);
  root.add(muzzle);
  return {
    root,
    muzzle,
    butt: new THREE.Vector3(0, 0.035, -0.34),
    fore: new THREE.Vector3(0.036, 0.0, 0.2),
    handR: GRIP_R,
    handL: CUP_L,
    mag,
    pump: null,
    bolt,
    handle: new THREE.Vector3(-0.085, 0.06, -0.06),
    port: null,
    dispose: () => geos.forEach((g) => g.dispose()),
  };
}
