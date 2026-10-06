import * as THREE from "three";
import type { Look } from "../../roster";
import { beardCover, beardPiece, hairDepth, hairPiece, scalp } from "./hair";
import { FACE, headSurface, ringRound } from "./head-shape";
import { loft } from "./loft";
import { fiber, join, place, roughen, smooth, tint } from "./parts";
import { eyes, faceSkin } from "./face";

/** Darkens or lightens a colour by a factor, for shade and highlight. */
export function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

const gaussian = (v: number, s: number) => Math.exp(-((v / s) ** 2));

/** The head's skin colour at a spot: lips, the mouth's line, shadowed sockets, warm cheeks, stubble and the scalp under the hair. */
function skinAt(look: Look, b: THREE.Vector3, d: THREE.Vector3, out: THREE.Color): void {
  const front = Math.max(0, d.z);
  out.set(look.skin);
  const lip = new THREE.Color(look.skin).multiplyScalar(0.7);
  lip.r = Math.min(1, lip.r * 1.18);
  const lips = gaussian(b.x, 0.021) * gaussian(b.y - FACE.mouthY + 0.002, 0.0105) * front ** 3;
  out.lerp(lip, Math.min(1, lips * 1.1));
  out.multiplyScalar(1 - 0.5 * gaussian(b.y - FACE.mouthY + 0.002, 0.0015) * gaussian(b.x, 0.02) * front ** 3);
  const socket = gaussian(Math.abs(b.x) - FACE.eyeX, 0.017) * gaussian(b.y - FACE.eyeY - 0.003, 0.012) * front;
  out.multiplyScalar(1 - 0.18 * socket);
  // Shade baked into the creases: beside the nose down to the mouth, and under the lower lip.
  const fold = gaussian(Math.abs(b.x) - 0.022 - (FACE.noseTipY - b.y) * 0.25, 0.005) * gaussian(b.y - FACE.noseTipY + 0.012, 0.016) * front;
  out.multiplyScalar(1 - 0.16 * fold - 0.12 * gaussian(b.x, 0.016) * gaussian(b.y - FACE.mouthY + 0.018, 0.004) * front);
  out.r = Math.min(1, out.r * (1 + 0.05 * gaussian(Math.abs(b.x) - 0.05, 0.015) * gaussian(b.y + 0.02, 0.015) * front));
  out.multiplyScalar(1 - 0.14 * smooth(-0.085, -0.11, b.y));
  const hair = new THREE.Color(look.hairColor);
  if (look.beard === "stubble") out.lerp(new THREE.Color(look.skin).multiplyScalar(0.5).lerp(hair, 0.3), 0.55 * beardCover("short", b, d));
  else out.lerp(hair, 0.85 * beardCover(look.beard, b, d));
  out.lerp(hair, 0.9 * scalp(b, d, look.hair));
}

function skinRough(look: Look, b: THREE.Vector3, d: THREE.Vector3): number {
  const lips = gaussian(b.x, 0.021) * gaussian(b.y - FACE.mouthY, 0.011) * Math.max(0, d.z);
  // A shaved head shines under the arena lights.
  const crown = look.hair === "bald" ? smooth(0.03, 0.1, b.y) * 0.12 : 0;
  return 0.46 - 0.12 * lips - crown;
}

export interface HeadParts {
  skin: THREE.BufferGeometry;
  gear: THREE.BufferGeometry;
}

/** A band round the forehead, sitting over whatever hair is there, its edges rolled in clean. */
function headband(look: Look, k: number, colour: string): THREE.BufferGeometry {
  const centre = (phi: number) => 0.072 - 0.011 * (1 - Math.cos(phi));
  const rows: [number, number][] = [[-0.0145, 0.0012], [-0.012, 0.0035], [0, 0.0042], [0.012, 0.0035], [0.0145, 0.0012]];
  const rings = rows.map(([dy, out]) => ringRound(40, k, (phi) => centre(phi) + dy, (b, d) => out + hairDepth(look.hair, b, d) * 1.05));
  const band = loft(rings);
  return tint(band, (p, c) => c.set(colour).multiplyScalar(0.92 + 0.08 * Math.sin(p.y * 1400)));
}

/**
 * A head, in its own frame (centred between the ears, facing +z), at
 * scale `k`: the sculpted skull and face with ears, nose and lids in
 * skin, and the eyes, brows, hair, beard, headband and mouthguard as
 * gear. `fine` picks the detail.
 */
export function buildHead(look: Look, k: number, fine: boolean): HeadParts {
  const head = headSurface(fine ? 56 : 30, fine ? 42 : 22, k);
  const pos = head.geo.getAttribute("position");
  const colours = new Float32Array(pos.count * 3);
  const rough: number[] = [];
  const c = new THREE.Color();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    b.fromArray(head.bases, i * 3);
    d.fromArray(head.dirs, i * 3);
    skinAt(look, b, d, c);
    colours.set([c.r, c.g, c.b], i * 3);
    rough.push(skinRough(look, b, d));
  }
  head.geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  head.geo.setAttribute("rough", new THREE.Float32BufferAttribute(rough, 1));
  const skin = join([head.geo, faceSkin(look, k, fine)]);

  const gear: THREE.BufferGeometry[] = [...eyes(look, k, fine)];
  const hair = hairPiece(head, look, fine ? 34 : 18);
  const coils = look.hair === "curly" || look.hair === "twists";
  if (hair) gear.push(fiber(roughen(hair, 0.55), coils ? 2 : 1));
  const beard = beardPiece(head, look);
  if (beard) gear.push(fiber(roughen(beard, 0.7), 2));
  if (look.headband) {
    gear.push(roughen(headband(look, k, look.headband), 0.95));
  }
  if (look.mouthguard) {
    const guard = place(new THREE.SphereGeometry(1, 10, 6), [0.006 * k, (FACE.mouthY - 0.006) * k, 0.097 * k], [0.15, 0, 0.2], [0.014 * k, 0.009 * k, 0.004 * k]);
    gear.push(roughen(tint(guard, "#f1f5f9"), 0.3));
  }
  return { skin, gear: join(gear) };
}
