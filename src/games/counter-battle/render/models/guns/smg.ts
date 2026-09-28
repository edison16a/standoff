import * as THREE from "three";
import { box, cyl, paint, roundBox } from "../../geo";
import { GRIP_R, GunPiece, handFrame, marker, type GunModel } from "./gun-kit";
import { airTank, hopper, portedBarrel } from "./paint-kit";

const WHITE = "#f1f3f6";
const POLY = "#30353f";
const INK = "#15171b";

/**
 * The paint SMG: a stubby, fast marker with a short ported barrel, a
 * vertical foregrip, a small hopper, a short air tank for a stock, and a
 * straight paint magazine with a team coloured base.
 */
export function buildSmg(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("poly", paint(roundBox(0.05, 0.085, 0.25, 0.014), WHITE, { at: [0, 0.06, 0.03] }));
  body.add("poly", paint(box(0.052, 0.014, 0.08), accent, { at: [0, 0.06, -0.01] }));
  body.add("poly", paint(roundBox(0.046, 0.05, 0.14, 0.016), POLY, { at: [0, 0.07, 0.22] }));
  portedBarrel(body, 0.07, 0.28, 0.42, 0.012, INK);
  // Grip, trigger guard, and the vertical foregrip.
  body.add("poly", paint(roundBox(0.03, 0.095, 0.04, 0.01), INK, { at: [0, -0.02, -0.03], rot: [0.3, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.06), INK, { at: [0, 0.015, 0.02] }));
  body.add("poly", paint(cyl(0.017, 0.015, 0.1, 12), INK, { at: [0, -0.02, 0.21] }));
  // A short air tank for the stock, with its pad.
  airTank(body, 0, 0.058, -0.1, 0.17, 0.028);
  body.add("poly", paint(roundBox(0.04, 0.09, 0.02, 0.008), INK, { at: [0, 0.05, -0.29] }));
  hopper(body, 0, 0.1, 0.05, accent, 0.72);
  const geos = body.build(root);

  const mag = new THREE.Group();
  const m = new GunPiece();
  m.add("poly", paint(box(0.024, 0.19, 0.036), POLY, { at: [0, -0.095, 0], rot: [-0.08, 0, 0] }));
  m.add("poly", paint(box(0.03, 0.014, 0.042), accent, { at: [0, -0.19, 0.008], rot: [-0.08, 0, 0] }));
  geos.push(...m.build(mag));
  mag.position.set(0, 0.03, 0.08);
  root.add(mag);

  const bolt = new THREE.Group();
  geos.push(...new GunPiece().add("metal", paint(box(0.012, 0.012, 0.03), POLY, { at: [0.03, 0.085, 0.14] })).build(bolt));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.07, 0.42);
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
