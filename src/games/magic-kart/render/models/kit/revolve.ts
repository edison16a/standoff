import * as THREE from "three";

/** A point of a cross section turned round the x axis: distance from the axis and position along it. */
export interface Ring {
  r: number;
  x: number;
}

/**
 * Texture coordinates for a vertex: the quad it belongs to round the axis,
 * whether it is that quad's far edge, its share along the section, its
 * angle and its point of the section.
 */
export type RevolveUv = (quad: number, end: 0 | 1, along: number, angle: number, ring: Ring) => [number, number];

/**
 * Turns a cross section round the x axis, the way a tyre or a rim is
 * made on a lathe. Normals come straight from the section's slope, so the
 * surface is perfectly smooth, and each quad gets its own corners so
 * texture tiles (tread blocks) can repeat round the tyre without seams in
 * the shading.
 */
export function revolve(section: readonly Ring[], segments: number, uv: RevolveUv): THREE.BufferGeometry {
  const n = section.length;
  // Outward normal in the (r, x) plane from the slope at each point.
  const normals = section.map((_, k) => {
    const a = section[Math.max(0, k - 1)]!;
    const b = section[Math.min(n - 1, k + 1)]!;
    const dr = b.r - a.r;
    const dx = b.x - a.x;
    const len = Math.hypot(dr, dx) || 1;
    return { r: -dx / len, x: dr / len };
  });
  let length = 0;
  const along = section.map((p, k) => (k === 0 ? 0 : (length += Math.hypot(p.r - section[k - 1]!.r, p.x - section[k - 1]!.x))));
  const total = length || 1;
  const pos: number[] = [];
  const nor: number[] = [];
  const tex: number[] = [];
  const vertex = (k: number, i: number) => {
    const a = (i / segments) * Math.PI * 2;
    const p = section[k]!;
    const m = normals[k]!;
    return {
      p: [p.x, Math.cos(a) * p.r, Math.sin(a) * p.r],
      n: [m.x, Math.cos(a) * m.r, Math.sin(a) * m.r],
      a,
    };
  };
  for (let k = 0; k < n - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const quad = [
        [k, i, 0],
        [k, i + 1, 1],
        [k + 1, i, 0],
        [k + 1, i + 1, 1],
      ] as const;
      const v = quad.map(([kk, ii, end]) => {
        const out = vertex(kk, ii);
        return { ...out, uv: uv(i, end, along[kk]! / total, out.a, section[kk]!) };
      });
      for (const tri of [[0, 2, 1], [1, 2, 3]]) {
        const [a, b, c] = tri.map((t) => v[t]!) as [typeof v[0], typeof v[0], typeof v[0]];
        // Wind each triangle to face the way its normals do.
        const e1 = new THREE.Vector3(...(b.p as [number, number, number])).sub(new THREE.Vector3(...(a.p as [number, number, number])));
        const e2 = new THREE.Vector3(...(c.p as [number, number, number])).sub(new THREE.Vector3(...(a.p as [number, number, number])));
        const face = e1.cross(e2);
        const flip = face.dot(new THREE.Vector3(a.n[0]! + b.n[0]! + c.n[0]!, a.n[1]! + b.n[1]! + c.n[1]!, a.n[2]! + b.n[2]! + c.n[2]!)) < 0;
        for (const vert of flip ? [a, c, b] : [a, b, c]) {
          pos.push(...vert.p);
          nor.push(...vert.n);
          tex.push(...vert.uv);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(tex, 2));
  return g;
}
