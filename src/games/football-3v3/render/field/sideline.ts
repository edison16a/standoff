import * as THREE from "three";
import { FIELD, YARD } from "../../engine/field";
import { TEAMS, type TeamId } from "../../teams";
import { box, cyl, merge, paint, shade } from "../models/geo";

/** Each team's area starts this far behind its sideline. */
const BENCH_Z = FIELD.halfWidth + 1.83 + 6.5;

/**
 * One team's bench area: a long rubber mat, two rows of benches with
 * team coloured backs, a branded backdrop behind them, drink coolers on
 * a table at each end and a heater. Built round z = 0 facing +z (the
 * field); the caller turns it to its sideline.
 */
function teamArea(team: TeamId): THREE.BufferGeometry {
  const t = TEAMS[team];
  const parts: THREE.BufferGeometry[] = [
    paint(box(36, 0.04, 6), "#2a2d33", { at: [0, 0.02, 0] }),
    // A row of team colour carpet along the front of the mat.
    paint(box(36, 0.045, 0.8), shade(t.dark, -0.1), { at: [0, 0.025, 2.6] }),
  ];
  for (const row of [0, 1]) {
    const z = -0.6 - row * 1.4;
    const lift = row * 0.35;
    for (const x of [-11, 0, 11]) {
      parts.push(paint(box(9.4, 0.08, 0.5), "#3b3f48", { at: [x, 0.48 + lift, z] }));
      parts.push(paint(box(9.4, 0.5, 0.07), t.color, { at: [x, 0.8 + lift, z - 0.26] }));
      parts.push(paint(box(0.08, 0.48 + lift, 0.4), "#1a1d22", { at: [x - 4.5, (0.48 + lift) / 2, z] }));
      parts.push(paint(box(0.08, 0.48 + lift, 0.4), "#1a1d22", { at: [x + 4.5, (0.48 + lift) / 2, z] }));
    }
    if (row === 1) parts.push(paint(box(36, 0.35, 1.2), "#24272e", { at: [0, 0.175, z] }));
  }
  // The backdrop: dark panel, team colour band and a trim line.
  parts.push(paint(box(38, 1.5, 0.12), shade(t.dark, -0.25), { at: [0, 0.75, -3.4] }));
  parts.push(paint(box(38, 0.42, 0.13), t.color, { at: [0, 1.15, -3.39] }));
  parts.push(paint(box(38, 0.06, 0.14), t.trim, { at: [0, 0.92, -3.38] }));
  for (const x of [-17.5, 17.5]) {
    parts.push(paint(box(2.2, 0.85, 0.8), "#c9ccd2", { at: [x, 0.425, 0.6] }));
    for (const dx of [-0.55, 0.55]) parts.push(paint(cyl(0.26, 0.24, 0.62, 14), t.color, { at: [x + dx, 1.16, 0.6] }));
    parts.push(paint(cyl(0.26, 0.26, 0.05, 14), "#f2f2f2", { at: [x - 0.55, 1.5, 0.6] }));
    parts.push(paint(cyl(0.26, 0.26, 0.05, 14), "#f2f2f2", { at: [x + 0.55, 1.5, 0.6] }));
  }
  parts.push(paint(box(0.9, 1.6, 0.5), "#3a3d44", { at: [6, 0.8, -2.9] }));
  parts.push(paint(box(0.7, 0.5, 0.06), "#d8541e", { at: [6, 1.2, -2.63] }));
  return merge(parts);
}

/** An orange pylon at each corner of both end zones, on the sideline: four inches square, eighteen tall. */
function pylons(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const s = 4 * 0.0254;
  const h = 18 * 0.0254;
  for (const x of [FIELD.goalX, FIELD.endX, -FIELD.goalX, -FIELD.endX]) {
    for (const z of [FIELD.halfWidth, -FIELD.halfWidth]) {
      // Pylons stand just outside the field so the line runs into them, with a white league band.
      const px = x + Math.sign(x) * s * 0.5;
      const pz = z + Math.sign(z) * s * 0.5;
      parts.push(paint(box(s, h, s), "#ff6a13", { at: [px, h / 2, pz] }));
      parts.push(paint(box(s * 1.02, 0.03, s * 1.02), "#ffffff", { at: [px, h * 0.72, pz] }));
    }
  }
  return merge(parts);
}

/** The chain crew's sideline markers at both 50s, and the yard markers on the far side every ten yards. */
function markers(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const z = -(FIELD.halfWidth + 1.83 + 1.2);
  for (let k = -4; k <= 4; k++) {
    const x = k * 10 * YARD;
    parts.push(paint(box(0.5, 0.42, 0.18), "#f0f0f0", { at: [x, 0.21, z] }));
    parts.push(paint(box(0.42, 0.3, 0.19), k === 0 ? "#f2a900" : "#e8541f", { at: [x, 0.22, z] }));
  }
  return merge(parts);
}

/**
 * Everything at field level outside the lines: both team areas, the
 * pylons and the yard markers, all in one mesh with the venue's shared
 * vertex colour material. Storm's bench is on the +z side, Blaze's on
 * the far one, matching the crowd behind them.
 */
export function sidelineGeometry(): THREE.BufferGeometry {
  const home = teamArea(0);
  home.rotateY(Math.PI);
  home.translate(0, 0, BENCH_Z);
  const away = teamArea(1);
  away.translate(0, 0, -BENCH_Z);
  return merge([home, away, pylons(), markers()]);
}
