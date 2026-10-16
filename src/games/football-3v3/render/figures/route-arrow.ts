import * as THREE from "three";
import type { V2 } from "../../engine/vec";

/** The arrow painted on the turf: ribbon width, and the head's length and width, metres. */
export const ARROW = { width: 0.3, head: 1.0, headWidth: 0.9, y: 0.035 } as const;

/** A corner sharper than this mitre length (in half widths) is bevelled on its outside, so it never spikes. */
const MITRE_LIMIT = 3;

const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, z: a.z - b.z });
const add = (a: V2, b: V2, k = 1): V2 => ({ x: a.x + b.x * k, z: a.z + b.z * k });
const unit = (v: V2): V2 => {
  const l = Math.hypot(v.x, v.z) || 1;
  return { x: v.x / l, z: v.z / l };
};
/** The unit normal to the left of a direction on the ground. */
const leftOf = (d: V2): V2 => ({ x: -d.z, z: d.x });

/**
 * The offset of a corner on one side (`s` 1 left, -1 right), for the leg
 * coming in along `d1` and the one going out along `d2`. The inside of
 * the turn and a gentle outside meet in one mitred point; a sharp
 * outside gets two, cut square across the corner.
 */
export function cornerPoints(p: V2, d1: V2, d2: V2, half: number, s: 1 | -1): V2[] {
  const n1 = leftOf(d1);
  const n2 = leftOf(d2);
  const m = { x: n1.x + n2.x, z: n1.z + n2.z };
  const ml = Math.hypot(m.x, m.z);
  const cos = ml / 2;
  const turnLeft = d1.x * d2.z - d1.z * d2.x > 0;
  const outside = (s === 1) !== turnLeft;
  if (ml > 1e-6 && (!outside || 1 / cos <= MITRE_LIMIT)) {
    const k = (half * s) / Math.max(cos, 1 / MITRE_LIMIT ** 2);
    return [add(p, { x: m.x / ml, z: m.z / ml }, k)];
  }
  return [add(p, n1, half * s), add(p, n2, half * s)];
}

/**
 * The outline of a route arrow: a ribbon of even width along every leg
 * with sharp corners, and a crisp head at its end. Left side out, head,
 * right side back. Null for a route too short to draw. Pure.
 */
export function arrowOutline(points: readonly V2[]): V2[] | null {
  const pts = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1]!.x, p.z - points[i - 1]!.z) > 0.05);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const seg = Math.hypot(last.x - prev.x, last.z - prev.z);
  const dir = unit(sub(last, prev));
  // The ribbon stops where the head begins.
  const cut = Math.min(ARROW.head, seg * 0.9);
  const body = [...pts.slice(0, -1), add(last, dir, -cut)];
  const half = ARROW.width / 2;
  const sides: V2[][] = [[], []];
  body.forEach((p, i) => {
    const d1 = unit(sub(p, body[Math.max(0, i - 1)]!));
    const d2 = i < body.length - 1 ? unit(sub(body[i + 1]!, p)) : d1;
    const din = i === 0 ? d2 : d1;
    const ends = i === 0 || i === body.length - 1;
    ([1, -1] as const).forEach((s, k) => sides[k]!.push(...(ends ? [add(p, leftOf(din), half * s)] : cornerPoints(p, d1, d2, half, s))));
  });
  const tail = body[body.length - 1]!;
  const wing = leftOf(dir);
  const head = [add(tail, wing, ARROW.headWidth / 2), last, add(tail, wing, -ARROW.headWidth / 2)];
  return [...sides[0]!, ...head, ...sides[1]!.reverse()];
}

/** The arrow as a flat mesh on the turf, filled once with no overlaps, so a see through arrow is even all over. */
export function arrowGeometry(points: readonly V2[]): THREE.BufferGeometry | null {
  const outline = arrowOutline(points);
  if (!outline) return null;
  const faces = THREE.ShapeUtils.triangulateShape(outline.map((p) => new THREE.Vector2(p.x, p.z)), []);
  const pos = outline.flatMap((p) => [p.x, ARROW.y, p.z]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(faces.flat());
  return g;
}
