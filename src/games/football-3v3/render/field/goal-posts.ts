import * as THREE from "three";
import { POSTS } from "../../engine/field";
import type { GoalHitView } from "../../engine/view";
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

/** How far behind the end line the base post stands, where the whole post pivots. */
const BASE_BACK = 1.8;

/**
 * Both goal posts, each hung on a pivot at the foot of its base post so
 * a kick off the steel sets the whole thing shaking, uprights swaying
 * and dying away as a struck post does.
 */
export class GoalPosts {
  readonly group = new THREE.Group();
  private readonly pivots = new Map<1 | -1, THREE.Group>();

  constructor(material: THREE.Material) {
    const geo = goalPostGeometry();
    for (const sign of [-1, 1] as const) {
      const pivot = new THREE.Group();
      pivot.position.x = sign * (POSTS.x + BASE_BACK);
      pivot.rotation.y = sign > 0 ? 0 : Math.PI;
      const m = new THREE.Mesh(geo, material);
      m.position.x = -BASE_BACK;
      m.castShadow = true;
      pivot.add(m);
      this.pivots.set(sign, pivot);
      this.group.add(pivot);
    }
  }

  /** Shakes the post the ball last hit. */
  update(goal: GoalHitView | null): void {
    for (const [sign, pivot] of this.pivots) {
      const hit = goal && goal.part !== "net" && goal.side === sign && goal.age < 3 ? goal : null;
      const amp = hit ? Math.min(0.035, 0.008 + hit.power * 0.01) * Math.exp(-hit.age * 2.2) : 0;
      const wave = hit ? Math.sin(hit.age * Math.PI * 2 * 3.2) : 0;
      pivot.rotation.z = amp * wave;
      pivot.rotation.x = hit?.part === "upright" ? amp * 0.6 * wave * Math.sign(hit.z || 1) : 0;
    }
  }
}
