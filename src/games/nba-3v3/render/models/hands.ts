import * as THREE from "three";
import type { Look } from "../../roster";
import { join, roughen, tint } from "./parts";

/**
 * A hand in its bone's frame: the wrist at the origin, fingers hanging
 * down -y, the palm toward the body (-x for the left hand, side 1) and
 * the thumb forward. A full palm with the pad of the thumb, four jointed
 * fingers in a relaxed curl, ready for the ball, and a thumb. The palm
 * side is lighter, as real palms are, and the nails catch the light.
 */

interface Finger {
  z: number;
  bones: readonly number[];
  r: number;
  curl: readonly number[];
  fan: number;
}

const FINGERS: readonly Finger[] = [
  { z: 0.028, bones: [0.042, 0.025, 0.021], r: 0.0094, curl: [0.22, 0.32, 0.22], fan: 0.06 },
  { z: 0.009, bones: [0.046, 0.029, 0.022], r: 0.0098, curl: [0.25, 0.36, 0.24], fan: 0.0 },
  { z: -0.009, bones: [0.043, 0.027, 0.021], r: 0.0092, curl: [0.3, 0.38, 0.26], fan: -0.05 },
  { z: -0.026, bones: [0.034, 0.021, 0.019], r: 0.0082, curl: [0.36, 0.4, 0.28], fan: -0.12 },
];

/** A chain of capsules from `start`, each turned further toward the palm by its curl. */
function chain(start: THREE.Vector3, f: Finger, side: 1 | -1, scale: number, radial: number, nail: THREE.Color, skin: THREE.Color): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const at = start.clone();
  let bend = 0;
  f.bones.forEach((len, i) => {
    bend += f.curl[i]!;
    const r = f.r * scale * (1 - i * 0.09);
    const l = len * scale;
    const geo = new THREE.CapsuleGeometry(r, Math.max(0.001, l - r), 2, radial);
    geo.translate(0, -l / 2, 0);
    // Curl toward the palm (about z) and fan apart a little (about x).
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-f.fan, 0, -side * bend, "ZXY"));
    geo.applyQuaternion(q);
    geo.translate(at.x, at.y, at.z);
    const tip = i === f.bones.length - 1;
    const axis = new THREE.Vector3(0, -1, 0).applyQuaternion(q);
    const back = new THREE.Vector3(side, 0, 0).applyQuaternion(q);
    const base = at.clone();
    out.push(tint(geo, (p, c) => {
      const rel = p.clone().sub(base);
      const along = rel.dot(axis) / l;
      const onBack = rel.dot(back) / r;
      c.copy(skin);
      if (tip && along > 0.45 && onBack > 0.45) c.copy(nail);
    }));
    at.addScaledVector(axis, l * 0.94);
  });
  return out;
}

export function buildHand(look: Look, side: 1 | -1, scale: number, fine: boolean): THREE.BufferGeometry {
  const s = scale;
  const skin = new THREE.Color(look.skin);
  const palmTone = skin.clone().lerp(new THREE.Color("#e8b9a0"), 0.35);
  const nail = skin.clone().lerp(new THREE.Color("#f1d6c8"), 0.55);
  const radial = fine ? 7 : 5;
  const parts: THREE.BufferGeometry[] = [];
  const palm = new THREE.SphereGeometry(1, fine ? 14 : 8, fine ? 10 : 6);
  palm.scale(0.0165 * s, 0.054 * s, 0.043 * s);
  palm.translate(side * 0.002 * s, -0.056 * s, 0.001 * s);
  parts.push(tint(palm, (p, c) => c.copy(p.x * side < 0 ? palmTone : skin)));
  const pad = new THREE.SphereGeometry(1, fine ? 10 : 6, fine ? 8 : 5);
  pad.scale(0.013 * s, 0.028 * s, 0.017 * s);
  pad.translate(-side * 0.006 * s, -0.036 * s, 0.024 * s);
  parts.push(tint(pad, palmTone));
  for (const f of FINGERS) {
    const knuckle = new THREE.Vector3(side * 0.001 * s, -0.098 * s, f.z * s);
    const pieces = fine ? chain(knuckle, f, side, s, radial, nail, skin) : chain(knuckle, { ...f, bones: [f.bones.reduce((a, b) => a + b, 0) * 0.92], curl: [0.35] }, side, s, radial, nail, skin);
    parts.push(...pieces);
  }
  // The thumb comes off the side of the palm, forward and down, turned in toward the fingers.
  const thumb: Finger = { z: 0, bones: [0.036, 0.031], r: 0.0108, curl: [0.25, 0.2], fan: 0.75 };
  parts.push(...chain(new THREE.Vector3(-side * 0.006 * s, -0.03 * s, 0.033 * s), thumb, side, s, radial, nail, skin));
  return roughen(join(parts), 0.55);
}
