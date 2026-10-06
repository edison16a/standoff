import * as THREE from "three";
import type { Look } from "../../roster";
import { FACE } from "./head-shape";
import { join, place, roughen, tint } from "./parts";

/**
 * The features set into the sculpted head: ears, nose and eyelids in
 * the skin's own material, and the eyes and brows, which want their own
 * shine and colour. All in the head's frame at scale `k`.
 */

const sphere = (w: number, h: number) => new THREE.SphereGeometry(1, w, h);

function darker(hex: string, k: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(k);
}

/** One ear: the rim, the hollow inside it and the lobe, tipped back a little. */
function ear(look: Look, side: 1 | -1, k: number, seg: number): THREE.BufferGeometry {
  const x = side * FACE.earX * k;
  const rim = place(sphere(seg, seg - 2), [x, -0.004 * k, -0.01 * k], [-0.18, side * 0.42, side * 0.06], [0.0085 * k, 0.03 * k, 0.019 * k]);
  const hollow = place(sphere(seg - 2, seg - 4), [x + side * 0.0035 * k, -0.002 * k, -0.007 * k], [-0.18, side * 0.42, 0], [0.006 * k, 0.017 * k, 0.011 * k]);
  const lobe = place(sphere(8, 6), [x - side * 0.001 * k, -0.029 * k, -0.004 * k], [0, side * 0.4, 0], [0.006 * k, 0.008 * k, 0.007 * k]);
  return join([tint(rim, look.skin), tint(hollow, darker(look.skin, 0.72)), tint(lobe, look.skin)]);
}

/** The nose: a bridge sloping out from between the eyes to a rounded tip, with the wings of the nostrils. */
function nose(look: Look, k: number, seg: number): THREE.BufferGeometry {
  const sk = look.skin;
  const parts = [
    tint(place(sphere(seg, seg - 2), [0, -0.009 * k, 0.096 * k], [-0.36, 0, 0], [0.0068 * k, 0.025 * k, 0.0092 * k]), sk),
    tint(place(sphere(seg, seg - 2), [0, FACE.noseTipY * k, 0.106 * k], [0, 0, 0], [0.0094 * k, 0.0088 * k, 0.0092 * k]), sk),
  ];
  for (const side of [1, -1]) {
    parts.push(tint(place(sphere(seg - 2, seg - 4), [side * 0.0112 * k, (FACE.noseTipY - 0.003) * k, 0.098 * k], [0, side * 0.3, 0], [0.0068 * k, 0.006 * k, 0.0075 * k]), sk));
    parts.push(tint(place(sphere(6, 4), [side * 0.0058 * k, (FACE.noseTipY - 0.0075) * k, 0.101 * k], [0.4, 0, 0], [0.003 * k, 0.0015 * k, 0.0026 * k]), darker(sk, 0.35)));
  }
  return join(parts);
}

/** The upper lid, a hood over the top of the eyeball with the lash line dark along its edge, and a softer lower lid. */
function lids(look: Look, side: 1 | -1, k: number, seg: number): THREE.BufferGeometry {
  const centre = new THREE.Vector3(side * FACE.eyeX * k, FACE.eyeY * k, FACE.eyeZ * k);
  const r = 0.0128 * k;
  // The hood's edge crosses the eye just above the iris, the lash line dark along it.
  const tilt = 0;
  const upper = new THREE.SphereGeometry(r, seg, 6, 0, Math.PI * 2, 0, Math.PI * 0.35);
  upper.rotateX(tilt);
  upper.translate(centre.x, centre.y, centre.z);
  const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const lash = darker(look.hairColor, 0.6);
  const lid = darker(look.skin, 0.94);
  const rel = new THREE.Vector3();
  tint(upper, (p, out) => {
    const edge = rel.copy(p).sub(centre).divideScalar(r).dot(axis) < 0.6 && p.z > centre.z;
    out.copy(edge ? lash : lid);
  });
  const lower = new THREE.SphereGeometry(r * 0.98, seg, 4, 0, Math.PI * 2, Math.PI * 0.67, Math.PI * 0.33);
  lower.translate(centre.x, centre.y, centre.z);
  return join([upper, tint(lower, darker(look.skin, 0.9))]);
}

/** Ears, nose and lids: the skin coloured parts of the face. */
export function faceSkin(look: Look, k: number, fine: boolean): THREE.BufferGeometry {
  const seg = fine ? 12 : 8;
  return roughen(join([ear(look, 1, k, seg), ear(look, -1, k, seg), nose(look, k, seg), lids(look, 1, k, seg), lids(look, -1, k, seg)]), 0.48);
}

/** The iris colour: dark brown for most, a lighter hazel for a fair player. */
function irisColour(skin: string): THREE.Color {
  const c = new THREE.Color(skin);
  return new THREE.Color(c.r + c.g + c.b > 2.1 ? "#5d4126" : "#2c1a0f");
}

/** Glossy eyeballs with a dark iris and pupil, looking straight ahead, and the brows over them. */
export function eyes(look: Look, k: number, fine: boolean): THREE.BufferGeometry[] {
  const seg = fine ? 14 : 8;
  const out: THREE.BufferGeometry[] = [];
  const iris = irisColour(look.skin);
  for (const side of [1, -1] as const) {
    const at = [side * FACE.eyeX * k, FACE.eyeY * k, FACE.eyeZ * k];
    const ball = tint(place(sphere(seg, seg - 4), at, [0, 0, 0], 0.0118 * k), "#ece7de");
    const cap = new THREE.SphereGeometry(0.01185 * k, seg, 5, 0, Math.PI * 2, 0, Math.PI * 0.17);
    cap.rotateX(Math.PI / 2);
    cap.translate(at[0]!, at[1]!, at[2]!);
    tint(cap, (p, outC) => {
      const fromCentre = Math.hypot(p.x - at[0]!, p.y - at[1]!) / (0.0118 * k);
      outC.copy(fromCentre < 0.19 ? new THREE.Color("#050302") : iris);
    });
    out.push(roughen(join([ball, cap]), 0.12));
    // Brows: a thicker inner half and a thinner outer half, the outer end dropping and wrapping round.
    const brow = darker(look.hairColor, 1);
    out.push(roughen(join([
      tint(place(sphere(8, 5), [side * 0.019 * k, (FACE.browY + 0.002) * k, 0.097 * k], [0, side * 0.2, side * -0.06], [0.0115 * k, 0.0034 * k, 0.0045 * k]), brow),
      tint(place(sphere(8, 5), [side * 0.037 * k, (FACE.browY + 0.001) * k, 0.088 * k], [0, side * 0.55, side * 0.18], [0.012 * k, 0.0026 * k, 0.004 * k]), brow),
    ]), 0.85));
  }
  return out;
}
