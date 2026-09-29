import * as THREE from "three";
import { box, paint, roundBox, shade } from "../../geo";
import { GRIP_R, GunPiece, handFrame, marker, tubeZ, type GunModel } from "./gun-kit";
import { airTank, BALL, hopper, portedBarrel } from "./paint-parts";

const BODY = "#3a2f4a";
const TANK = "#20242b";

/**
 * The scatter pump: a pump action paintball marker that throws a spray
 * of small paint. A hopper of paint rides on top, a wide vented barrel
 * runs over the feed tube, the ribbed pump slides under it, and a black
 * air tank is the stock. The shells it loads by hand carry the spray.
 */
export function buildShotgun(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("metal", paint(roundBox(0.05, 0.08, 0.25, 0.014), BODY, { at: [0, 0.062, 0.02] }));
  body.add("metal", paint(box(0.052, 0.018, 0.12), accent, { at: [0, 0.05, 0.0] }));
  body.add("metal", paint(box(0.03, 0.006, 0.05), "#0d0e10", { at: [0, 0.021, 0.06] }));
  // The wide barrel over the feed tube, and its end cap.
  portedBarrel(body, 0.14, 0.64, 0.086, 0.017, shade(BODY, 0.1));
  body.add("metal", paint(tubeZ(0.013, 0.013, 0.42), "#2a2e36", { at: [0, 0.052, 0.35] }));
  body.add("metal", paint(tubeZ(0.015, 0.015, 0.02), accent, { at: [0, 0.052, 0.565] }));
  body.add("metal", paint(box(0.034, 0.05, 0.014), BODY, { at: [0, 0.07, 0.57] }));
  // The hopper of paint on its neck, over the breech.
  hopper(body, 0, 0.1, 0.02, accent);
  // Trigger guard, grip and the tank for a stock.
  body.add("metal", paint(box(0.008, 0.006, 0.07), BODY, { at: [0, 0.012, 0.03] }));
  body.add("poly", paint(roundBox(0.034, 0.1, 0.048, 0.014), "#16181c", { at: [0, -0.02, -0.04], rot: [0.35, 0, 0] }));
  airTank(body, -0.12, -0.31, 0.045, 0.034, TANK);
  body.add("poly", paint(roundBox(0.052, 0.12, 0.022, 0.01), "#16181c", { at: [0, 0.035, -0.33] }));
  // Spare paint shells in a carrier on the left of the receiver.
  for (let i = 0; i < 4; i++) body.add("poly", paint(tubeZ(0.009, 0.009, 0.05, 8), accent, { at: [0.031, 0.06, i * 0.022], rot: [Math.PI / 2, 0, 0] }));
  for (let i = 0; i < 4; i++) body.add("poly", paint(tubeZ(BALL * 0.9, BALL * 0.9, 0.012, 8), "#f1f3f6", { at: [0.031, 0.087, i * 0.022], rot: [Math.PI / 2, 0, 0] }));
  const geos = body.build(root);

  // The pump: a ribbed forend round the feed tube.
  const pump = new THREE.Group();
  const p = new GunPiece();
  p.add("poly", paint(roundBox(0.052, 0.05, 0.19, 0.02), "#20232a", { at: [0, 0.056, 0.25] }));
  for (let z = 0.18; z < 0.33; z += 0.025) p.add("poly", paint(box(0.054, 0.052, 0.006), accent, { at: [0, 0.056, z] }));
  geos.push(...p.build(pump));
  root.add(pump);

  const muzzle = marker("muzzle", 0, 0.086, 0.645);
  root.add(muzzle);
  return {
    root,
    muzzle,
    butt: new THREE.Vector3(0, 0.03, -0.34),
    fore: new THREE.Vector3(0.034, 0.02, 0.24),
    handR: GRIP_R,
    handL: handFrame([-0.75, 0.6, 0.1], [0.4, 0.9, 0]),
    mag: null,
    pump,
    bolt: null,
    handle: new THREE.Vector3(0.03, 0.03, 0.24),
    port: new THREE.Vector3(0, 0.0, 0.07),
    dispose: () => geos.forEach((g) => g.dispose()),
  };
}
