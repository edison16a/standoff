import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type V3 = readonly [number, number, number];

const KEEP = new Set(["position", "normal", "uv"]);

/**
 * Collects many small parts and merges them into one mesh per material.
 * A gun or a street block is built from dozens of boxes and cylinders,
 * but drawn in a handful of calls, which is what keeps the host at 60 fps.
 */
export class MeshBuilder {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();

  /** Adds a geometry, moved and turned into place. The builder owns it from here. */
  add(geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    this.euler.set(rot[0], rot[1], rot[2]);
    this.quat.setFromEuler(this.euler);
    this.matrix.compose(new THREE.Vector3(...at), this.quat, new THREE.Vector3(...scale));
    geometry.applyMatrix4(this.matrix);
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geo !== geometry) geometry.dispose();
    for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((geo.attributes.position!.count) * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.clearGroups();
    const list = this.parts.get(material) ?? [];
    list.push(geo);
    this.parts.set(material, list);
    return this;
  }

  box(w: number, h: number, d: number, material: THREE.Material, at: V3, rot?: V3, round = 0): this {
    const r = Math.min(round, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
    return this.add(geo, material, at, rot);
  }

  /** A cylinder lying along z, the way barrels and tubes run. */
  tube(radius: number, length: number, material: THREE.Material, at: V3, segments = 16, radiusEnd = radius, rot: V3 = [Math.PI / 2, 0, 0]): this {
    return this.add(new THREE.CylinderGeometry(radiusEnd, radius, length, segments), material, at, rot);
  }

  /** A cylinder standing up, for posts, poles and trunks. */
  post(radius: number, height: number, material: THREE.Material, at: V3, segments = 12, radiusTop = radius): this {
    return this.add(new THREE.CylinderGeometry(radiusTop, radius, height, segments), material, at);
  }

  sphere(radius: number, material: THREE.Material, at: V3, scale: V3 = [1, 1, 1], segments = 12): this {
    return this.add(new THREE.SphereGeometry(radius, segments, Math.max(6, segments >> 1)), material, at, [0, 0, 0], scale);
  }

  get empty(): boolean {
    return this.parts.size === 0;
  }

  /** Merges everything into one mesh per material, in a group. */
  build(name = "merged"): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, geometries] of this.parts) {
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
