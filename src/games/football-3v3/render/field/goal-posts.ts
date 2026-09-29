import * as THREE from "three";
import { POSTS } from "../../engine/field";
import { box, cyl, merge, paint, rod } from "../models/geo";

const YELLOW = "#f2d024";

/**
 * A slingshot goal post on an end line: a padded base post set back
 * behind the line, a gooseneck curving forward, the crossbar 10 feet up
 * and two uprights reaching high, with a ribbon on each tip. Built for
 * the +x end; the other end is the same turned round.
 */
export function goalPostGeometry(): THREE.BufferGeometry {
  const back = 1.8;
  const barY = POSTS.crossbar;
  const r = 0.09;
  const parts: THREE.BufferGeometry[] = [
    // The padded base, in navy, then the yellow post above it.
    paint(cyl(0.3, 0.3, 2.0, 16), "#12203f", { at: [back, 1.0, 0] }),
    paint(cyl(0.12, 0.12, barY - 2.0 + 0.6, 12), YELLOW, { at: [back, 2.0 + (barY - 1.4) / 2, 0] }),
  ];
  // The gooseneck: a curve from the post top forward to the middle of the crossbar.
  const steps = 6;
  let prev: [number, number, number] = [back, barY + 0.6, 0];
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    const p: [number, number, number] = [back * Math.cos(a), barY + 0.6 * Math.cos(a), 0];
    parts.push(rod(prev, p, r, YELLOW, 10));
    prev = p;
  }
  parts.push(rod([0, barY, -POSTS.halfGap], [0, barY, POSTS.halfGap], r, YELLOW, 12));
  for (const side of [-1, 1]) {
    parts.push(paint(cyl(0.065, 0.075, POSTS.top - barY, 10), YELLOW, { at: [0, (barY + POSTS.top) / 2, side * POSTS.halfGap] }));
    // The wind ribbon at the top of each upright.
    parts.push(paint(box(0.04, 1.1, 0.12), "#ff5a1f", { at: [0.1, POSTS.top - 0.4, side * POSTS.halfGap], rot: [0, 0, -0.35] }));
  }
  return merge(parts);
}

export function buildGoalPosts(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = goalPostGeometry();
  for (const sign of [-1, 1]) {
    const m = new THREE.Mesh(geo, material);
    m.position.x = sign * POSTS.x;
    m.rotation.y = sign > 0 ? 0 : Math.PI;
    m.castShadow = true;
    group.add(m);
  }
  return group;
}
