import * as THREE from "three";
import { CORNERS, RING_HALF } from "../../engine/footwork";
import { apronTexture, BRAND, matTexture, padTexture } from "./arena-textures";
import { ROPE_HEIGHTS, ROPE_INSET } from "./ropes";

/** The ring's platform stands this high off the arena floor. The canvas is at y = 0. */
export const PLATFORM = 1.15;
const MAT_HALF = RING_HALF + 0.55;
const POST = RING_HALF + 0.2;
const ROPE_COLOURS = ["#c8102e", "#f2f2f2", "#c8102e", "#f2f2f2"];

export interface Ring {
  group: THREE.Group;
  stools: [THREE.Group, THREE.Group];
  /** Each side's ropes and spacers, round from +z, so a camera can see between them. */
  sides: THREE.Group[];
  dispose: () => void;
}

/**
 * The ring: a branded canvas on a platform with its apron skirt, four
 * steel posts, padded turnbuckles in the corners' colours, four sagging
 * ropes with their spacers, steps and a stool in each boxer's corner.
 */
export function buildRing(): Ring {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T): T => {
    disposables.push(thing);
    return thing;
  };

  const mat = keep(matTexture());
  const top = keep(new THREE.MeshStandardMaterial({ map: mat, roughness: 0.85 }));
  const side = keep(new THREE.MeshStandardMaterial({ color: "#0b0d18", roughness: 0.7 }));
  const platform = new THREE.Mesh(keep(new THREE.BoxGeometry(MAT_HALF * 2, 0.12, MAT_HALF * 2)), [side, side, top, side, side, side]);
  platform.position.y = -0.06;
  platform.receiveShadow = true;
  group.add(platform);

  const apron = keep(apronTexture());
  apron.repeat.set(2, 1);
  const skirt = keep(new THREE.MeshStandardMaterial({ map: apron, roughness: 0.6, emissive: "#ffffff", emissiveMap: apron, emissiveIntensity: 0.12 }));
  const skirtGeo = keep(new THREE.PlaneGeometry(MAT_HALF * 2, PLATFORM - 0.1));
  for (let i = 0; i < 4; i++) {
    const panel = new THREE.Mesh(skirtGeo, skirt);
    const angle = (i * Math.PI) / 2;
    panel.position.set(Math.sin(angle) * MAT_HALF, -0.1 - (PLATFORM - 0.1) / 2, Math.cos(angle) * MAT_HALF);
    panel.rotation.y = angle;
    group.add(panel);
  }

  const steel = keep(new THREE.MeshStandardMaterial({ color: "#c9ccd6", metalness: 0.9, roughness: 0.25 }));
  const postGeo = keep(new THREE.CylinderGeometry(0.055, 0.065, 1.72, 16));
  const padGeo = keep(new THREE.BoxGeometry(0.2, 1.3, 0.2, 2, 6, 2));
  roundBox(padGeo, 0.08);
  const corners = [
    { x: -1, z: -1, colour: BRAND.red },
    { x: 1, z: 1, colour: BRAND.corner },
    { x: -1, z: 1, colour: "#f4f4f4" },
    { x: 1, z: -1, colour: "#f4f4f4" },
  ];
  for (const c of corners) {
    const post = new THREE.Mesh(postGeo, steel);
    post.position.set(c.x * POST, 0.86, c.z * POST);
    post.castShadow = true;
    const pad = new THREE.Mesh(padGeo, keep(new THREE.MeshPhysicalMaterial({ map: keep(padTexture(c.colour)), roughness: 0.35, clearcoat: 0.6 })));
    pad.position.set(c.x * (POST - 0.13), 0.97, c.z * (POST - 0.13));
    pad.rotation.y = Math.atan2(c.x, c.z) + Math.PI;
    pad.castShadow = true;
    group.add(post, pad);
  }

  const sides = [0, 1, 2, 3].map(() => new THREE.Group());
  group.add(...sides);
  ROPE_HEIGHTS.forEach((height, i) => {
    const rope = keep(new THREE.MeshPhysicalMaterial({ color: ROPE_COLOURS[i], roughness: 0.4, clearcoat: 0.5 }));
    for (let s = 0; s < 4; s++) sides[s]!.add(ropeSide(s, height, rope, keep));
  });
  // Spacer straps tie the ropes together a third of the way along each side.
  const strap = keep(new THREE.MeshStandardMaterial({ color: "#1a1a24", roughness: 0.8 }));
  const strapGeo = keep(new THREE.BoxGeometry(0.06, ROPE_HEIGHTS[3] - ROPE_HEIGHTS[0] + 0.08, 0.06));
  for (let s = 0; s < 4; s++) {
    for (const along of [-1.1, 1.1]) {
      const angle = (s * Math.PI) / 2;
      const piece = new THREE.Mesh(strapGeo, strap);
      piece.position.set(Math.sin(angle) * (POST - 0.12) + Math.cos(angle) * along, (ROPE_HEIGHTS[0] + ROPE_HEIGHTS[3]) / 2 - 0.06, Math.cos(angle) * (POST - 0.12) - Math.sin(angle) * along);
      piece.rotation.y = angle;
      sides[s]!.add(piece);
    }
  }

  group.add(steps(-1, -1, keep), steps(1, 1, keep));
  const stools: [THREE.Group, THREE.Group] = [stool(-1, keep), stool(1, keep)];
  group.add(...stools);
  return { group, stools, sides, dispose: () => disposables.forEach((d) => d.dispose()) };
}

/** One rope along one side, sagging a little in the middle. */
function ropeSide(side: number, height: number, material: THREE.Material, keep: <T extends { dispose(): void }>(t: T) => T): THREE.Mesh {
  const angle = (side * Math.PI) / 2;
  const inset = ROPE_INSET;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const along = -inset + (2 * inset * i) / 12;
    const sag = 0.035 * Math.sin((Math.PI * i) / 12);
    points.push(new THREE.Vector3(Math.sin(angle) * inset + Math.cos(angle) * along, height - sag, Math.cos(angle) * inset - Math.sin(angle) * along));
  }
  const mesh = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.024, 8)), material);
  mesh.castShadow = true;
  return mesh;
}

function steps(x: number, z: number, keep: <T extends { dispose(): void }>(t: T) => T): THREE.Group {
  const group = new THREE.Group();
  const metal = keep(new THREE.MeshStandardMaterial({ color: "#2a2d38", metalness: 0.6, roughness: 0.4 }));
  const tread = keep(new THREE.BoxGeometry(0.9, 0.08, 0.35));
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(tread, metal);
    step.position.set(0, -PLATFORM + 0.28 * (i + 1), -0.35 * i);
    group.add(step);
  }
  group.position.set(x * (MAT_HALF + 0.9), 0, z * (MAT_HALF + 0.9));
  group.rotation.y = Math.atan2(x, z);
  return group;
}

/** The corner stool, brought in between rounds under a boxer resting on their corner spot. */
function stool(corner: number, keep: <T extends { dispose(): void }>(t: T) => T): THREE.Group {
  const group = new THREE.Group();
  const wood = keep(new THREE.MeshStandardMaterial({ color: "#6b4a2a", roughness: 0.7 }));
  const seat = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18)), wood);
  seat.position.y = 0.55;
  group.add(seat);
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 8)), wood);
    const a = (i * Math.PI * 2) / 3;
    leg.position.set(Math.sin(a) * 0.14, 0.275, Math.cos(a) * 0.14);
    group.add(leg);
  }
  const spot = CORNERS[corner < 0 ? 0 : 1];
  group.position.set(spot.x, 0, spot.z);
  group.visible = false;
  return group;
}

/** Rounds a box's edges by pushing its vertices toward a smaller box, for padded shapes. */
function roundBox(geometry: THREE.BoxGeometry, radius: number): void {
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const { width, height, depth } = geometry.parameters;
  const inner = new THREE.Vector3(width / 2 - radius, height / 2 - radius, depth / 2 - radius);
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    c.set(THREE.MathUtils.clamp(p.x, -inner.x, inner.x), THREE.MathUtils.clamp(p.y, -inner.y, inner.y), THREE.MathUtils.clamp(p.z, -inner.z, inner.z));
    p.sub(c).normalize().multiplyScalar(radius).add(c);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
}
