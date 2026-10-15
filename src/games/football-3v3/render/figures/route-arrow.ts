import * as THREE from "three";
import type { V2 } from "../../engine/vec";

/** The arrow painted on the turf: ribbon width, and the head's length and width, metres. */
export const ARROW = { width: 0.3, head: 0.95, headWidth: 0.85, y: 0.035 } as const;

/** The unit normal to the left of the way from `a` to `b` on the ground. */
function normal(a: V2, b: V2): V2 {
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: -(b.z - a.z) / l, z: (b.x - a.x) / l };
}

/**
 * The offset at a corner: the two legs' normals averaged and stretched
 * so the ribbon keeps its width round the cut (a mitre), capped so a
 * sharp cut does not spike.
 */
export function mitre(n1: V2, n2: V2): V2 {
  const m = { x: n1.x + n2.x, z: n1.z + n2.z };
  const l = Math.hypot(m.x, m.z);
  if (l < 1e-6) return n1;
  const k = 1 / Math.max(0.5, (m.x * n1.x + m.z * n1.z) / l);
  return { x: (m.x / l) * k, z: (m.z / l) * k };
}

/**
 * A flat arrow along the first steps of a route, as a ribbon with mitred
 * corners so a cut reads as one clean line, and a head at its end.
 * Built once for a set of points; null for a route too short to draw.
 */
export function arrowGeometry(points: readonly V2[]): THREE.BufferGeometry | null {
  const pts = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1]!.x, p.z - points[i - 1]!.z) > 0.05);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const seg = Math.hypot(last.x - prev.x, last.z - prev.z);
  const dir = { x: (last.x - prev.x) / seg, z: (last.z - prev.z) / seg };
  // The ribbon stops where the head begins.
  const cut = Math.min(ARROW.head, seg * 0.9);
  const body = [...pts.slice(0, -1), { x: last.x - dir.x * cut, z: last.z - dir.z * cut }];
  const pos: number[] = [];
  const index: number[] = [];
  const half = ARROW.width / 2;
  body.forEach((p, i) => {
    const before = normal(body[Math.max(0, i - 1)]!, i > 0 ? p : body[1]!);
    const after = i < body.length - 1 ? normal(p, body[i + 1]!) : before;
    const n = i === 0 ? after : mitre(before, after);
    pos.push(p.x + n.x * half, ARROW.y, p.z + n.z * half, p.x - n.x * half, ARROW.y, p.z - n.z * half);
    if (i > 0) {
      const o = (i - 1) * 2;
      index.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
  });
  const tail = body[body.length - 1]!;
  const side = { x: -dir.z * (ARROW.headWidth / 2), z: dir.x * (ARROW.headWidth / 2) };
  const h = pos.length / 3;
  pos.push(tail.x + side.x, ARROW.y, tail.z + side.z, tail.x - side.x, ARROW.y, tail.z - side.z, last.x, ARROW.y, last.z);
  index.push(h, h + 1, h + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}
