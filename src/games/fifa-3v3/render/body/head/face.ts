import * as THREE from "three";
import type { Look } from "../../../looks";
import { join, place, roughen, tint } from "../parts";
import { tube, type Key } from "../profile";
import { FACE, facePoint, faceZ, type HeadShape } from "./sculpt";

/**
 * The features set into the sculpted head, in the head's frame at scale
 * `k`: ears, nose, lids and lips in the skin's own material, and the
 * eyes and brows, which want their own shine and colour.
 */

const sphere = (w: number, h: number) => new THREE.SphereGeometry(1, w, h);
const darker = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

/** One ear: the rim, the hollow inside it and the lobe, standing a little off the skull. */
function ear(skin: string, side: 1 | -1, k: number, seg: number): THREE.BufferGeometry {
  const x = side * FACE.earX * k;
  const y = FACE.earY * k;
  const z = FACE.earZ * k;
  return join([
    tint(place(sphere(seg, seg - 2), [x - side * 0.002 * k, y, z], [-0.15, side * 0.2, side * 0.08], [0.0078 * k, 0.03 * k, 0.019 * k]), skin),
    tint(place(sphere(seg - 2, seg - 4), [x + side * 0.0022 * k, y + 0.002 * k, z + 0.001 * k], [-0.15, side * 0.2, 0], [0.005 * k, 0.017 * k, 0.011 * k]), darker(skin, 0.68)),
    tint(place(sphere(8, 6), [x - side * 0.002 * k, y - 0.025 * k, z + 0.004 * k], [0, side * 0.2, 0], [0.0058 * k, 0.008 * k, 0.0068 * k]), skin),
  ]);
}

/** The nose down from between the eyes: half width, how far it stands off the face, and how sharp the ridge is. */
const NOSE: readonly (readonly [y: number, w: number, out: number, power: number])[] = [
  [0.012, 0.0058, 0.001, 1.8],
  [0.0, 0.0064, 0.0048, 1.8],
  [-0.012, 0.0072, 0.0092, 1.9],
  [-0.022, 0.0095, 0.0135, 2],
  [-0.029, 0.013, 0.0158, 2.2],
  [-0.035, 0.0148, 0.0125, 2.3],
  [-0.039, 0.011, 0.007, 2.2],
];

/** A smooth nose: a narrow bridge widening to a rounded tip, the wings of the nostrils flaring at its base. */
function nose(skin: string, k: number, seg: number, shape: HeadShape): THREE.BufferGeometry {
  const sink = 0.005;
  const keys: Key[] = NOSE.map(([y, w, out, power]) => {
    const z = faceZ(y, shape) - sink;
    // Out from the face is +z: front is how far it stands off, back how far it sinks in.
    return { y: y * k, l: w * k, r: w * k, f: (out + sink) * k, b: sink * k, z: z * k, power };
  });
  const parts = [tint(tube(keys, { n: seg + 6, step: 0.004 * k, capStart: 0.003 * k, capEnd: 0.004 * k }), skin)];
  const tipZ = faceZ(-0.037, shape);
  for (const side of [1, -1]) {
    parts.push(tint(place(sphere(seg, seg - 2), [side * 0.0102 * k, -0.0345 * k, (tipZ + 0.005) * k], [0, side * 0.5, 0], [0.0058 * k, 0.0056 * k, 0.007 * k]), darker(skin, 0.97)));
    parts.push(tint(place(sphere(6, 4), [side * 0.0056 * k, -0.0392 * k, (tipZ + 0.0075) * k], [0.5, 0, 0], [0.0033 * k, 0.0015 * k, 0.0029 * k]), darker(skin, 0.28)));
  }
  return join(parts);
}

/** The upper lid hooding the eyeball, the lash line dark along its edge, and a softer lower lid. */
function lids(look: Look, side: 1 | -1, k: number, seg: number): THREE.BufferGeometry {
  const c = new THREE.Vector3(side * FACE.eyeX * k, FACE.eyeY * k, FACE.eyeZ * k);
  const r = FACE.eyeR * 1.035 * k;
  const upper = new THREE.SphereGeometry(r, seg, 6, 0, Math.PI * 2, 0, Math.PI * 0.42);
  upper.rotateX(0.14);
  upper.translate(c.x, c.y, c.z);
  const lash = darker(look.hair, 0.5);
  const lid = darker(look.skin, 0.93);
  tint(upper, (p, out) => out.copy(p.y - c.y < 0.3 * r && p.z > c.z ? lash : lid));
  const lower = new THREE.SphereGeometry(r * 0.995, seg, 4, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38);
  lower.translate(c.x, c.y, c.z);
  return join([upper, tint(lower, darker(look.skin, 0.9))]);
}

/** The lips: a fuller lower lip under a bowed upper one, darker and redder than the skin, parted by a dark line. */
function lips(skin: string, k: number, seg: number, shape: HeadShape): THREE.BufferGeometry {
  const tone = new THREE.Color(skin).multiplyScalar(0.76);
  tone.r = Math.min(1, tone.r * 1.2);
  const y = FACE.mouthY;
  const z = faceZ(y, shape) - 0.004;
  return join([
    tint(place(sphere(seg + 4, seg - 2), [0, (y + 0.0042) * k, z * k], [0.12, 0, 0], [0.0228 * k, 0.0044 * k, 0.0062 * k]), tone),
    tint(place(sphere(seg + 4, seg - 2), [0, (y - 0.0052) * k, (z - 0.0008) * k], [-0.15, 0, 0], [0.0205 * k, 0.0056 * k, 0.0068 * k]), tone),
    tint(place(sphere(seg, 4), [0, (y - 0.0004) * k, (z + 0.0022) * k], [0, 0, 0], [0.0218 * k, 0.001 * k, 0.0045 * k]), darker(skin, 0.3)),
  ]);
}

/** Ears, nose, lids and lips: the skin coloured parts of the face. */
export function faceSkin(look: Look, skin: string, k: number, fine: boolean, shape: HeadShape): THREE.BufferGeometry {
  const seg = fine ? 12 : 6;
  const parts = [ear(skin, 1, k, seg), ear(skin, -1, k, seg), nose(skin, k, seg, shape), lips(skin, k, seg, shape)];
  if (fine) parts.push(lids(look, 1, k, seg + 4), lids(look, -1, k, seg + 4));
  return roughen(join(parts), 0.5);
}

/** The iris: dark brown for most, a lighter hazel or grey blue for a fair player. */
function irisColour(look: Look): THREE.Color {
  const c = new THREE.Color(look.skin);
  const fair = c.r + c.g + c.b > 2.2;
  return new THREE.Color(fair ? (new THREE.Color(look.hair).r > 0.5 ? "#4d6a7e" : "#5d4126") : "#2c1a0f");
}

/** Glossy eyeballs with an iris and pupil, looking straight ahead, and the brows over them. */
export function eyesAndBrows(look: Look, k: number, fine: boolean): THREE.BufferGeometry {
  const seg = fine ? 16 : 8;
  const out: THREE.BufferGeometry[] = [];
  const iris = irisColour(look);
  const ring = iris.clone().multiplyScalar(0.55);
  for (const side of [1, -1] as const) {
    const at = [side * FACE.eyeX * k, FACE.eyeY * k, FACE.eyeZ * k] as const;
    const r = FACE.eyeR * k;
    out.push(roughen(tint(place(sphere(seg, seg - 4), at, [0, 0, 0], r), "#e4ddd2"), 0.15));
    const cap = new THREE.SphereGeometry(r * 1.004, seg, 6, 0, Math.PI * 2, 0, Math.PI * 0.19);
    cap.rotateX(Math.PI / 2);
    cap.translate(at[0], at[1], at[2]);
    tint(cap, (p, c) => {
      const from = Math.hypot(p.x - at[0], p.y - at[1]) / r;
      c.copy(from < 0.2 ? new THREE.Color("#060403") : from > 0.5 ? ring : iris);
    });
    out.push(roughen(cap, 0.08));
    // Brows: a thicker inner half and a thinner outer half, dropping and wrapping round the brow bone.
    // Brows sit on the skin, a little lighter than the hair: hairs over skin, not a solid bar.
    const brow = new THREE.Color(look.hair).lerp(new THREE.Color(look.skin), 0.18);
    const inner = facePoint(side * 0.019, FACE.browY + 0.002);
    const outer = facePoint(side * 0.0375, FACE.browY + 0.0005);
    out.push(roughen(join([
      tint(place(sphere(10, 6), [inner.x * k, inner.y * k, (inner.z - 0.0012) * k], [0, side * 0.2, side * -0.06], [0.0115 * k, 0.0026 * k, 0.003 * k]), brow),
      tint(place(sphere(10, 6), [outer.x * k, outer.y * k, (outer.z - 0.0012) * k], [0, side * 0.55, side * 0.18], [0.012 * k, 0.002 * k, 0.003 * k]), brow),
    ]), 0.85));
  }
  return join(out);
}
