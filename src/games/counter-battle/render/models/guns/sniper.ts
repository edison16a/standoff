import * as THREE from "three";
import { ball, box, cyl, paint, rod, roundBox } from "../../geo";
import { CUP_L, GRIP_R, GunPiece, marker, tubeZ, type GunModel } from "./gun-kit";
import { airTank, paintMag, portedBarrel } from "./paint-parts";

const BODY = "#3f4a35";
const DARK = "#17191c";
const TANK = "#aeb4bd";

/**
 * The scope marker: a long barrel paintball marker for picking players
 * off across the field. A two piece barrel with a vented tip, a scope
 * with a wide front lens, a bolt handle on the right, a long air tank
 * for a stock and a short magazine of paint.
 */
export function buildSniper(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("metal", paint(roundBox(0.05, 0.066, 0.3, 0.014), BODY, { at: [0, 0.066, 0.03] }));
  body.add("metal", paint(box(0.052, 0.014, 0.18), accent, { at: [0, 0.058, 0.03] }));
  portedBarrel(body, 0.18, 0.86, 0.07, 0.015, DARK);
  body.add("metal", paint(tubeZ(0.019, 0.019, 0.03, 16), accent, { at: [0, 0.07, 0.5] }));
  // The forend, the grip and the tank that makes the stock.
  body.add("poly", paint(roundBox(0.05, 0.05, 0.32, 0.02), BODY, { at: [0, 0.036, 0.3] }));
  body.add("poly", paint(roundBox(0.034, 0.1, 0.045, 0.012), DARK, { at: [0, -0.02, -0.03], rot: [0.3, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.07), DARK, { at: [0, 0.012, 0.02] }));
  airTank(body, -0.13, -0.32, 0.05, 0.034, TANK);
  body.add("poly", paint(roundBox(0.048, 0.12, 0.022, 0.01), DARK, { at: [0, 0.04, -0.34] }));
  // The scope on its rings.
  body.add("metal", paint(tubeZ(0.02, 0.02, 0.3, 18), DARK, { at: [0, 0.14, 0.06] }));
  body.add("metal", paint(tubeZ(0.02, 0.034, 0.07, 18), DARK, { at: [0, 0.14, 0.24] }));
  body.add("metal", paint(tubeZ(0.034, 0.034, 0.04, 18), DARK, { at: [0, 0.14, 0.295] }));
  body.add("metal", paint(tubeZ(0.024, 0.02, 0.04, 16), DARK, { at: [0, 0.14, -0.1] }));
  body.add("glass", paint(cyl(0.03, 0.03, 0.004, 18), "#233a52", { at: [0, 0.14, 0.316], rot: [Math.PI / 2, 0, 0] }));
  body.add("glass", paint(cyl(0.02, 0.02, 0.004, 16), "#233a52", { at: [0, 0.14, -0.121], rot: [Math.PI / 2, 0, 0] }));
  body.add("metal", paint(cyl(0.012, 0.012, 0.03, 10), accent, { at: [0, 0.17, 0.06] }));
  for (const z of [-0.02, 0.14]) body.add("metal", paint(box(0.03, 0.05, 0.02), DARK, { at: [0, 0.105, z] }));
  // A folded bipod along the forend.
  for (const x of [-0.016, 0.016]) body.add("metal", rod([x, 0.006, 0.44], [x, 0.008, 0.26], 0.006, DARK, 6));
  const geos = body.build(root);

  const mag = new THREE.Group();
  const m = new GunPiece();
  paintMag(m, 0.1, 0.07, accent);
  geos.push(...m.build(mag));
  mag.position.set(0, 0.03, 0.07);
  root.add(mag);

  // The bolt handle sticks out to the right and turns up to open.
  const bolt = new THREE.Group();
  const b = new GunPiece();
  b.add("metal", rod([0, 0, 0], [-0.06, -0.02, 0], 0.006, "#8d939c", 6));
  b.add("metal", paint(ball(0.014, 10, 8), accent, { at: [-0.064, -0.022, 0] }));
  geos.push(...b.build(bolt));
  bolt.position.set(-0.02, 0.08, -0.05);
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.07, 0.865);
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
