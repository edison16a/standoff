import * as THREE from "three";
import { box, cyl, paint, roundBox, rod } from "../../geo";
import { GRIP_R, GunPiece, handFrame, marker, tubeZ, type GunModel } from "./gun-kit";

const BLACK = "#1b1d21";
const GREY = "#3a3e46";

/**
 * The SMG: a stubby receiver, a long ventilated shroud over the barrel, a
 * vertical foregrip, a wire stock folded out and a straight magazine with
 * a team coloured base.
 */
export function buildSmg(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  body.add("poly", paint(roundBox(0.05, 0.085, 0.25, 0.012), GREY, { at: [0, 0.06, 0.03] }));
  body.add("metal", paint(box(0.026, 0.01, 0.2), BLACK, { at: [0, 0.108, 0.04] }));
  body.add("metal", paint(tubeZ(0.022, 0.022, 0.2, 16), BLACK, { at: [0, 0.07, 0.25] }));
  for (let z = 0.18; z < 0.34; z += 0.03) body.add("metal", paint(box(0.046, 0.008, 0.01), "#0b0c0e", { at: [0, 0.07, z] }));
  body.add("metal", paint(tubeZ(0.012, 0.012, 0.03), BLACK, { at: [0, 0.07, 0.36] }));
  // Grip, trigger guard, and the vertical foregrip.
  body.add("poly", paint(roundBox(0.03, 0.095, 0.04, 0.01), BLACK, { at: [0, -0.02, -0.03], rot: [0.3, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.06), BLACK, { at: [0, 0.015, 0.02] }));
  body.add("poly", paint(cyl(0.017, 0.015, 0.1, 12), BLACK, { at: [0, -0.02, 0.21] }));
  // The folding wire stock and its pad.
  for (const x of [-0.018, 0.018]) body.add("metal", rod([x, 0.08, -0.08], [x, 0.06, -0.28], 0.005, BLACK, 6));
  body.add("metal", rod([-0.018, 0.02, -0.28], [0.018, 0.02, -0.28], 0.005, BLACK, 6));
  body.add("poly", paint(roundBox(0.04, 0.09, 0.02, 0.008), BLACK, { at: [0, 0.05, -0.29] }));
  body.add("poly", paint(box(0.052, 0.014, 0.08), accent, { at: [0, 0.06, -0.01] }));
  // A small holographic sight.
  body.add("metal", paint(roundBox(0.03, 0.03, 0.05, 0.006), BLACK, { at: [0, 0.128, 0.05] }));
  body.add("glass", paint(box(0.024, 0.022, 0.002), "#3a1010", { at: [0, 0.132, 0.076] }));
  const geos = body.build(root);

  const mag = new THREE.Group();
  const m = new GunPiece();
  m.add("metal", paint(box(0.024, 0.19, 0.036), BLACK, { at: [0, -0.095, 0], rot: [-0.08, 0, 0] }));
  m.add("poly", paint(box(0.03, 0.014, 0.042), accent, { at: [0, -0.19, 0.008], rot: [-0.08, 0, 0] }));
  geos.push(...m.build(mag));
  mag.position.set(0, 0.03, 0.08);
  root.add(mag);

  const bolt = new THREE.Group();
  geos.push(...new GunPiece().add("metal", paint(box(0.012, 0.012, 0.03), GREY, { at: [0.03, 0.085, 0.14] })).build(bolt));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.07, 0.38);
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
