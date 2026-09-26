import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type V3 = readonly [number, number, number];

const KEEP = new Set(["position", "normal", "uv"]);

/**
 * Collects many small parts and merges them into one mesh per material.
 * A model is built from a few hundred primitives, but each bone draws in
 * a handful of calls, which is what keeps the hall at 60 frames a second.
 */
export class MeshBuilder {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();

  /** Adds a geometry, moved, turned and scaled into place. The builder owns it from here. */
  add(geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    this.euler.set(rot[0], rot[1], rot[2]);
    this.quat.setFromEuler(this.euler);
    this.matrix.compose(new THREE.Vector3(...at), this.quat, new THREE.Vector3(...scale));
    geometry.applyMatrix4(this.matrix);
    return this.push(geometry, material);
  }

  /** Adds a geometry with a ready made matrix. */
  addMatrix(geometry: THREE.BufferGeometry, material: THREE.Material, matrix: THREE.Matrix4): this {
    geometry.applyMatrix4(matrix);
    return this.push(geometry, material);
  }

  box(w: number, h: number, d: number, material: THREE.Material, at: V3, rot?: V3, round = 0): this {
    const r = Math.min(round, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
    return this.add(geo, material, at, rot);
  }

  sphere(radius: number, material: THREE.Material, at: V3, scale: V3 = [1, 1, 1], segments = 16, rot: V3 = [0, 0, 0]): this {
    return this.add(new THREE.SphereGeometry(radius, segments, Math.max(6, segments >> 1)), material, at, rot, scale);
  }

  /** A cylinder standing on y, centred on `at`. */
  cylinder(top: number, bottom: number, height: number, material: THREE.Material, at: V3, rot: V3 = [0, 0, 0], segments = 16, scale: V3 = [1, 1, 1]): this {
    return this.add(new THREE.CylinderGeometry(top, bottom, height, segments, 1), material, at, rot, scale);
  }

  /** A solid of revolution around y, from (radius, height) pairs. */
  lathe(points: readonly (readonly [number, number])[], material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], segments = 24, rot: V3 = [0, 0, 0]): this {
    const geo = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), segments);
    return this.add(geo, material, at, rot, scale);
  }

  /** A round bar from a to b, for piping, straps, quillons and railings. */
  rod(a: V3, b: V3, radius: number, material: THREE.Material, segments = 8, radiusEnd = radius): this {
    const from = new THREE.Vector3(...a);
    const dir = new THREE.Vector3(...b).sub(from);
    const geo = new THREE.CylinderGeometry(radiusEnd, radius, dir.length(), segments, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const mid = from.addScaledVector(dir, 0.5);
    return this.addMatrix(geo, material, new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)));
  }

  /** A tube along a smooth curve through the points. */
  tube(points: readonly V3[], radius: number, material: THREE.Material, segments = 24, radial = 8): this {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return this.push(new THREE.TubeGeometry(curve, segments, radius, radial, false), material);
  }

  /** A flat shape in the x y plane, extruded `depth` along z and centred on it. */
  extrude(shape: THREE.Shape, depth: number, material: THREE.Material, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], bevel = 0): this {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 12,
    });
    geo.translate(0, 0, -depth / 2);
    return this.add(geo, material, at, rot);
  }

  get empty(): boolean {
    return this.parts.size === 0;
  }

  /** Merges everything into one mesh per material, in a group. */
  build(name = "merged", shadows = true): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, geometries] of this.parts) {
      const merged = mergeGeometries(geometries, false);
      for (const geo of geometries) geo.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }

  private push(geometry: THREE.BufferGeometry, material: THREE.Material): this {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geo !== geometry) geometry.dispose();
    for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position!.count * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.clearGroups();
    const list = this.parts.get(material) ?? [];
    list.push(geo);
    this.parts.set(material, list);
    return this;
  }
}

/**
 * Frees every geometry under an object, and every material that is not
 * one of the shared ones from `materials.ts` (those are marked shared).
 */
export function disposeOwned(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite)) return;
    if (!(object instanceof THREE.Sprite)) object.geometry.dispose();
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) if (!material.userData.shared) materials.add(material);
  });
  for (const material of materials) material.dispose();
}
