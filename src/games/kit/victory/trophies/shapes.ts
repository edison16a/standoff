import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A tube swept along a curve whose thickness changes along its length,
 * which a plain TubeGeometry cannot do. Used for the figures of the
 * football trophy and the net of the basketball trophy.
 */
export function sweep(curve: THREE.Curve<THREE.Vector3>, radius: (t: number) => number, segments = 64, sides = 10): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const indices: number[] = [];
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, point);
    const r = radius(t);
    const n = frames.normals[i]!;
    const b = frames.binormals[i]!;
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      normal.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
      positions.push(point.x + normal.x * r, point.y + normal.y * r, point.z + normal.z * r);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const c = a + sides + 1;
      indices.push(a, c, a + 1, c, c + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A turned shape from a list of [radius, height] points, bottom first,
 * like a part made on a lathe. Closed at both ends.
 */
export function turned(profile: readonly (readonly [number, number])[], sides = 64): THREE.BufferGeometry {
  const first = profile[0]!;
  const last = profile[profile.length - 1]!;
  const points = [new THREE.Vector2(0, first[1]), ...profile.map(([r, y]) => new THREE.Vector2(r, y)), new THREE.Vector2(0, last[1])];
  const geometry = new THREE.LatheGeometry(points, sides);
  geometry.computeVertexNormals();
  return geometry;
}

/** Several geometries as one, for one draw. Consumes the inputs. */
export function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  for (const part of clean) {
    part.deleteAttribute("uv");
    if (!part.attributes.normal) part.computeVertexNormals();
  }
  const geometry = mergeGeometries(clean, false)!;
  for (const part of [...parts, ...clean]) part.dispose();
  return geometry;
}

/** A ring lying flat, as a band or a lip round a turned part. */
export function band(radius: number, thickness: number, y: number): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, thickness, 12, 72);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

/** A rounded rectangle outline, for plates cut from sheet metal. */
export function roundedRect(width: number, height: number, radius: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

/** A five pointed star outline. */
export function star(outer: number, inner: number, points = 5): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return shape;
}

/** A plate cut from a shape, with a soft bevelled edge that catches the light. Faces +z. */
export function plate(shape: THREE.Shape, depth: number, bevel: number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
  geometry.computeVertexNormals();
  return geometry;
}
