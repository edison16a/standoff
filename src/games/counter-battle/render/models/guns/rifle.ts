import * as THREE from "three";
import { box, cyl, paint, roundBox, shade } from "../../geo";
import { CUP_L, GRIP_R, GunPiece, marker, tubeZ, type GunModel } from "./gun-kit";
import { airTank, paintMag, portedBarrel } from "./paint-parts";

const BODY = "#2c3139";
const TRIM = "#5d6673";
const TANK = "#c7ccd4";

/**
 * The marker rifle: a magazine fed paintball marker with a long vented
 * barrel, a red dot, a slotted handguard, an air tank for a stock and a
 * magazine of paint in the team colour with a window down its side.
 */
export function buildRifle(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  // The receiver, milled in two tones, with the team colour down its flank.
  body.add("metal", paint(roundBox(0.048, 0.074, 0.28, 0.012), BODY, { at: [0, 0.064, 0.01] }));
  body.add("metal", paint(box(0.05, 0.016, 0.16), accent, { at: [0, 0.056, -0.02] }));
  body.add("metal", paint(box(0.03, 0.012, 0.42), TRIM, { at: [0, 0.107, 0.12] }));
  for (let z = -0.08; z < 0.32; z += 0.035) body.add("metal", paint(box(0.034, 0.006, 0.014), BODY, { at: [0, 0.115, z] }));
  // Handguard with slots, over the barrel's base.
  body.add("poly", paint(roundBox(0.056, 0.058, 0.26, 0.02), shade(BODY, 0.12), { at: [0, 0.066, 0.27] }));
  for (let z = 0.17; z < 0.38; z += 0.05) for (const x of [-1, 1]) body.add("poly", paint(box(0.004, 0.012, 0.03), "#0c0d10", { at: [x * 0.029, 0.066, z] }));
  portedBarrel(body, 0.4, 0.63, 0.066, 0.015, TRIM);
  // Grip, trigger guard and a double finger trigger, as markers have.
  body.add("poly", paint(roundBox(0.032, 0.1, 0.044, 0.012), "#15171b", { at: [0, -0.02, -0.03], rot: [0.28, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.07), BODY, { at: [0, 0.012, 0.02] }));
  body.add("metal", paint(box(0.005, 0.024, 0.012), "#c9ced6", { at: [0, 0.026, 0.014], rot: [0.2, 0, 0] }));
  // The air tank runs back from the receiver as the stock, with a butt pad on its end.
  airTank(body, -0.13, -0.3, 0.05, 0.032, TANK);
  body.add("poly", paint(roundBox(0.05, 0.11, 0.022, 0.01), "#15171b", { at: [0, 0.05, -0.325] }));
  // The red dot on its riser.
  body.add("metal", paint(tubeZ(0.022, 0.022, 0.06, 16), "#15171b", { at: [0, 0.142, 0.03] }));
  body.add("glass", paint(cyl(0.018, 0.018, 0.004, 16), "#5a1010", { at: [0, 0.142, 0.061], rot: [Math.PI / 2, 0, 0] }));
  body.add("metal", paint(box(0.02, 0.02, 0.04), "#15171b", { at: [0, 0.12, 0.03] }));
  const geos = body.build(root);

  // The magazine hangs from the well; its origin is the magazine well.
  const mag = new THREE.Group();
  const m = new GunPiece();
  paintMag(m, 0.2, 0.062, accent, -0.18);
  geos.push(...m.build(mag));
  mag.position.set(0, 0.04, 0.06);
  root.add(mag);

  // The cocking knob at the back of the receiver.
  const bolt = new THREE.Group();
  geos.push(...new GunPiece().add("metal", paint(box(0.05, 0.01, 0.02), accent, { at: [0, 0.1, -0.12] })).build(bolt));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.066, 0.635);
  root.add(muzzle);
  return {
    root,
    muzzle,
    butt: new THREE.Vector3(0, 0.05, -0.33),
    fore: new THREE.Vector3(0.036, 0.03, 0.2),
    handR: GRIP_R,
    handL: CUP_L,
    mag,
    pump: null,
    bolt,
    handle: new THREE.Vector3(0.02, 0.11, -0.13),
    port: null,
    dispose: () => geos.forEach((g) => g.dispose()),
  };
}
