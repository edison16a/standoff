import * as THREE from "three";
import { ball, box, cyl, merge, paint, profile, type V3 } from "../models/geo";

/** A leaf outline, a long pointed oval with a notched edge, bent to droop from the crown. */
function frond(length: number, droop: number, hex: string): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    shape.lineTo(Math.sin(t * Math.PI) * 0.55 * (i % 2 ? 1 : 0.7), t * length);
  }
  for (let i = steps - 1; i >= 1; i--) {
    const t = i / steps;
    shape.lineTo(-Math.sin(t * Math.PI) * 0.55 * (i % 2 ? 1 : 0.7), t * length);
  }
  shape.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(shape);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / length;
    // Curl down along the length and fold slightly along the midrib.
    pos.setZ(i, -droop * t * t * length - Math.abs(pos.getX(i)) * 0.35);
  }
  g.rotateX(-Math.PI / 2);
  return paint(g, hex);
}

/**
 * A palm tree like the cover's: a segmented trunk leaning out in a gentle
 * curve, coconuts, and a crown of drooping fronds in two greens.
 */
export function palmTree(lean: number, height: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const segments = 9;
  let top: V3 = [0, 0, 0];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const x0 = lean * t0 * t0 * height;
    const x1 = lean * t1 * t1 * height;
    const y0 = t0 * height;
    const y1 = t1 * height;
    const r = 0.34 - t0 * 0.12;
    const seg = cyl(r * 0.92, r, (height / segments) * 1.05, 10);
    const tilt = Math.atan2(x1 - x0, y1 - y0);
    parts.push(paint(seg, i % 2 ? "#a86b34" : "#8c5528", { at: [(x0 + x1) / 2, (y0 + y1) / 2, 0], rot: [0, 0, -tilt] }));
    top = [x1, y1, 0];
  }
  parts.push(paint(ball(0.36, 10, 8), "#6f8a2a", { at: [top[0], top[1] - 0.1, top[2]] }));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push(paint(ball(0.2, 10, 8), "#6b4a2a", { at: [top[0] + Math.cos(a) * 0.28, top[1] - 0.35, Math.sin(a) * 0.28] }));
  }
  const leaves = 8;
  for (let i = 0; i < leaves; i++) {
    const leaf = frond(3.4 + (i % 3) * 0.5, 0.28 + (i % 2) * 0.08, i % 2 ? "#3aa845" : "#2e8f3b");
    leaf.rotateY((i / leaves) * Math.PI * 2 + 0.3);
    leaf.translate(top[0], top[1] + 0.05, top[2]);
    parts.push(leaf);
  }
  return merge(parts);
}

/** A beach umbrella with alternating panels, and a towel under it. */
export function umbrella(a: string, b: string): THREE.BufferGeometry {
  const parts = [paint(cyl(0.05, 0.05, 3, 6), "#e8e8e8", { at: [0, 1.5, 0], rot: [0, 0, 0.12] })];
  const panels = 8;
  for (let i = 0; i < panels; i++) {
    const slice = new THREE.ConeGeometry(1.9, 0.8, 2, 1, true, (i / panels) * Math.PI * 2, (Math.PI * 2) / panels);
    parts.push(paint(slice, i % 2 ? a : b, { at: [0.35, 3.05, 0] }));
  }
  parts.push(paint(box(1, 0.03, 2, 0), b, { at: [1.1, 0.02, 0.2], rot: [0, 0.3, 0] }));
  parts.push(paint(box(1, 0.031, 0.3, 0), a, { at: [1.1, 0.02, 0.2], rot: [0, 0.3, 0] }));
  return merge(parts);
}

/** A striped beach ball, like the ones on the cover. */
export function beachBall(): THREE.BufferGeometry {
  const colors = ["#ff4d6d", "#ffffff", "#3a86ff", "#ffffff", "#ffd23f", "#ffffff"];
  return merge(colors.map((c, i) => paint(new THREE.SphereGeometry(0.6, 6, 10, (i / 6) * Math.PI * 2, Math.PI / 3), c, { at: [0, 0.6, 0] })));
}

export function rock(hex: string): THREE.BufferGeometry {
  const g = new THREE.DodecahedronGeometry(1, 0);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * 0.6 + 0.3);
  return paint(g, hex, { scale: [1.3, 1, 1.1] });
}

/** A red and white lighthouse on its rock, lamp glowing at the top. */
export function lighthouse(): THREE.BufferGeometry {
  const parts = [paint(rock("#8a8f99"), "#8a8f99", { scale: [4, 2.5, 4] })];
  for (let i = 0; i < 5; i++) {
    parts.push(paint(cyl(1.5 - (i + 1) * 0.12, 1.5 - i * 0.12, 2.2, 16), i % 2 ? "#ffffff" : "#e8384f", { at: [0, 2.4 + i * 2.2, 0] }));
  }
  parts.push(paint(cyl(1.25, 1.25, 0.2, 16), "#333844", { at: [0, 13.4, 0] }));
  parts.push(paint(cyl(0.7, 0.7, 1.4, 12), "#fff3b0", { at: [0, 14.2, 0] }));
  parts.push(paint(new THREE.ConeGeometry(0.95, 1, 12), "#e8384f", { at: [0, 15.4, 0] }));
  return merge(parts);
}

/** A little sailboat out on the water. */
export function sailboat(): THREE.BufferGeometry {
  return merge([
    paint(profile([[2.2, 0.8], [1.6, 0], [-1.8, 0], [-2.2, 0.8]], 1.3, 0.15), "#ffffff"),
    paint(box(1.3, 0.1, 4.2, 0.04), "#3a86ff", { at: [0, 0.8, 0] }),
    paint(cyl(0.06, 0.06, 5, 6), "#d9c7a0", { at: [0, 3.2, 0.2] }),
    paint(new THREE.ConeGeometry(1.4, 4.2, 3), "#ffe14d", { at: [0, 3.2, -0.6], scale: [0.08, 1, 1] }),
  ]);
}
