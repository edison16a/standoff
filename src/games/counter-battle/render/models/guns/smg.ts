import * as THREE from "three";
import { box, cyl, paint, roundBox, shade } from "../../geo";
import { GRIP_R, GunPiece, handFrame, marker, tubeZ, type GunModel } from "./gun-kit";
import { airTank, paintMag, portedBarrel } from "./paint-parts";

const BODY = "#e8ebf0";
const DARK = "#1e2127";

/**
 * The speedball marker: a short, bright tournament marker that sprays
 * fast. A white body with milled pockets in the team colour, a short
 * vented barrel, a vertical foregrip, a stubby tank for a stock and a
 * straight magazine of paint.
 */
export function buildSmg(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("metal", paint(roundBox(0.05, 0.086, 0.25, 0.016), BODY, { at: [0, 0.06, 0.03] }));
  for (const z of [-0.04, 0.02, 0.08]) for (const x of [-1, 1]) body.add("metal", paint(roundBox(0.004, 0.034, 0.04, 0.002), accent, { at: [x * 0.025, 0.065, z] }));
  body.add("metal", paint(box(0.026, 0.01, 0.2), DARK, { at: [0, 0.108, 0.04] }));
  portedBarrel(body, 0.15, 0.37, 0.07, 0.016, DARK);
  // Grip, trigger guard and the vertical foregrip.
  body.add("poly", paint(roundBox(0.03, 0.095, 0.04, 0.01), DARK, { at: [0, -0.02, -0.03], rot: [0.3, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.06), DARK, { at: [0, 0.015, 0.02] }));
  body.add("metal", paint(box(0.005, 0.022, 0.012), accent, { at: [0, 0.028, 0.012], rot: [0.2, 0, 0] }));
  body.add("poly", paint(cyl(0.017, 0.015, 0.1, 12), DARK, { at: [0, -0.02, 0.21] }));
  // A short tank for a stock, with a small pad.
  airTank(body, -0.1, -0.26, 0.05, 0.03, shade(accent, -0.25));
  body.add("poly", paint(roundBox(0.044, 0.09, 0.02, 0.008), DARK, { at: [0, 0.05, -0.29] }));
  // A small holographic sight.
  body.add("metal", paint(roundBox(0.03, 0.03, 0.05, 0.006), DARK, { at: [0, 0.128, 0.05] }));
  body.add("glass", paint(box(0.024, 0.022, 0.002), "#3a1010", { at: [0, 0.132, 0.076] }));
  body.add("metal", paint(tubeZ(0.006, 0.006, 0.03), accent, { at: [0.03, 0.09, -0.06] }));
  const geos = body.build(root);

  const mag = new THREE.Group();
  const m = new GunPiece();
  paintMag(m, 0.19, 0.046, accent, -0.08);
  geos.push(...m.build(mag));
  mag.position.set(0, 0.03, 0.08);
  root.add(mag);

  const bolt = new THREE.Group();
  geos.push(...new GunPiece().add("metal", paint(box(0.012, 0.012, 0.03), accent, { at: [0.03, 0.085, 0.14] })).build(bolt));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.07, 0.375);
  root.add(muzzle);
  return {
    root,
    muzzle,
    butt: new THREE.Vector3(0, 0.05, -0.3),
    fore: new THREE.Vector3(0.012, 0.035, 0.195),
    handR: GRIP_R,
    handL: handFrame([-0.2, -0.75, 0.55], [-1, 0, 0.1]),
    mag,
    pump: null,
    bolt,
    handle: new THREE.Vector3(0.04, 0.085, 0.14),
    port: null,
    dispose: () => geos.forEach((g) => g.dispose()),
  };
}
