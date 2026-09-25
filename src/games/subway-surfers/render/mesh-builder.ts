import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = readonly [number, number, number];

/**
 * What a part is made of: a flat colour on one of a few shared finishes,
 * or a material of its own (a texture, a glow). Colours ride along as
 * vertex colours, so a whole character or train car of many colours
 * still draws in a handful of calls.
 */
export type Paint = number | { color: number; finish: Finish } | THREE.Material;
export type Finish = "matte" | "satin" | "gloss" | "metal" | "glow";

const FINISHES: Record<Finish, THREE.MeshStandardMaterialParameters> = {
  matte: { roughness: 0.85, metalness: 0 },
  satin: { roughness: 0.55, metalness: 0.05 },
  gloss: { roughness: 0.28, metalness: 0.1 },
  metal: { roughness: 0.35, metalness: 0.75 },
  glow: { roughness: 1, metalness: 0 },
};

const shared = new Map<Finish, THREE.Material>();

/** The one vertex coloured material for each finish, shared by every model. */
export function finish(kind: Finish): THREE.Material {
  let material = shared.get(kind);
  if (!material) {
    // Matte parts are the big plain surfaces, walls and ground, where the cheaper Lambert
    // shading looks the same and saves the most drawing. Shiny parts keep the full model.
    material =
      kind === "glow"
        ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
        : kind === "matte"
          ? new THREE.MeshLambertMaterial({ vertexColors: true })
          : new THREE.MeshStandardMaterial({ vertexColors: true, ...FINISHES[kind] });
    material.userData.shared = true;
    shared.set(kind, material);
  }
  return material;
}

const KEEP = new Set(["position", "normal", "uv"]);
const color = new THREE.Color();

/**
 * Collects many small parts and merges them into one mesh per material.
 * A runner or a train car is built from dozens of rounded boxes and
 * spheres, but drawn in two or three calls.
 */
export class MeshBuilder {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();

  /** Adds a geometry, moved and turned into place. The builder owns it from here. */
  add(geometry: THREE.BufferGeometry, paint: Paint, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    this.euler.set(rot[0], rot[1], rot[2]);
    this.quat.setFromEuler(this.euler);
    this.matrix.compose(new THREE.Vector3(...at), this.quat, new THREE.Vector3(...scale));
    geometry.applyMatrix4(this.matrix);
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geo !== geometry) geometry.dispose();
    for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
    const count = geo.attributes.position!.count;
    if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.clearGroups();
    let material: THREE.Material;
    if (paint instanceof THREE.Material) material = paint;
    else {
      const { color: hex, finish: kind } = typeof paint === "number" ? { color: paint, finish: "satin" as Finish } : paint;
      material = finish(kind);
      color.setHex(hex).convertSRGBToLinear();
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    const list = this.parts.get(material) ?? [];
    list.push(geo);
    this.parts.set(material, list);
    return this;
  }

  box(w: number, h: number, d: number, paint: Paint, at: V3, rot?: V3, round = 0): this {
    const r = Math.min(round, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
    return this.add(geo, paint, at, rot);
  }

  /** A cylinder lying along z. */
  tube(radius: number, length: number, paint: Paint, at: V3, segments = 14, radiusEnd = radius, rot: V3 = [Math.PI / 2, 0, 0]): this {
    return this.add(new THREE.CylinderGeometry(radiusEnd, radius, length, segments), paint, at, rot);
  }

  /** A cylinder standing up. */
  post(radius: number, height: number, paint: Paint, at: V3, segments = 12, radiusTop = radius, rot?: V3): this {
    return this.add(new THREE.CylinderGeometry(radiusTop, radius, height, segments), paint, at, rot);
  }

  sphere(radius: number, paint: Paint, at: V3, scale: V3 = [1, 1, 1], segments = 14, rot?: V3): this {
    return this.add(new THREE.SphereGeometry(radius, segments, Math.max(6, segments >> 1)), paint, at, rot ?? [0, 0, 0], scale);
  }

  /** A capsule standing along y: arms, legs, fingers. */
  capsule(radius: number, length: number, paint: Paint, at: V3, rot?: V3, scale?: V3): this {
    return this.add(new THREE.CapsuleGeometry(radius, length, 4, 12), paint, at, rot, scale);
  }

  /** A flat panel facing +z, for textured signs and graffiti. */
  panel(w: number, h: number, paint: Paint, at: V3, rot?: V3): this {
    return this.add(new THREE.PlaneGeometry(w, h), paint, at, rot);
  }

  get empty(): boolean {
    return this.parts.size === 0;
  }

  /** Merges everything into one mesh per material, in a group. */
  build(name = "merged"): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, geometries] of this.parts) {
      const hasColor = geometries.some((g) => g.attributes.color);
      if (hasColor) for (const g of geometries) if (!g.attributes.color) g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 3).fill(1), 3));
      const merged = mergeGeometries(geometries, false);
      for (const geo of geometries) geo.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      group.add(new THREE.Mesh(merged, material));
    }
    this.parts.clear();
    return group;
  }
}

/** Frees a model's own geometries and materials, leaving the shared ones alone. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh && !(node as THREE.Points).isPoints && !(node as THREE.Sprite).isSprite) return;
    if (!node.userData.sharedGeometry) mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of materials) if (m && !m.userData.shared) m.dispose();
  });
}
