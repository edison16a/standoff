import * as THREE from "three";

/** A turned shape from a profile of [radius, height] points, bottom up. */
export function turned(points: readonly (readonly [number, number])[], segments = 64): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

/** A thin rod along a smooth path through the points. */
export function strand(points: readonly THREE.Vector3[], radius: number, segments = 32): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points as THREE.Vector3[]), segments, radius, 6, false);
}

/**
 * A rod along a smooth path whose thickness changes along it: `radius(t)`
 * for t from 0 at the first point to 1 at the last. Built as a tube of
 * radius 1, then each ring of it is pulled in toward the path.
 */
export function taperedStrand(points: readonly THREE.Vector3[], radius: (t: number) => number, segments = 48, sides = 10): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points as THREE.Vector3[]);
  const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, centre);
    const r = radius(t);
    for (let j = 0; j <= sides; j++) {
      const k = i * (sides + 1) + j;
      v.fromBufferAttribute(position, k).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(k, v.x, v.y, v.z);
    }
  }
  // The normals still point straight out from the path, which a gentle taper barely changes.
  return geometry;
}

/** A ring lying flat, centred at height y. */
export function hoop(radius: number, tube: number, y: number, segments = 64): THREE.TorusGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, 10, segments);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

/** A canvas texture of fine speckle, for a bump map on a pebbled or hammered surface. */
export function speckle(size = 256, seed = 3): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  let s = seed;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.35; i++) {
    const v = 90 + random() * 90;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, 0.8 + random() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Puts a mesh in a group, casting and taking shadows, and returns it. */
export function add(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
