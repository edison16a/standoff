import * as THREE from "three";
import type { StageDef } from "../../engine/stages";
import { box, cone, ico, paint } from "../models/geo";
import { buildDrift } from "./drift";
import { scatter, SceneryKit, type Lighting } from "./kit";
import { floatSlab, mainBlock } from "./platforms";
import type { StageBuild } from "./scenery";

const HUES = ["#22d3ee", "#e879f9", "#a78bfa", "#2dd4bf"];

/** A cluster of glowing crystals fanning out from a point, pointing along `up` (radians from straight up). */
function crystals(kit: SceneryKit, x: number, y: number, z: number, size: number, up: number, rng: () => number): void {
  const n = 3 + Math.floor(rng() * 3);
  const hue = HUES[Math.floor(rng() * HUES.length)]!;
  for (let i = 0; i < n; i++) {
    const h = size * (0.6 + rng() * 0.8);
    const tilt = up + (rng() - 0.5) * 1.1;
    const r = h * 0.2;
    kit.lit(paint(cone(r, h, 5), hue, { at: [x - Math.sin(tilt) * h * 0.4, y + Math.cos(tilt) * h * 0.4, z + (rng() - 0.5) * size * 0.6], rot: [(rng() - 0.5) * 0.4, rng() * 3, tilt] }));
  }
}

export function buildCave(stage: StageDef): StageBuild {
  const kit = new SceneryKit();
  const [main, ...floats] = stage.surfaces;
  const look = { top: "#6d28d9", lip: "#22d3ee", body: "#1e1b4b", depth: 4.6, floatDepth: 2.2 };
  mainBlock(kit, main!, look);
  const rng = scatter(5);
  const bottom = main!.bottom ?? -2;
  // The main rock tapers down under the floor, crusted with crystals.
  kit.add(paint(cone((main!.x2 - main!.x1) * 0.5, 8, 7), "#312e81", { at: [0, bottom - 4, 0], rot: [Math.PI, 0, 0], scale: [1, 1, 0.5] }));
  for (const side of [-1, 1]) {
    crystals(kit, side * (main!.x2 - 0.4), bottom + 0.4, 1.4, 1.6, side * 0.9, rng);
    crystals(kit, side * 3, bottom - 2.5, 1.8, 1.4, Math.PI + side * 0.3, rng);
  }
  // Glowing veins across the front face.
  for (let i = 0; i < 6; i++) kit.lit(paint(box(1 + rng() * 2, 0.06, 0.05), "#67e8f9", { at: [main!.x1 + 1 + i * 2.8, -0.6 - rng() * 1.1, 2.33], rot: [0, 0, (rng() - 0.5) * 0.8] }));
  for (const s of floats) {
    floatSlab(kit, s, { ...look, top: "#8b5cf6", body: "#3730a3", lip: "#e879f9" }, 0.45);
    crystals(kit, (s.x1 + s.x2) / 2, s.top - 0.5, 0, 0.9, Math.PI, rng);
  }
  // The cave: a ring of dark rock round the stage, stalactites above, stalagmites below.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 42 + rng() * 10;
    kit.add(paint(ico(12 + rng() * 8, 0), i % 2 ? "#1e1b4b" : "#272163", { at: [Math.cos(a) * r * 1.3, 4 + Math.sin(a) * r * 0.75, -46 - rng() * 12] }));
  }
  for (let i = 0; i < 22; i++) {
    const x = -60 + i * 5.6 + rng() * 3;
    const z = -12 - rng() * 30;
    kit.add(paint(cone(1 + rng() * 2.2, 6 + rng() * 10, 5), "#2e1065", { at: [x, 24 - rng() * 4, z], rot: [Math.PI, 0, 0] }));
    kit.add(paint(cone(1 + rng() * 2, 5 + rng() * 8, 5), "#1e1b4b", { at: [x + 2, -12 + rng() * 3, z] }));
    if (i % 3 === 0) crystals(kit, x, -9 + rng() * 3, z + 2, 2 + rng() * 2, 0, rng);
  }
  // Nearer rocks crusted with crystals, framing the stage on both sides.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = side * (19 + i * 6 + rng() * 2);
      const y = -7 + i * 6 + rng() * 3;
      const z = -18 - i * 5;
      kit.add(paint(ico(3 + rng() * 2, 0), "#312e81", { at: [x, y, z] }));
      crystals(kit, x - side * 1.5, y + 2.4, z + 1.5, 2.2 + rng(), -side * 0.4, rng);
    }
  }
  // The underground lake far below, lit from within.
  kit.lit(paint(box(260, 0.2, 120), "#1d4ed8", { at: [0, -16, -40] }));
  const moteMat = new THREE.MeshBasicMaterial({ color: "#a5f3fc", toneMapped: false });
  const motes = buildDrift({ count: 70, geometry: new THREE.OctahedronGeometry(0.06), material: moteMat, x: [-26, 26], y: [-8, 16], z: [-10, 4], wind: 0.2, fall: -0.35, sway: 0.8, spin: 1, size: [0.8, 1.6], seed: 17 });
  kit.mover(motes.mesh, (t) => motes.update(t));
  kit.own(moteMat);
  // Every crystal breathes light together.
  kit.mover(new THREE.Group(), (t) => kit.glowMat.color.setScalar(0.82 + Math.sin(t * 1.6) * 0.18));
  kit.finish();
  const lighting: Lighting = { sky: "#818cf8", ground: "#0f172a", hemi: 1.2, key: "#c4b5fd", keyPower: 2.2, keyFrom: [5, 12, 12], rim: "#22d3ee", rimPower: 2.4, fog: "#1e1b4b", fogNear: 45, fogFar: 150 };
  return { kit, lighting, sky: { top: "#0b0620", mid: "#2e1065", low: "#0c4a6e", sun: "#000000", sunDir: [0, 1, 0], sunSize: 0.001 } };
}
