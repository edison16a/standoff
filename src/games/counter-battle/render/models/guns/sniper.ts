import * as THREE from "three";
import { ball, box, cyl, paint, rod, roundBox } from "../../geo";
import { CUP_L, GRIP_R, GunPiece, marker, tubeZ, type GunModel } from "./gun-kit";
import { airTank, portedBarrel } from "./paint-kit";

const NAVY = "#26314a";
const WHITE = "#e9edf2";
const INK = "#15171b";

/**
 * The paint sniper: a long ported barrel for a straight flying ball, a
 * scope with a wide front lens, a cocking handle on the right, the air
 * tank as its stock with a cheek riser, a folded bipod and a box of paint
 * in the team colour.
 */
export function buildSniper(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("poly", paint(tubeZ(0.026, 0.026, 0.28, 18), WHITE, { at: [0, 0.07, 0.03] }));
  portedBarrel(body, 0.07, 0.17, 0.9, 0.013, INK);
  // The long forend and the thumbhole grip.
  body.add("poly", paint(roundBox(0.05, 0.055, 0.46, 0.02), NAVY, { at: [0, 0.04, 0.3] }));
  body.add("poly", paint(box(0.052, 0.012, 0.3), accent, { at: [0, 0.052, 0.3] }));
  body.add("poly", paint(roundBox(0.034, 0.1, 0.045, 0.012), NAVY, { at: [0, -0.02, -0.03], rot: [0.3, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.07), INK, { at: [0, 0.012, 0.02] }));
  // The air tank as the stock, a cheek riser on it and the pad.
  airTank(body, 0, 0.05, -0.11, 0.2, 0.034);
  body.add("poly", paint(roundBox(0.04, 0.03, 0.12, 0.012), accent, { at: [0, 0.095, -0.2] }));
  body.add("poly", paint(roundBox(0.048, 0.13, 0.024, 0.01), INK, { at: [0, 0.035, -0.33] }));
  // The scope on its rings.
  body.add("metal", paint(tubeZ(0.02, 0.02, 0.3, 18), INK, { at: [0, 0.14, 0.06] }));
  body.add("metal", paint(tubeZ(0.02, 0.034, 0.07, 18), INK, { at: [0, 0.14, 0.24] }));
  body.add("metal", paint(tubeZ(0.034, 0.034, 0.04, 18), INK, { at: [0, 0.14, 0.295] }));
  body.add("metal", paint(tubeZ(0.024, 0.02, 0.04, 16), INK, { at: [0, 0.14, -0.1] }));
  body.add("glass", paint(cyl(0.03, 0.03, 0.004, 18), "#233a52", { at: [0, 0.14, 0.316], rot: [Math.PI / 2, 0, 0] }));
  body.add("glass", paint(cyl(0.02, 0.02, 0.004, 16), "#233a52", { at: [0, 0.14, -0.121], rot: [Math.PI / 2, 0, 0] }));
  body.add("metal", paint(cyl(0.012, 0.012, 0.03, 10), INK, { at: [0, 0.17, 0.06] }));
  body.add("metal", paint(cyl(0.012, 0.012, 0.03, 10), INK, { at: [0.03, 0.14, 0.06], rot: [0, 0, Math.PI / 2] }));
  for (const z of [-0.02, 0.14]) body.add("metal", paint(box(0.03, 0.05, 0.02), INK, { at: [0, 0.105, z] }));
  // The bipod, folded along the forend.
  for (const x of [-0.016, 0.016]) body.add("metal", rod([x, 0.01, 0.5], [x, 0.012, 0.28], 0.006, INK, 6));
  const geos = body.build(root);

  const mag = new THREE.Group();
  const m = new GunPiece().add("poly", paint(box(0.034, 0.08, 0.08), NAVY, { at: [0, -0.04, 0] }));
  m.add("poly", paint(box(0.038, 0.012, 0.084), accent, { at: [0, -0.082, 0] }));
  geos.push(...m.build(mag));
  mag.position.set(0, 0.03, 0.07);
  root.add(mag);

  // The cocking handle sticks out to the right and turns up to open.
  const bolt = new THREE.Group();
  const b = new GunPiece();
  b.add("metal", rod([0, 0, 0], [-0.06, -0.02, 0], 0.006, "#8d939c", 6));
  b.add("metal", paint(ball(0.014, 10, 8), accent, { at: [-0.064, -0.022, 0] }));
  geos.push(...b.build(bolt));
  bolt.position.set(-0.02, 0.08, -0.05);
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.07, 0.9);
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
