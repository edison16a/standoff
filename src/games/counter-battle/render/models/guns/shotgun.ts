import * as THREE from "three";
import { box, paint, roundBox, shade } from "../../geo";
import { GRIP_R, GunPiece, handFrame, marker, tubeZ, type GunModel } from "./gun-kit";
import { airTank, hopper, portedBarrel } from "./paint-kit";

const WHITE = "#eef1f4";
const POLY = "#2b3038";
const INK = "#15171b";

/**
 * The paint shotgun: a pump marker with a wide barrel that throws nine
 * balls at once, over a paint tube the shells load into, a ribbed pump
 * the left hand works after every shot, a small hopper and the air tank
 * as its stock.
 */
export function buildShotgun(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("poly", paint(roundBox(0.05, 0.08, 0.24, 0.014), WHITE, { at: [0, 0.062, 0.02] }));
  body.add("poly", paint(box(0.052, 0.016, 0.16), accent, { at: [0, 0.04, 0.02] }));
  body.add("metal", paint(box(0.03, 0.006, 0.05), INK, { at: [0, 0.021, 0.06] }));
  // A wide ported barrel over the paint tube.
  portedBarrel(body, 0.086, 0.14, 0.66, 0.016, INK);
  body.add("metal", paint(tubeZ(0.013, 0.013, 0.42), POLY, { at: [0, 0.052, 0.35] }));
  body.add("metal", paint(tubeZ(0.015, 0.015, 0.02), INK, { at: [0, 0.052, 0.565] }));
  body.add("metal", paint(box(0.034, 0.05, 0.014), POLY, { at: [0, 0.068, 0.57] }));
  // Trigger guard, pistol grip, and the air tank as the stock.
  body.add("metal", paint(box(0.008, 0.006, 0.07), INK, { at: [0, 0.012, 0.03] }));
  body.add("poly", paint(roundBox(0.036, 0.1, 0.05, 0.014), POLY, { at: [0, -0.02, -0.04], rot: [0.35, 0, 0] }));
  airTank(body, 0, 0.05, -0.11, 0.2, 0.034);
  body.add("poly", paint(roundBox(0.046, 0.13, 0.022, 0.01), INK, { at: [0, 0.03, -0.33] }));
  hopper(body, 0, 0.104, -0.02, accent, 0.8);
  // Spare paint shells in a carrier on the left of the receiver.
  for (let i = 0; i < 4; i++) body.add("poly", paint(tubeZ(0.009, 0.009, 0.06, 8), "#b3261e", { at: [0.031, 0.06, i * 0.022], rot: [Math.PI / 2, 0, 0] }));
  const geos = body.build(root);

  // The pump: a ribbed forend round the paint tube.
  const pump = new THREE.Group();
  const p = new GunPiece();
  p.add("poly", paint(roundBox(0.05, 0.05, 0.19, 0.02), POLY, { at: [0, 0.058, 0.25] }));
  for (let z = 0.18; z < 0.33; z += 0.025) p.add("poly", paint(box(0.052, 0.052, 0.006), shade(accent, -0.3), { at: [0, 0.058, z] }));
  geos.push(...p.build(pump));
  root.add(pump);

  const muzzle = marker("muzzle", 0, 0.086, 0.66);
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
