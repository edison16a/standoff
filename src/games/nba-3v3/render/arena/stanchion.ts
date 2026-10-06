import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BOARD } from "../../engine/tuning";
import { Bake, tube } from "./bake";

/** Where the stanchion's post stands, behind the baseline; the basket rocks about its foot. */
export const BASE_Z = -1.9;
const PAD = "#1d3fbf";
const BASE_W = 1.7;
const POST_TOP = 3.62;

/** The base's side profile (z toward the court, y up): long on the floor, sloping back from the front. */
function baseProfile(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(BASE_Z - 1.05, 0);
  s.lineTo(BASE_Z + 0.7, 0);
  s.lineTo(BASE_Z + 0.28, 1.08);
  s.lineTo(BASE_Z - 1.05, 1.08);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: BASE_W - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 4 });
  // The shape is drawn in z and y; turn its extrusion across the court.
  geo.rotateY(-Math.PI / 2);
  geo.translate((BASE_W - 0.12) / 2, 0, 0);
  return geo;
}

/** The name on the base's sloping front, white on the pad. */
function decal(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.font = 'italic 900 92px Impact, "Arial Black", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STANDOFF", 256, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * The portable stanchion an arena wheels on: a heavy padded base with a
 * sloped front, a padded post, and twin steel arms with a brace out to
 * the back frame of the glass. Every piece is baked into one mesh per
 * finish (vinyl pad, white trim, steel), so the whole thing is four
 * draws however many parts it has.
 */
export function buildStanchion(): { group: THREE.Group; dispose: () => void } {
  const pad = new THREE.MeshPhysicalMaterial({ color: PAD, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const trim = new THREE.MeshStandardMaterial({ color: "#eef2f7", roughness: 0.38 });
  const steel = new THREE.MeshStandardMaterial({ color: "#2b303b", roughness: 0.32, metalness: 0.75 });
  const tex = decal();
  const label = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const bake = new Bake();

  bake.add(baseProfile(), pad);
  // A white kick strip round the foot of the base, where it meets the floor.
  bake.add(new RoundedBoxGeometry(BASE_W + 0.14, 0.08, 1.9, 2, 0.03), trim, { y: 0.04, z: BASE_Z - 0.16 });
  // The post, padded up to head height and bare steel above.
  bake.add(new RoundedBoxGeometry(0.34, POST_TOP - 1.0, 0.34, 2, 0.05), steel, { y: 1 + (POST_TOP - 1) / 2, z: BASE_Z - 0.5 });
  bake.add(new RoundedBoxGeometry(0.52, 1.5, 0.52, 3, 0.1), pad, { y: 1.05 + 0.75, z: BASE_Z - 0.5 });
  bake.add(new RoundedBoxGeometry(0.54, 0.06, 0.54, 2, 0.02), trim, { y: 2.56, z: BASE_Z - 0.5 });

  // The back frame of the glass: a steel rectangle the rim and the arms bolt to.
  const back = BOARD.face - BOARD.thickness - 0.06;
  const w = BOARD.halfWidth * 0.8;
  const y0 = BOARD.bottom + 0.08;
  const y1 = BOARD.top - 0.12;
  const corner = (x: number, y: number) => new THREE.Vector3(x, y, back);
  for (const [a, b] of [[corner(-w, y0), corner(w, y0)], [corner(-w, y1), corner(w, y1)], [corner(-w, y0), corner(-w, y1)], [corner(w, y0), corner(w, y1)], [corner(-0.18, y0), corner(-0.18, y1)], [corner(0.18, y0), corner(0.18, y1)]] as const) {
    bake.add(tube(a, b, 0.035, 8), steel);
  }
  // Twin arms from the top of the post to the frame, and a brace under them.
  const top = new THREE.Vector3(0, POST_TOP - 0.08, BASE_Z - 0.5);
  for (const side of [-1, 1]) {
    bake.add(tube(top.clone().setX(side * 0.12), new THREE.Vector3(side * 0.4, y1 - 0.18, back), 0.065, 12), steel);
    bake.add(tube(new THREE.Vector3(side * 0.12, 2.75, BASE_Z - 0.38), new THREE.Vector3(side * 0.3, y0 + 0.02, back), 0.045, 10), steel);
  }
  bake.add(new RoundedBoxGeometry(0.46, 0.24, 0.46, 2, 0.05), steel, { y: POST_TOP, z: BASE_Z - 0.5 });

  const group = new THREE.Group();
  group.add(...bake.build());
  // The name sits on the base's sloping front, just proud of the vinyl.
  const slope = Math.atan2(0.42, 1.08);
  const name = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.42), label);
  name.position.set(0, 0.625, BASE_Z + 0.535);
  name.rotation.x = -slope;
  group.add(name);
  const dispose = () => {
    for (const m of [pad, trim, steel, label]) m.dispose();
    tex.dispose();
  };
  return { group, dispose };
}
