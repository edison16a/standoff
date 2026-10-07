import * as THREE from "three";
import type { Dresser } from "./rig";
import { dressCap } from "./runner-cap";
import { gloss, HEAD_R, HEAD_Y, matte, satin, shadeOf, type Look } from "./runner-look";
import { BACK, shell } from "./shapes";

const R = HEAD_R;
const CY = HEAD_Y;

/**
 * A runner's head: a big round head with a full jaw, ears, big glossy eyes
 * with brown irises, one brow cocked, and a lopsided grin. Brown hair pokes
 * out under the cap. The face looks down -z, the way the runner runs, though
 * players mostly see the back of it.
 */
export function dressHead(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const skin = matte(look.skin);
  head.sphere(R, skin, [0, CY, 0], [1, 1.02, 0.98], 30);
  // A full jaw and round cheeks give the face its chunky cartoon shape.
  head.sphere(0.152, skin, [0, CY - 0.085, -0.042], [1.08, 0.8, 1], 24);
  head.sphere(0.06, skin, [0, CY - 0.15, -0.1], [1.3, 0.8, 1], 14);
  for (const x of [-1, 1]) head.sphere(0.052, skin, [x * R * 0.97, CY - 0.02, 0.015], [0.5, 1, 0.85], 14);
  dressFace(dress, look);
  dressHair(dress, look);
  dressCap(dress, look);
}

function dressFace(dress: Dresser, look: Look): void {
  const face = dress.detail("head");
  // A small button nose, a shade warmer than the face, with no line round it.
  face.sphere(0.028, matte(blend(look.skin, 0xe58a6a, 0.25)), [0, CY - 0.025, -0.193], [1, 0.8, 0.8], 12);
  for (const x of [-1, 1]) {
    // The inner ear, a warm shadow.
    face.sphere(0.026, matte(shadeOf(look.skin, 0.82)), [x * (R * 0.97 + 0.018), CY - 0.02, 0.012], [0.35, 0.7, 0.6], 10);
    // Big eyes: glossy whites, a brown iris, a dark pupil and two glints, so they read from across a room.
    const ex = x * 0.074;
    face.sphere(0.056, gloss(0xffffff), [ex, CY + 0.024, -0.17], [0.88, 1.2, 0.5], 18);
    face.sphere(0.034, satin(look.eyes), [ex - x * 0.004, CY + 0.016, -0.192], [0.92, 1.12, 0.42], 16);
    face.sphere(0.019, gloss(0x1a100a), [ex - x * 0.004, CY + 0.016, -0.2], [0.95, 1.1, 0.4], 12);
    face.sphere(0.0095, { color: 0xffffff, finish: "glow" }, [ex - x * 0.004 + 0.012, CY + 0.034, -0.205], [1, 1.1, 0.5], 8);
    face.sphere(0.005, { color: 0xffffff, finish: "glow" }, [ex - x * 0.004 - 0.01, CY + 0.0, -0.205], [1, 1, 0.5], 6);
    // A dark lash line over each eye sharpens the look.
    const lid = new THREE.TorusGeometry(0.05, 0.0065, 6, 16, Math.PI * 0.9);
    lid.rotateZ(Math.PI * 0.05);
    face.add(lid, matte(0x2a1810), [ex, CY + 0.026, -0.187], [-0.35, 0, 0], [0.9, 1.25, 1]);
    // Brows: the right one cocked high for the cheeky look, the left one flatter.
    const cocked = x > 0;
    face.box(0.075, 0.019, 0.03, satin(look.hair), [x * 0.08, CY + (cocked ? 0.112 : 0.098), -0.172], [0.3, 0, x * (cocked ? 0.28 : 0.1)], 0.009);
    // Rosy cheeks.
    face.sphere(0.03, matte(blend(look.skin, 0xff6f7d, 0.45)), [x * 0.11, CY - 0.05, -0.15], [1, 0.6, 0.35], 10);
  }
  // The grin: wide, open and pulled up at one corner.
  const tilt: [number, number, number] = [0.15, 0, 0.14];
  const mouth = new THREE.SphereGeometry(0.052, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  face.add(mouth, matte(0x6b1d22), [0.012, CY - 0.083, -0.183], tilt, [1, 0.62, 0.32]);
  const tongue = new THREE.SphereGeometry(0.03, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  face.add(tongue, matte(0xe05a62), [0.016, CY - 0.1, -0.192], tilt, [1, 0.5, 0.3]);
  face.box(0.074, 0.016, 0.01, matte(0xffffff), [0.012, CY - 0.088, -0.2], tilt);
  // A dimple at the high corner.
  const dimple = new THREE.TorusGeometry(0.014, 0.0035, 4, 8, Math.PI * 0.7);
  face.add(dimple, matte(shadeOf(look.skin, 0.7)), [0.066, CY - 0.072, -0.178], [0, -0.5, -0.2]);
}

/** Hair under the cap: round the back and sides, sideburns, a tufty nape and a fringe under the peak. */
function dressHair(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const hair = satin(look.hair);
  const dark = satin(shadeOf(look.hair, 0.82));
  // Over the ears at the sides, and right down to the nape at the back.
  head.add(shell(R + 0.012, [BACK - 1.95, BACK + 1.95], [0.3, 1.5], 40), hair, [0, CY + 0.005, 0.004]);
  head.add(shell(R + 0.014, [BACK - 1.25, BACK + 1.25], [0.3, 2.2], 40), hair, [0, CY + 0.005, 0.004]);
  // Tufts flicking out along the hairline at the nape, the way the chase camera sees them.
  for (let i = -3; i <= 3; i++) {
    const out = i / 3;
    const a = BACK + out * 1.1;
    const at: [number, number, number] = [-Math.cos(a) * 0.17, CY - 0.11 + Math.abs(out) * 0.035, Math.sin(a) * 0.17];
    head.sphere(0.04, i % 2 === 0 ? hair : dark, at, [0.9, 1.25, 0.6], 10, [-0.45, -out * 1.1, 0]);
  }
  for (const x of [-1, 1]) {
    // Sideburns in front of the ears, and a tuft over each ear.
    head.sphere(0.032, hair, [x * 0.19, CY - 0.005, -0.065], [0.45, 1.35, 0.75], 10, [0.25, 0, 0]);
    head.sphere(0.05, hair, [x * 0.175, CY + 0.06, 0.03], [0.7, 1.1, 1.3], 10, [0, 0, x * 0.5]);
  }
  // The fringe, three locks under the peak.
  for (const [x, s] of [[-0.07, 1], [-0.01, 1.15], [0.06, 0.9]] as const) {
    head.sphere(0.045 * s, hair, [x, CY + 0.128, -0.16], [1.15, 0.75, 0.55], 12, [0.3, 0, -x * 3]);
  }
}

function blend(a: number, b: number, k: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();
}
