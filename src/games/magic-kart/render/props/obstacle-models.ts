import * as THREE from "three";
import type { ObstacleKind } from "../../tracks/types";
import { ball, box, cyl, merge, mirrorX, paint, ring, rod } from "../models/geo";

/** A lumpy rock, pushed in and out a little per corner so no two faces match. */
function lumpy(radius: number, hex: string, seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + Math.sin(pos.getX(i) * 3.1 + seed) * Math.cos(pos.getZ(i) * 2.7 + seed) * 0.16;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  return paint(g, hex);
}

function crab(): THREE.BufferGeometry {
  const side = [
    paint(ball(0.32, 12, 8), "#ff5a3c", { at: [0.95, 0.55, 0.45], scale: [1, 0.8, 1.2] }),
    paint(ball(0.18, 10, 8), "#ff7a5c", { at: [1.05, 0.62, 0.78], scale: [0.7, 0.6, 1.4] }),
    rod([0.5, 0.45, 0.3], [0.9, 0.52, 0.42], 0.08, "#e2432a"),
    rod([0.22, 0.75, 0.45], [0.26, 1.05, 0.5], 0.04, "#e2432a"),
    paint(ball(0.1, 10, 8), "#ffffff", { at: [0.26, 1.1, 0.52] }),
    paint(ball(0.05, 8, 6), "#1b1b24", { at: [0.28, 1.12, 0.6] }),
  ];
  for (let i = 0; i < 3; i++) side.push(rod([0.55, 0.45, -0.2 + i * 0.25], [1.05, 0.05, -0.35 + i * 0.3], 0.05, "#d63a22"));
  return merge([paint(ball(0.7, 18, 12), "#ff5a3c", { at: [0, 0.5, 0], scale: [1, 0.55, 0.8] }), ...mirrorX(side)]);
}

function sandcastle(): THREE.BufferGeometry {
  const parts = [paint(cyl(1.4, 1.55, 0.7, 16), "#e8cc8a", { at: [0, 0.35, 0] }), paint(cyl(0.7, 0.8, 1.6, 12), "#f0d596", { at: [0, 1.3, 0] })];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push(paint(cyl(0.34, 0.38, 1.2, 10), "#f0d596", { at: [Math.cos(a) * 1.05, 1.1, Math.sin(a) * 1.05] }));
    parts.push(paint(new THREE.ConeGeometry(0.4, 0.5, 10), "#e2c07a", { at: [Math.cos(a) * 1.05, 1.95, Math.sin(a) * 1.05] }));
  }
  parts.push(rod([0, 2.1, 0], [0, 3, 0], 0.03, "#8a6a3a"), paint(box(0.5, 0.3, 0.02), "#ff4d6d", { at: [0.25, 2.8, 0] }));
  return merge(parts);
}

function satellite(): THREE.BufferGeometry {
  const panel = [paint(box(1.6, 0.05, 0.9), "#2a5bd7", { at: [1.4, 1.4, 0] }), rod([0.4, 1.4, 0], [0.6, 1.4, 0], 0.05, "#c9ccd6")];
  for (let i = 0; i < 3; i++) panel.push(paint(box(0.03, 0.06, 0.9), "#9fb4ff", { at: [0.9 + i * 0.5, 1.41, 0] }));
  return merge([
    paint(box(0.8, 0.9, 0.8, 0.08), "#e0b43a", { at: [0, 1.4, 0] }),
    paint(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), "#eeeeee", { at: [0, 2.0, 0], rot: [0.6, 0, 0] }),
    rod([0, 1.4, 0], [0, 0, 0], 0.06, "#9aa2b4"),
    ...mirrorX(panel),
  ]);
}

function drone(): THREE.BufferGeometry {
  const arm = [rod([0, 1.5, 0], [0.95, 1.5, 0.95], 0.06, "#2c2f3a"), paint(ring(0.42, 0.05, 20, 6), "#ff3fb4", { at: [0.95, 1.55, 0.95], rot: [Math.PI / 2, 0, 0] }), paint(cyl(0.38, 0.38, 0.02, 16), "#6a6f80", { at: [0.95, 1.6, 0.95] })];
  const back = arm.map((g) => g.clone().applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1)));
  return merge([
    paint(box(0.9, 0.35, 0.9, 0.12), "#2c2f3a", { at: [0, 1.5, 0] }),
    paint(ball(0.18, 12, 8), "#ff3040", { at: [0, 1.45, 0.45] }),
    paint(cyl(0.06, 0.06, 0.4, 6), "#2c2f3a", { at: [0, 1.15, 0] }),
    ...mirrorX(arm),
    ...mirrorX(back),
  ]);
}

function cone(): THREE.BufferGeometry {
  return merge([
    paint(box(1.1, 0.12, 1.1, 0.04), "#1f1f24", { at: [0, 0.06, 0] }),
    paint(new THREE.ConeGeometry(0.45, 1.3, 16), "#ff7a1a", { at: [0, 0.75, 0] }),
    paint(cyl(0.27, 0.33, 0.2, 16), "#ffffff", { at: [0, 0.8, 0] }),
  ]);
}

function pillar(): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 4; i++) parts.push(paint(cyl(0.75 - i * 0.05, 0.8 - i * 0.05, 1.2, 6), i % 2 ? "#3a3033" : "#2e2629", { at: [0, 0.6 + i * 1.2, 0], rot: [0, i * 0.4, 0] }));
  return merge(parts);
}

/** Lit geometry and, for glowing rocks and eyes, a matching glow layer. */
export function obstacleGeometry(kind: ObstacleKind): { lit: THREE.BufferGeometry; glow: THREE.BufferGeometry | null } {
  switch (kind) {
    case "crab":
      return { lit: crab(), glow: null };
    case "sandcastle":
      return { lit: sandcastle(), glow: null };
    case "asteroid":
      return { lit: merge([lumpy(1.5, "#7a6f6a", 1), paint(ball(0.35, 8, 6), "#5a514d", { at: [0.9, 0.7, 0.9] })]), glow: null };
    case "satellite":
      return { lit: satellite(), glow: null };
    case "drone":
      return { lit: drone(), glow: merge([paint(ball(0.12, 10, 8), "#ff5060", { at: [0, 1.45, 0.52] })]) };
    case "cone":
      return { lit: cone(), glow: null };
    case "boulder":
      return { lit: lumpy(1.6, "#3a2d2a", 4), glow: merge([lumpy(1.52, "#ff5a1a", 9)]) };
    case "pillar":
      return { lit: pillar(), glow: merge([paint(cyl(0.2, 0.2, 4.6, 6), "#ff7a1f", { at: [0.62, 2.4, 0] })]) };
  }
}
