import * as THREE from "three";
import type { Look } from "../../../looks";
import { groom, join, roughen } from "../parts";
import { eyesAndBrows, faceSkin } from "./face";
import { hairGeometry } from "./hair";
import { aboveLine } from "./hairline";
import { FACE, headSurface, type HeadShape } from "./sculpt";
import { noise3, shell } from "./shell";

/**
 * A whole head in its own frame (centre between the ears, face +z): the
 * sculpted skin with its colour painted in (warmer cheeks, shadowed eye
 * sockets, the scalp darkened under the hair, stubble), the face's
 * features, the hair and any beard. Skin and gear are separate, as
 * they draw with different materials.
 */
export interface HeadParts {
  skin: THREE.BufferGeometry;
  gear: THREE.BufferGeometry;
}

const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bell2 = (x: number, y: number, cx: number, cy: number, w: number, h: number) => Math.exp(-(((x - cx) / w) ** 2) - ((y - cy) / h) ** 2);

/** Where a beard grows: the jaw, chin and upper lip, clear of the lips and the cheekbones, in front of the ears. */
export function beardMask(b: THREE.Vector3, moustache: boolean): number {
  const ax = Math.abs(b.x);
  // The upper edge runs from the sideburn down across the cheek to the corner of the mouth.
  const edge = -0.004 - 0.75 * Math.max(0, 0.07 - ax);
  const cheek = ramp(edge, edge - 0.012, b.y) * ramp(-0.035, -0.012, b.z);
  const lipGap = 1 - bell2(b.x, b.y, 0, FACE.mouthY - 0.002, 0.026, 0.0095);
  const lip = moustache ? bell2(b.x, b.y, 0, FACE.mouthY + 0.014, 0.026, 0.006) * ramp(0.06, 0.08, b.z) : 0;
  return Math.min(1, Math.max(cheek * lipGap, lip));
}

export function buildHead(look: Look, k: number, fine: boolean, shape: HeadShape): HeadParts {
  const head = headSurface(fine ? 64 : 26, fine ? 48 : 18, k, shape);
  const skin = new THREE.Color(look.skin);
  const warm = skin.clone().lerp(new THREE.Color("#c4544a"), 0.14);
  const socket = skin.clone().multiplyScalar(0.72);
  const hair = new THREE.Color(look.hair);
  const stubble = skin.clone().lerp(hair, look.beard === "none" ? 0 : 0.42);
  const b = new THREE.Vector3();
  const pos = head.geo.getAttribute("position");
  const colours = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    b.fromArray(head.bases, i * 3);
    const d = new THREE.Vector3().fromArray(head.dirs, i * 3);
    c.copy(skin);
    c.lerp(warm, 0.8 * (bell2(Math.abs(b.x), b.y, 0.045, -0.018, 0.018, 0.016) * ramp(0.04, 0.07, b.z) + 0.6 * bell2(b.x, b.y, 0, FACE.noseTipY, 0.012, 0.012)));
    c.lerp(socket, 0.7 * bell2(Math.abs(b.x), b.y, FACE.eyeX, FACE.eyeY - 0.004, 0.016, 0.012) * ramp(0.05, 0.08, b.z));
    if (look.beard !== "none") c.lerp(stubble, Math.min(1, beardMask(b, look.beard === "full") * 1.3) * (0.75 + 0.25 * noise3(b.x * 900, b.y * 900, b.z * 900)));
    // Under the hair the scalp is the hair's colour, so no pale skin shows between strands.
    c.lerp(hair, 0.92 * ramp(-0.004, 0.005, aboveLine(b, d)));
    // The jaw's own shadow on the neck below it.
    c.multiplyScalar(1 - 0.3 * ramp(-0.085, -0.11, b.y) * ramp(0.07, 0.02, b.z));
    colours.set([c.r, c.g, c.b], i * 3);
  }
  head.geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  roughen(head.geo, (p) => 0.55 - 0.12 * ramp(0.06 * k, 0.09 * k, p.z) * ramp(0.0, 0.06 * k, p.y));
  const skinParts = [head.geo, faceSkin(look, look.skin, k, fine, shape)];
  const gear = [eyesAndBrows(look, k, fine)];
  const hairGeo = hairGeometry(look, head, k, fine);
  if (hairGeo) gear.push(hairGeo);
  if (look.beard === "full") {
    // A trimmed beard: thickest on the chin, thinning to nothing at its edges over the stubble.
    const beard = shell(
      head,
      (base) => {
        const m = beardMask(base, true);
        return m > 0.05 ? (0.0004 + m * m * (0.0026 + 0.0012 * Math.abs(noise3(base.x * 300, base.y * 300, base.z * 300)))) * k : 0;
      },
      (base, _d, out) => out.copy(hair).multiplyScalar(0.9 + 0.2 * Math.abs(noise3(base.x * 700, base.y * 700, base.z * 700))),
      false,
    );
    if (beard) gear.push(groom(roughen(beard, 0.75), [900 / k, 900 / k, 900 / k]));
  }
  return { skin: join(skinParts), gear: join(gear) };
}

/** The head's own shape from the look: a powerful build has a squarer jaw and stronger chin. */
export function shapeOf(look: Look): HeadShape {
  return { jaw: 0.25 + 0.6 * look.build, chin: 0.35 + 0.4 * look.build };
}
