import * as THREE from "three";
import type { CharacterId } from "../../../characters";
import { emblemRegion, WHITE_UV } from "../kit/atlas-layout";
import type { Finish } from "../kit/finish";
import { seg } from "../kit/detail";
import { part } from "../kit/part";
import { revolve } from "../kit/revolve";
import { disc, lathe, torus, tube } from "../kit/shapes";

export type RimKind = "star" | "beadlock" | "turbine" | "dish";

export interface RimStyle {
  kind: RimKind;
  color: string;
  finish: Finish;
  /** Centre cap and bolt colour. */
  accent: string;
  spokes: number;
  /** Whose badge sits on the centre cap. */
  badge: CharacterId;
}

/** Rounds the corners of an outline by cutting them, twice over. */
function chaikin(points: THREE.Vector2[], passes = 2): THREE.Vector2[] {
  let out = points;
  for (let p = 0; p < passes; p++) {
    const next: THREE.Vector2[] = [];
    out.forEach((a, i) => {
      const b = out[(i + 1) % out.length]!;
      next.push(a.clone().lerp(b, 0.25), a.clone().lerp(b, 0.75));
    });
    out = next;
  }
  return out;
}

/** A window between two spokes: the ring sector between hub and lip, minus the spokes' width. */
function window(a0: number, a1: number, rIn: number, rOut: number, spoke: number, sweep = 0): THREE.Path {
  const pts: THREE.Vector2[] = [];
  const di = Math.asin(Math.min(0.9, spoke / 2 / rIn));
  const dout = Math.asin(Math.min(0.9, spoke / 2 / rOut));
  const steps = seg(6, 3);
  for (let i = 0; i <= steps; i++) {
    const a = a0 + dout + sweep + ((a1 - a0 - 2 * dout) * i) / steps;
    pts.push(new THREE.Vector2(Math.cos(a) * rOut, Math.sin(a) * rOut));
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + di + ((a1 - a0 - 2 * di) * i) / steps;
    pts.push(new THREE.Vector2(Math.cos(a) * rIn, Math.sin(a) * rIn));
  }
  return new THREE.Path(chaikin(pts, 1).reverse());
}

/** The spoked face of the rim, extruded with soft edges, facing +x. */
function face(style: RimStyle, r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape().absarc(0, 0, r, 0, Math.PI * 2, false);
  const n = style.spokes;
  if (style.kind === "beadlock") {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      shape.holes.push(new THREE.Path().absarc(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, r * 0.2, 0, Math.PI * 2, true));
    }
  } else if (style.kind !== "dish") {
    const turbine = style.kind === "turbine";
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      shape.holes.push(window(a0, a1, r * 0.34, r * 0.86, turbine ? r * 0.12 : r * 0.2, turbine ? 0.35 : 0));
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: seg(16, 6) });
  g.rotateY(Math.PI / 2);
  return g;
}

/**
 * A rim seen from outside: a polished lip, a dark barrel behind the
 * spokes, a brake disc, the spoked face, lug nuts and a centre cap with
 * the kart's badge. Axle along x, face toward +x, `at` the face's depth.
 */
export function buildRim(style: RimStyle, r: number, width: number, at: number): THREE.BufferGeometry[] {
  const hw = width / 2;
  const parts = [
    // The barrel, seen from inside through the spokes, closed off behind.
    part(revolve([{ r: r * 1.02, x: -hw * 0.8 }, { r: r * 1.02, x: hw * 0.8 }], seg(36, 10), () => WHITE_UV), "#2c2c32", { finish: "gunmetal" }),
    part(disc(r * 1.02, 36), "#1e1e24", { finish: "gunmetal", at: [-hw * 0.5, 0, 0], rot: [0, Math.PI / 2, 0] }),
    part(torus(r * 1.0, r * 0.05, 32, 6), style.color, { finish: style.finish === "chrome" ? "chrome" : style.finish, at: [at + 0.012, 0, 0], rot: [0, Math.PI / 2, 0] }),
    // Brake disc behind the spokes.
    part(tube(r * 0.7, r * 0.7, 0.025, 28), "#9a9aa2", { finish: "brushed", at: [-hw * 0.2, 0, 0], rot: [0, 0, Math.PI / 2] }),
  ];
  if (style.kind === "dish") {
    // A domed hub cap, like a classic car's.
    parts.push(part(lathe([[r * 0.98, 0], [r * 0.9, 0.02], [r * 0.62, 0.05], [r * 0.4, 0.075], [0.001, 0.085]], 36), style.color, { finish: "chrome", at: [at - 0.01, 0, 0], rot: [0, 0, -Math.PI / 2] }));
    parts.push(part(torus(r * 0.52, 0.012, 32, 6), style.accent, { finish: "paint", at: [at + 0.05, 0, 0], rot: [0, Math.PI / 2, 0] }));
  } else {
    parts.push(part(face(style, r * 0.98), style.color, { finish: style.finish, at: [at - 0.03, 0, 0] }));
  }
  const capR = r * (style.kind === "dish" ? 0.24 : 0.3);
  const capAt = at + (style.kind === "dish" ? 0.07 : 0.012);
  parts.push(part(tube(capR, capR * 1.08, 0.04, 28), style.accent, { finish: "paint", at: [capAt, 0, 0], rot: [0, 0, -Math.PI / 2] }));
  parts.push(part(disc(capR * 0.82, 28), "#ffffff", { finish: "paint", region: emblemRegion(style.badge), at: [capAt + 0.0205, 0, 0], rot: [0, Math.PI / 2, 0] }));
  if (style.kind !== "dish") {
    const nuts = style.kind === "beadlock" ? 12 : 5;
    const ring = style.kind === "beadlock" ? r * 0.88 : capR * 1.35;
    for (let i = 0; i < nuts; i++) {
      const a = (i / nuts) * Math.PI * 2;
      parts.push(part(tube(0.016, 0.016, 0.03, 6), "#e6e6ee", { finish: "chrome", at: [at + 0.015, Math.cos(a) * ring, Math.sin(a) * ring], rot: [0, 0, Math.PI / 2] }));
    }
  }
  return parts;
}
