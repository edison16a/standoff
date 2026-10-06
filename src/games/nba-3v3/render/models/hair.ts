import * as THREE from "three";
import type { BeardStyle, HairStyle, Look } from "../../roster";
import { FACE, noise3, shell, type HeadSurface } from "./head-shape";
import { join, smooth, tint } from "./parts";

/**
 * Hair and beards as shells lifted off the sculpted head: a clean
 * hairline with a lined up front and sideburns, then each style's own
 * shape. A buzz is a skin of colour, a short cut fades from the top to
 * the sides, waves ripple round the crown, curls pile up on top, a
 * swept cut lifts at the front with comb lines, and twists stand out of
 * the scalp. Beards follow the jaw, round the lips.
 */

/** The hairline's height round the head, by angle from the front: forehead, temples, sideburn, over the ear, nape. */
const LINE: readonly (readonly [number, number])[] = [
  [0, 0.068], [0.6, 0.062], [0.95, 0.045], [1.15, 0.02], [1.27, -0.018], [1.36, -0.012], [1.45, 0.028], [1.95, 0.03], [2.25, -0.03], [Math.PI, -0.066],
];

function hairline(dir: THREE.Vector3): number {
  const phi = Math.abs(Math.atan2(dir.x, dir.z));
  let k = 0;
  while (k < LINE.length - 2 && LINE[k + 1]![0] < phi) k++;
  const [a0, y0] = LINE[k]!;
  const [a1, y1] = LINE[k + 1]!;
  const u = Math.min(1, Math.max(0, (phi - a0) / (a1 - a0)));
  return y0 + (y1 - y0) * u * u * (3 - 2 * u);
}

/** How much of a spot on the head is under hair, 0 to 1, with a sharp but not jagged edge. */
export function scalp(base: THREE.Vector3, dir: THREE.Vector3, style: HairStyle): number {
  if (style === "bald") return 0;
  const h = hairline(dir);
  return smooth(h - 0.005, h + 0.005, base.y);
}

/** How thick each style is at a spot of the scalp, in metres. */
function thickness(style: HairStyle, b: THREE.Vector3): number {
  const top = smooth(0.0, 0.1, b.y);
  const wobble = noise3(b.x * 160, b.y * 160, b.z * 160);
  switch (style) {
    case "buzz":
      return 0.0016;
    case "short":
      return 0.0026 + 0.0042 * top + 0.0004 * wobble;
    case "waves": {
      const crown = Math.hypot(b.x, b.y - 0.125, b.z + 0.025);
      return 0.0024 + 0.0034 * top + 0.0011 * Math.sin((crown / 0.0115) * Math.PI * 2);
    }
    case "curly": {
      const coils = noise3(b.x * 260, b.y * 260, b.z * 260);
      return 0.004 + 0.021 * top * (0.85 + 0.15 * wobble) + 0.0035 * coils * (0.3 + top);
    }
    case "swept": {
      const lift = smooth(0.03, 0.1, b.y) * (0.55 + 0.45 * smooth(-0.06, 0.08, b.z));
      return 0.003 + 0.015 * lift - 0.0012 * Math.abs(Math.sin(b.x * 300 + b.z * 40));
    }
    case "twists":
      return 0.0035;
    case "bald":
      return 0;
  }
}

/** The hair's colour at a spot: a little variety through it, darker at the roots of the edges, ridges catching the light. */
function hairColour(style: HairStyle, base: string, b: THREE.Vector3, cover: number, out: THREE.Color): void {
  out.set(base);
  const grain = 0.92 + 0.12 * noise3(b.x * 420, b.y * 420, b.z * 420);
  const edge = 0.75 + 0.25 * cover;
  let ridge = 1;
  if (style === "waves") ridge = 0.9 + 0.2 * Math.sin((Math.hypot(b.x, b.y - 0.125, b.z + 0.025) / 0.0115) * Math.PI * 2);
  if (style === "curly") ridge = 0.85 + 0.25 * noise3(b.x * 260, b.y * 260, b.z * 260);
  out.multiplyScalar(grain * edge * ridge);
}

/** How far the hair stands off the head at a spot, for a headband to sit over it. */
export function hairDepth(style: HairStyle, b: THREE.Vector3, d: THREE.Vector3): number {
  return scalp(b, d, style) >= 0.5 ? thickness(style, b) : 0;
}

/** The hair as one painted piece, in the head's frame, or null for a bald head. */
export function hairPiece(head: HeadSurface, look: Look, twists: number): THREE.BufferGeometry | null {
  if (look.hair === "bald") return null;
  const skin = new THREE.Color(look.skin);
  const hair = new THREE.Color();
  // The hairline itself is painted on the skin, soft; the shell starts just inside it and thins to nothing at its edge.
  const geo = shell(
    head,
    (b, d) => {
      const cover = scalp(b, d, look.hair);
      return cover < 0.85 ? 0 : 0.0004 + thickness(look.hair, b) * smooth(0.85, 1, cover);
    },
    (b, d, out) => {
      const cover = scalp(b, d, look.hair);
      hairColour(look.hair, look.hairColor, b, cover, hair);
      out.copy(skin).lerp(hair, 0.9 + 0.1 * cover);
    },
  );
  if (!geo) return null;
  if (look.hair !== "twists") return geo;
  return join([geo, ...twistPieces(head, look, twists)]);
}

/** Short rope twists standing out of the scalp and drooping a little. */
function twistPieces(head: HeadSurface, look: Look, count: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const pos = head.geo.getAttribute("position");
  const nrm = head.geo.getAttribute("normal");
  const d = new THREE.Vector3();
  const b = new THREE.Vector3();
  const seen: number[] = [];
  for (let i = 0; i < pos.count && out.length < count; i++) {
    const j = (i * 7919) % pos.count;
    d.fromArray(head.dirs, j * 3);
    b.fromArray(head.bases, j * 3);
    if (scalp(b, d, "twists") < 1 || b.y < 0.02 || seen.some((k) => Math.abs(k - j) < 2)) continue;
    seen.push(j);
    const root = new THREE.Vector3().fromBufferAttribute(pos, j);
    const n = new THREE.Vector3().fromBufferAttribute(nrm, j);
    // Short on the sides, longer on top, and falling outward and down under their own weight.
    const len = (0.022 + 0.022 * Math.max(0, n.y)) * (0.8 + 0.4 * (0.5 + 0.5 * noise3(j, j * 0.3, 1)));
    const dir = n.clone().add(new THREE.Vector3(0, -0.9 * (1 - n.y * 0.6), 0)).normalize();
    const geo = new THREE.CylinderGeometry(0.0042, 0.0062, len, 5, 3, false);
    geo.translate(0, len / 2 - 0.004, 0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    geo.translate(root.x, root.y, root.z);
    const c = new THREE.Color(look.hairColor);
    out.push(tint(geo, (p, col) => {
      // Light and dark bands spiral up each twist.
      const band = Math.sin(p.distanceTo(root) * 520 + Math.atan2(p.x - root.x, p.z - root.z) * 2);
      col.copy(c).multiplyScalar(0.85 + 0.25 * band);
    }));
  }
  return out;
}

/** How much of a spot is under the beard, 0 to 1. */
export function beardCover(style: BeardStyle, b: THREE.Vector3, d: THREE.Vector3): number {
  if (style === "none") return 0;
  const front = Math.max(0, d.z);
  const lips = Math.exp(-((b.x / 0.024) ** 2 + ((b.y - FACE.mouthY + 0.003) / 0.011) ** 2));
  const stache = smooth(FACE.mouthY + 0.004, FACE.mouthY + 0.01, b.y) * (1 - smooth(FACE.noseTipY - 0.012, FACE.noseTipY - 0.004, b.y)) * (1 - smooth(0.022, 0.03, Math.abs(b.x)));
  const chin = (1 - smooth(-0.075, -0.06, b.y)) * smooth(0.02, 0.06, b.z + 0.04) * (1 - smooth(0.03, 0.045, Math.abs(b.x)));
  if (style === "goatee") return Math.max(chin, stache * front) * (1 - lips);
  const phi = Math.abs(Math.atan2(d.x, d.z));
  const jaw = (1 - smooth(-0.03, -0.012, b.y + 0.02 * front)) * (1 - smooth(1.2, 1.32, phi)) * smooth(-0.135, -0.11, b.y - 0.04 * (1 - front));
  return Math.max(jaw, stache * front, chin) * (1 - lips);
}

/** The beard as a painted shell, or null for none or stubble (painted on the skin instead). */
export function beardPiece(head: HeadSurface, look: Look): THREE.BufferGeometry | null {
  if (look.beard === "none" || look.beard === "stubble") return null;
  const depth = look.beard === "full" ? 0.007 : look.beard === "goatee" ? 0.0045 : 0.0028;
  const skin = new THREE.Color(look.skin);
  const hair = new THREE.Color();
  return shell(
    head,
    (b, d) => {
      // As with the hair, the beard's edge is painted on the skin and the shell starts just inside it.
      const cover = beardCover(look.beard, b, d);
      if (cover < 0.8) return 0;
      const chin = look.beard === "full" ? 0.006 * smooth(-0.07, -0.1, b.y) : 0;
      return 0.0004 + (depth + chin) * smooth(0.8, 1, cover);
    },
    (b, d, out) => {
      hairColour("curly", look.hairColor, b, beardCover(look.beard, b, d), hair);
      out.copy(skin).lerp(hair, 0.9);
    },
  );
}
