import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  Quaternion,
  TubeGeometry,
  Vector3,
  type Material,
} from "three";
import { leafMaterial, woodyMaterial } from "./materials";

/**
 * The small pieces that make a fruit read at a glance: stems, leaves,
 * the strawberry's green collar, the pineapple's crown. Geometry is built
 * once per shape and shared by every copy.
 */

const leafCache = new Map<string, BufferGeometry>();

/**
 * A leaf lying along +y from its base at the origin, pointed at the tip,
 * folded a little along the midrib and curling back toward -z.
 */
export function leafGeometry(length: number, width: number, curl: number, fold = 0.25): BufferGeometry {
  const key = `${length}:${width}:${curl}:${fold}`;
  const cached = leafCache.get(key);
  if (cached) return cached;
  const along = 14;
  const across = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= along; i++) {
    const s = i / along;
    const half = width * Math.pow(Math.sin(Math.PI * Math.min(0.999, s * 0.92 + 0.04)), 0.85) * (1 - 0.35 * s) * 0.5;
    for (let j = 0; j <= across; j++) {
      const k = j / across - 0.5;
      const x = k * 2 * half;
      positions.push(x, s * length, -curl * s * s * length + fold * Math.abs(x));
      uvs.push(j / across, s);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j;
      index.push(a, a + 1, a + across + 1, a + 1, a + across + 2, a + across + 1);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  leafCache.set(key, geo);
  return geo;
}

const UP = new Vector3(0, 1, 0);

/** Stands a part at `base`, pointing along `direction`, turned `roll` radians about it. */
export function place<T extends Mesh | Group>(part: T, base: Vector3, direction: Vector3, roll = 0): T {
  const dir = direction.clone().normalize();
  part.position.copy(base);
  part.quaternion.setFromUnitVectors(UP, dir).multiply(new Quaternion().setFromAxisAngle(UP, roll));
  return part;
}

export function leaf(length: number, width: number, curl: number, tint?: string, fold?: number): Mesh {
  const mesh = new Mesh(leafGeometry(length, width, curl, fold), leafMaterial(tint));
  mesh.castShadow = true;
  return mesh;
}

/** A short curved stem rising from `base`. */
export function stem(base: Vector3, height: number, radius: number, bend: number, colour = "#5a3a1c"): Mesh {
  const curve = new CatmullRomCurve3([
    base.clone(),
    base.clone().add(new Vector3(bend * 0.3, height * 0.5, 0)),
    base.clone().add(new Vector3(bend, height, 0)),
  ]);
  const mesh = new Mesh(new TubeGeometry(curve, 8, radius, 6, false), woodyMaterial(colour));
  mesh.castShadow = true;
  return mesh;
}

/** A ring of leaves around a point, like a strawberry's collar or a tomato's star. */
export function collar(base: Vector3, count: number, length: number, width: number, droop: number, tint?: string): Group {
  const group = new Group();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const out = new Vector3(Math.sin(a), droop, Math.cos(a));
    const part = leaf(length * (0.85 + ((i * 37) % 10) / 40), width, -0.4, tint, 0.15);
    place(part, base, out, 0);
    // Turn the leaf so its face lies along the fruit, not edge on.
    part.rotateY(Math.PI / 2);
    group.add(part);
  }
  return group;
}

/** A cylinder with a jagged rim, for the pomegranate's crown. */
export function toothedCrown(base: Vector3, radius: number, height: number, teeth: number, material: Material): Mesh {
  const geo = new CylinderGeometry(radius * 1.15, radius * 0.8, height, teeth * 2, 1, true);
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) <= 0) continue;
    const a = Math.atan2(pos.getX(i), pos.getZ(i));
    const tooth = Math.round(((a + Math.PI) / (Math.PI * 2)) * teeth * 2) % 2 === 0;
    pos.setY(i, tooth ? height * 0.9 : height * 0.15);
  }
  geo.computeVertexNormals();
  geo.translate(0, height / 2, 0);
  const mesh = new Mesh(geo, material);
  mesh.position.copy(base);
  mesh.castShadow = true;
  return mesh;
}
