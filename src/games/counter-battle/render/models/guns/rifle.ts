import * as THREE from "three";
import { box, paint, roundBox, shade, torus } from "../../geo";
import { CUP_L, GRIP_R, GunPiece, marker, type GunModel } from "./gun-kit";
import { airTank, hopper, portedBarrel } from "./paint-kit";

const WHITE = "#e8ecf1";
const DARK = "#2a2f38";
const INK = "#15181d";

/**
 * The paint rifle: a white tactical marker with a hopper of paint on top,
 * a slotted handguard, a long ported barrel, the air tank as its stock,
 * and a paint magazine with a team coloured base.
 */
export function buildRifle(accent: string): GunModel {
  const root = new THREE.Group();
  const body = new GunPiece();
  // Receiver, with a team stripe down each side and a feed neck on top.
  body.add("poly", paint(roundBox(0.048, 0.072, 0.28, 0.012), WHITE, { at: [0, 0.066, 0.01] }));
  for (const x of [-1, 1]) body.add("poly", paint(box(0.004, 0.014, 0.2), accent, { at: [x * 0.025, 0.07, 0.02] }));
  body.add("metal", paint(box(0.03, 0.01, 0.12), DARK, { at: [0, 0.106, 0.13] }));
  // The handguard with its slots, and the barrel.
  body.add("poly", paint(roundBox(0.056, 0.058, 0.26, 0.02), DARK, { at: [0, 0.066, 0.28] }));
  for (let z = 0.18; z < 0.4; z += 0.05) for (const x of [-1, 1]) body.add("poly", paint(box(0.004, 0.012, 0.028), shade(DARK, -0.5), { at: [x * 0.029, 0.066, z] }));
  portedBarrel(body, 0.066, 0.4, 0.68, 0.012, INK);
  // Pistol grip, trigger guard and trigger.
  body.add("poly", paint(roundBox(0.03, 0.1, 0.042, 0.01), INK, { at: [0, -0.02, -0.03], rot: [0.32, 0, 0] }));
  body.add("metal", paint(box(0.008, 0.006, 0.07), INK, { at: [0, 0.012, 0.02] }));
  body.add("metal", paint(box(0.005, 0.02, 0.006), DARK, { at: [0, 0.025, 0.012], rot: [0.2, 0, 0] }));
  // The air tank is the stock, ending in a rubber pad at the shoulder.
  airTank(body, 0, 0.062, -0.12, 0.18, 0.032);
  body.add("poly", paint(roundBox(0.046, 0.12, 0.02, 0.008), INK, { at: [0, 0.05, -0.325] }));
  // The hopper of paint over the receiver, and a sling loop.
  hopper(body, 0, 0.108, 0.02, accent);
  body.add("metal", paint(torus(0.012, 0.003, 10, 4), DARK, { at: [0.03, 0.05, -0.12], rot: [0, Math.PI / 2, 0] }));
  const geos = body.build(root);

  // The paint magazine curves forward; its origin is the magazine well.
  const mag = new THREE.Group();
  const m = new GunPiece();
  for (let i = 0; i < 4; i++) m.add("poly", paint(box(0.026, 0.05, 0.06), DARK, { at: [0, -0.025 - i * 0.045, 0.012 * i * i * 0.5 + 0.005 * i], rot: [-0.1 * i, 0, 0] }));
  m.add("poly", paint(box(0.03, 0.012, 0.068), accent, { at: [0, -0.19, 0.04], rot: [-0.35, 0, 0] }));
  geos.push(...m.build(mag));
  mag.position.set(0, 0.04, 0.06);
  root.add(mag);

  // The cocking handle at the back of the receiver.
  const bolt = new THREE.Group();
  const b = new GunPiece().add("metal", paint(box(0.05, 0.008, 0.02), DARK, { at: [0, 0.1, -0.12] }));
  geos.push(...b.build(bolt));
  root.add(bolt);

  const muzzle = marker("muzzle", 0, 0.066, 0.68);
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
