import * as THREE from "three";
import type { Track } from "../../engine/track";
import type { ThemeId } from "../../tracks/types";
import { box, cyl, merge, paint, ring } from "../models/geo";
import { checkerTexture } from "../textures";

const RAINBOW = ["#ff4d5e", "#ff9f40", "#ffe14d", "#5ad96a", "#3fa7ff", "#6c5cff", "#c56bff"];

/** The chequered banner across the top of every start arch. */
function banner(width: number, y: number): THREE.Mesh {
  const texture = checkerTexture();
  texture.repeat.set(width / 8, 1);
  texture.wrapS = THREE.RepeatWrapping;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 1.5, 0.25), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.y = y;
  return mesh;
}

/** Lit parts and glowing parts of an arch, both in the arch's own frame (x across the road). */
function archParts(theme: ThemeId, span: number): { lit: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null; bannerY: number } {
  const half = span / 2;
  switch (theme) {
    case "beach":
      // Seven bands of rainbow, each a half ring standing over the road.
      return {
        lit: merge(RAINBOW.map((c, i) => paint(ring(half + 1.6 - i * 0.62, 0.3, 48, 10, Math.PI), c))),
        glow: null,
        bannerY: half + 0.4,
      };
    case "space":
      return {
        lit: merge([paint(ring(half + 1.2, 0.7, 64, 12), "#2c2a66"), paint(box(1.2, 3, 1.2, 0.2), "#2c2a66", { at: [0, -half - 1.4, 0] })]),
        glow: merge([paint(ring(half + 0.4, 0.14, 64, 8), "#ff4fd8"), paint(ring(half + 2, 0.14, 64, 8), "#3fe8ff")]),
        bannerY: half - 0.8,
      };
    case "city": {
      const lit = [paint(box(1.1, 10, 1.1, 0.1), "#3a3c4e", { at: [-half - 1, 5, 0] }), paint(box(1.1, 10, 1.1, 0.1), "#3a3c4e", { at: [half + 1, 5, 0] })];
      lit.push(paint(box(span + 3.4, 1.3, 1.2, 0.1), "#2a2c3c", { at: [0, 9.6, 0] }));
      const glow = [paint(box(span + 3.4, 0.16, 1.25), "#ff3fb4", { at: [0, 8.9, 0] }), paint(box(span + 3.4, 0.16, 1.25), "#1fe0ff", { at: [0, 10.3, 0] })];
      for (const x of [-half - 1, half + 1]) glow.push(paint(box(0.16, 9.6, 1.15), "#1fe0ff", { at: [x, 5, 0] }));
      return { lit: merge(lit), glow: merge(glow), bannerY: 7.6 };
    }
    case "volcano": {
      const lit = [];
      for (const x of [-half - 1.2, half + 1.2]) {
        for (let i = 0; i < 5; i++) lit.push(paint(box(2 - i * 0.12, 1.9, 2 - i * 0.12, 0.15), i % 2 ? "#4a3b36" : "#3b2e2a", { at: [x, 0.95 + i * 1.9, 0], rot: [0, i * 0.3, 0] }));
        lit.push(paint(cyl(0.5, 0.3, 0.6, 10), "#2b211e", { at: [x, 10, 0] }));
      }
      lit.push(paint(box(span + 5, 1.4, 2, 0.2), "#3b2e2a", { at: [0, 9.4, 0] }));
      const glow = [-half - 1.2, half + 1.2].map((x) => paint(new THREE.ConeGeometry(0.45, 1.3, 8), "#ffb020", { at: [x, 10.9, 0] }));
      return { lit: merge(lit), glow: merge(glow), bannerY: 7.9 };
    }
  }
}

/**
 * The start and finish arch for a map, standing across the road at the
 * line: the rainbow from the cover on the beach, a portal ring in space,
 * a neon gantry in the city and a stone gate with torches on the volcano.
 */
export function buildStartArch(track: Track, theme: ThemeId): THREE.Group {
  const group = new THREE.Group();
  const span = track.edge * 2 + 1;
  const parts = archParts(theme, span);
  if (parts.lit) group.add(new THREE.Mesh(parts.lit, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
  if (parts.glow) group.add(new THREE.Mesh(parts.glow, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
  group.add(banner(span * 0.62, parts.bannerY));
  const f = track.frameAt(0);
  group.position.set(f.x, f.y, f.z);
  group.rotation.y = Math.atan2(f.tx, f.tz);
  return group;
}
