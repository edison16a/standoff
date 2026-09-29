import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { inkMaterial, toon } from "./toon";

export type V3 = readonly [number, number, number];

/**
 * What a part is made of: a flat colour on one of a few shared finishes,
 * or a material of its own (a texture, a glow). Colours ride along as
 * vertex colours, so a whole character or train of many colours still
 * draws in a handful of calls.
 */
export type Paint = number | { color: number; finish: Finish } | THREE.Material;
/** Every lit finish shares one toon material, so they merge into one draw. Glow is unlit. */
export type Finish = "matte" | "satin" | "gloss" | "metal" | "glow";

const shared = new Map<"toon" | "glow", THREE.Material>();

/** The one vertex coloured material for each finish, shared by every model. */
export function finish(kind: Finish): THREE.Material {
  const key = kind === "glow" ? "glow" : "toon";
  let material = shared.get(key);
  if (!material) {
    material = key === "glow" ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) : toon({ vertexColors: true });
    material.userData.shared = true;
    shared.set(key, material);
  }
  return material;
}

const KEEP = new Set(["position", "normal", "uv"]);
const color = new THREE.Color();

/**
 * Collects many small parts and merges them into one mesh per material.
 * A runner or a train is built from dozens of rounded boxes and spheres,
 * but drawn in two or three calls. With `outline` on, each part also gets
 * an ink hull, all merged into one more call.
 */
export class MeshBuilder {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly origin = new THREE.Vector3();
  private hull = 0;

  /** Gives the parts added from here an ink outline this thick, in metres. Zero stops it. */
  outline(thickness: number): this {
    this.hull = thickness;
    return this;
  }

  /** The outline thickness in use, to put back after some fine detail drawn without one. */
  get thickness(): number {
    return this.hull;
  }

  /** Moves the parts added from here by this much, for building a train car by car. */
  from(x: number, y: number, z: number): this {
    this.origin.set(x, y, z);
    return this;
  }

  /** Adds a geometry, moved and turned into place. The builder owns it from here. */
  add(geometry: THREE.BufferGeometry, paint: Paint, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    this.euler.set(rot[0], rot[1], rot[2]);
    this.quat.setFromEuler(this.euler);
    this.matrix.compose(new THREE.Vector3(at[0] + this.origin.x, at[1] + this.origin.y, at[2] + this.origin.z), this.quat, new THREE.Vector3(...scale));
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

  /** The ink twin of a part, grown by the outline's thickness, when outlines are on. */
  private ink(make: (t: number) => THREE.BufferGeometry, at: V3, rot?: V3, scale?: V3): void {
    if (this.hull > 0) this.add(make(this.hull), inkMaterial(), at, rot, scale);
  }

  box(w: number, h: number, d: number, paint: Paint, at: V3, rot?: V3, round = 0): this {
    const shape = (g: number) => {
      const r = Math.min(round + g, (w + 2 * g) / 2 - 1e-4, (h + 2 * g) / 2 - 1e-4, (d + 2 * g) / 2 - 1e-4);
      return round > 0 ? new RoundedBoxGeometry(w + 2 * g, h + 2 * g, d + 2 * g, 2, r) : new THREE.BoxGeometry(w + 2 * g, h + 2 * g, d + 2 * g);
    };
    this.ink(shape, at, rot);
    return this.add(shape(0), paint, at, rot);
  }

  /** A cylinder lying along z. */
  tube(radius: number, length: number, paint: Paint, at: V3, segments = 14, radiusEnd = radius, rot: V3 = [Math.PI / 2, 0, 0]): this {
    this.ink((t) => new THREE.CylinderGeometry(radiusEnd + t, radius + t, length + 2 * t, segments), at, rot);
    return this.add(new THREE.CylinderGeometry(radiusEnd, radius, length, segments), paint, at, rot);
  }

  /** A cylinder standing up. */
  post(radius: number, height: number, paint: Paint, at: V3, segments = 12, radiusTop = radius, rot?: V3): this {
    this.ink((t) => new THREE.CylinderGeometry(radiusTop + t, radius + t, height + 2 * t, segments), at, rot);
    return this.add(new THREE.CylinderGeometry(radiusTop, radius, height, segments), paint, at, rot);
  }

  sphere(radius: number, paint: Paint, at: V3, scale: V3 = [1, 1, 1], segments = 14, rot?: V3): this {
    const rings = Math.max(6, segments >> 1);
    // Each axis grows by the same thickness, so a squashed sphere keeps an even line.
    this.ink(() => new THREE.SphereGeometry(radius, segments, rings), at, rot ?? [0, 0, 0], scale.map((s) => (radius * s + this.hull) / radius) as unknown as V3);
    return this.add(new THREE.SphereGeometry(radius, segments, rings), paint, at, rot ?? [0, 0, 0], scale);
  }

  /** A capsule standing along y: arms, legs, fingers. */
  capsule(radius: number, length: number, paint: Paint, at: V3, rot?: V3, scale?: V3): this {
    this.ink((t) => new THREE.CapsuleGeometry(radius + t, length, 4, 12), at, rot, scale);
    return this.add(new THREE.CapsuleGeometry(radius, length, 4, 12), paint, at, rot, scale);
  }

  /** A flat panel facing +z, for textured signs and graffiti. Never outlined. */
  panel(w: number, h: number, paint: Paint, at: V3, rot?: V3, uv?: readonly [number, number, number, number]): this {
    const plane = new THREE.PlaneGeometry(w, h);
    if (uv) {
      // A window onto part of a texture: [u0, v0, u1, v1].
      const attr = plane.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) attr.setXY(i, uv[0] + attr.getX(i) * (uv[2] - uv[0]), uv[1] + attr.getY(i) * (uv[3] - uv[1]));
    }
    return this.add(plane, paint, at, rot);
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
    this.origin.set(0, 0, 0);
    this.hull = 0;
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
