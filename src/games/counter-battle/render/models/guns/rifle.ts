import * as THREE from "three";
import { box, cyl, paint, roundBox, shade, torus } from "../../geo";
import { CUP_L, GRIP_R, GunPiece, marker, tubeZ, type GunModel } from "./gun-kit";

const BLACK = "#1c1e22";
const DARK = "#2a2d33";
const TAN = "#8a7a5c";

/**
 * The assault rifle: a flat top receiver with a red dot, a slotted
 * handguard, a muzzle brake, a sliding stock, and a curved magazine with
 * a base plate in the team colour.
 */
export function buildRifle(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  // Receiver, top rail and ejection port.
  body.add("metal", paint(roundBox(0.046, 0.07, 0.27, 0.008), BLACK, { at: [0, 0.066, 0.01] }));
  body.add("metal", paint(box(0.03, 0.012, 0.44), DARK, { at: [0, 0.107, 0.12] }));
  for (let z = -0.08; z < 0.34; z += 0.03) body.add("metal", paint(box(0.034, 0.006, 0.012), BLACK, { at: [0, 0.115, z] }));
  body.add("metal", paint(box(0.004, 0.02, 0.06), "#0c0d0f", { at: [-0.024, 0.07, 0.02] }));
  // The handguard with its slots, the barrel, gas block and muzzle brake.
  body.add("poly", paint(roundBox(0.056, 0.06, 0.28, 0.02), TAN, { at: [0, 0.066, 0.28] }));
  for (let z = 0.18; z < 0.4; z += 0.05) for (const x of [-1, 1]) body.add("poly", paint(box(0.004, 0.012, 0.028), shade(TAN, -0.45), { at: [x * 0.029, 0.066, z] }));
  body.add("metal", paint(tubeZ(0.011, 0.011, 0.16), BLACK, { at: [0, 0.066, 0.49] }));
  body.add("metal", paint(tubeZ(0.017, 0.017, 0.06), DARK, { at: [0, 0.066, 0.595] }));
  for (const z of [0.58, 0.6]) body.add("metal", paint(box(0.036, 0.006, 0.008), "#0c0d0f", { at: [0, 0.066, z] }));
  // Pistol grip, trigger guard and trigger.
  body.add("poly", paint(roundBox(0.03, 0.1, 0.042, 0.01), BLACK, { at: [0, -0.02, -0.03], rot: [0.32, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.07), BLACK, { at: [0, 0.012, 0.02] }));
  body.add("metal", paint(box(0.005, 0.02, 0.006), DARK, { at: [0, 0.025, 0.012], rot: [0.2, 0, 0] }));
  // Buffer tube and the sliding stock, with a team stripe.
  // The stock is slid in short, as for a player in armour.
  body.add("metal", paint(tubeZ(0.016, 0.016, 0.16), BLACK, { at: [0, 0.07, -0.18] }));
  body.add("poly", paint(roundBox(0.044, 0.1, 0.15, 0.02), TAN, { at: [0, 0.055, -0.245], rot: [-0.05, 0, 0] }));
  body.add("poly", paint(box(0.046, 0.018, 0.08), accent, { at: [0, 0.07, -0.235] }));
  body.add("poly", paint(roundBox(0.046, 0.12, 0.02, 0.008), BLACK, { at: [0, 0.05, -0.32] }));
  // The red dot: a short tube with a lens.
  body.add("metal", paint(tubeZ(0.022, 0.022, 0.06, 16), BLACK, { at: [0, 0.142, 0.03] }));
  body.add("glass", paint(cyl(0.018, 0.018, 0.004, 16), "#5a1010", { at: [0, 0.142, 0.061], rot: [Math.PI / 2, 0, 0] }));
  body.add("metal", paint(box(0.02, 0.02, 0.04), BLACK, { at: [0, 0.12, 0.03] }));
  // A front sight post folded down, and a sling loop.
  body.add("metal", paint(box(0.012, 0.018, 0.02), BLACK, { at: [0, 0.122, 0.36] }));
  body.add("metal", paint(torus(0.012, 0.003, 10, 4), DARK, { at: [0.03, 0.05, -0.12], rot: [0, Math.PI / 2, 0] }));
  const geos = body.build(root);

  // The magazine curves forward; its origin is the magazine well.
  const mag = new THREE.Group();
  const m = new GunPiece();
  for (let i = 0; i < 4; i++) m.add("metal", paint(box(0.026, 0.05, 0.06), DARK, { at: [0, -0.025 - i * 0.045, 0.012 * i * i * 0.5 + 0.005 * i], rot: [-0.1 * i, 0, 0] }));
  m.add("poly", paint(box(0.03, 0.012, 0.068), accent, { at: [0, -0.19, 0.04], rot: [-0.35, 0, 0] }));
  geos.push(...m.build(mag));
  mag.position.set(0, 0.04, 0.06);
  root.add(mag);

  // The charging handle at the back of the receiver.
  const bolt = new THREE.Group();
  const b = new GunPiece().add("metal", paint(box(0.05, 0.008, 0.02), DARK, { at: [0, 0.1, -0.12] }));
  geos.push(...b.build(bolt));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.066, 0.63);
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
