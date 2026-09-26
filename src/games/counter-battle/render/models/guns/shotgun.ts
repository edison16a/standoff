import * as THREE from "three";
import { ball, box, paint, roundBox, shade } from "../../geo";
import { GRIP_R, GunPiece, handFrame, marker, tubeZ, type GunModel } from "./gun-kit";

const STEEL = "#2c2f35";
const WOOD = "#7a4a26";

/**
 * The pump shotgun: a steel receiver with a loading port underneath, a
 * long barrel over the magazine tube, a ribbed pump the left hand works
 * after every shot, and a wooden stock with a team stripe.
 */
export function buildShotgun(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("metal", paint(roundBox(0.048, 0.08, 0.24, 0.01), STEEL, { at: [0, 0.062, 0.02] }));
  body.add("metal", paint(box(0.008, 0.02, 0.08), "#0d0e10", { at: [-0.025, 0.07, 0.03] }));
  body.add("metal", paint(box(0.03, 0.006, 0.05), "#0d0e10", { at: [0, 0.021, 0.06] }));
  // Barrel with a vent rib and a bead, over the magazine tube.
  body.add("metal", paint(tubeZ(0.014, 0.013, 0.5), STEEL, { at: [0, 0.086, 0.39] }));
  body.add("metal", paint(box(0.01, 0.006, 0.5), "#1a1c20", { at: [0, 0.103, 0.39] }));
  body.add("metal", paint(ball(0.005, 8, 6), "#e8e2cf", { at: [0, 0.11, 0.63] }));
  body.add("metal", paint(tubeZ(0.013, 0.013, 0.42), STEEL, { at: [0, 0.056, 0.35] }));
  body.add("metal", paint(tubeZ(0.015, 0.015, 0.02), "#1a1c20", { at: [0, 0.056, 0.565] }));
  body.add("metal", paint(box(0.034, 0.05, 0.014), STEEL, { at: [0, 0.07, 0.57] }));
  // Trigger guard and the stock with its pistol grip, one piece of wood.
  body.add("metal", paint(box(0.008, 0.006, 0.07), STEEL, { at: [0, 0.012, 0.03] }));
  body.add("poly", paint(roundBox(0.036, 0.1, 0.05, 0.014), WOOD, { at: [0, -0.02, -0.04], rot: [0.35, 0, 0] }));
  body.add("poly", paint(roundBox(0.042, 0.075, 0.2, 0.018), WOOD, { at: [0, 0.035, -0.19], rot: [0.12, 0, 0] }));
  body.add("poly", paint(roundBox(0.044, 0.11, 0.1, 0.02), WOOD, { at: [0, 0.02, -0.27], rot: [0.05, 0, 0] }));
  body.add("poly", paint(box(0.046, 0.02, 0.1), accent, { at: [0, 0.06, -0.2], rot: [0.1, 0, 0] }));
  body.add("poly", paint(roundBox(0.046, 0.13, 0.022, 0.01), "#15161a", { at: [0, 0.02, -0.33] }));
  // Spare shells in a carrier on the left of the receiver.
  for (let i = 0; i < 4; i++) body.add("poly", paint(tubeZ(0.009, 0.009, 0.06, 8), "#b3261e", { at: [0.031, 0.06, i * 0.022], rot: [Math.PI / 2, 0, 0] }));
  const geos = body.build(root);

  // The pump: a ribbed forend round the magazine tube.
  const pump = new THREE.Group();
  const p = new GunPiece();
  p.add("poly", paint(roundBox(0.05, 0.05, 0.19, 0.02), shade(WOOD, -0.15), { at: [0, 0.058, 0.25] }));
  for (let z = 0.18; z < 0.33; z += 0.025) p.add("poly", paint(box(0.052, 0.052, 0.006), shade(WOOD, -0.45), { at: [0, 0.058, z] }));
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
