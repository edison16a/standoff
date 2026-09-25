import * as THREE from "three";
import type { StageDef, Surface } from "../../engine/stages";
import { box, cone, cyl, ico, paint } from "../models/geo";
import { buildDrift } from "./drift";
import { scatter, SceneryKit, type Lighting } from "./kit";
import { floatSlab, mainBlock, post } from "./platforms";
import type { StageBuild } from "./scenery";

const MARBLE = "#fef3c7";
const GOLD = "#fbbf24";
const TEAL = "#14b8a6";

/** A floating rock: a grassy disc on top of an upside down rocky cone. */
function island(kit: SceneryKit, x: number, y: number, z: number, r: number, rng: () => number, tree = true): void {
  kit.add(
    paint(cyl(r, r * 0.95, r * 0.25, 7), "#4ade80", { at: [x, y, z] }),
    paint(cone(r * 0.95, r * 1.8, 7), "#a16207", { at: [x, y - r * 1.02, z], rot: [Math.PI, 0, 0] }),
    paint(cone(r * 0.6, r * 1.1, 6), "#78350f", { at: [x + r * 0.2, y - r * 1.2, z + r * 0.2], rot: [Math.PI, 0.5, 0] }),
  );
  if (!tree) return;
  kit.add(paint(cyl(r * 0.06, r * 0.09, r * 0.8, 5), "#78350f", { at: [x, y + r * 0.45, z] }));
  kit.add(paint(ico(r * 0.4, 0), rng() < 0.5 ? "#22c55e" : "#16a34a", { at: [x, y + r * 0.95, z] }));
}

/** The temple floor on its island, with a pair of columns and a gold capped arch at each end. */
function temple(kit: SceneryKit, s: Surface): void {
  const w = s.x2 - s.x1;
  const bottom = s.bottom ?? -3;
  kit.add(
    paint(cone(w * 0.52, 9, 8), "#a16207", { at: [0, bottom - 4.4, 0], rot: [Math.PI, 0, 0], scale: [1, 1, 0.45] }),
    paint(cone(w * 0.3, 6, 7), "#78350f", { at: [2, bottom - 6, 0.8], rot: [Math.PI, 0.4, 0], scale: [1, 1, 0.5] }),
    paint(box(w + 0.8, 0.5, 5.6), "#4ade80", { at: [0, bottom + 0.1, 0] }),
  );
  // A gold band and a row of carved squares along the front face.
  kit.add(paint(box(w, 0.18, 0.1), GOLD, { at: [0, -0.75, 2.26] }));
  for (let x = s.x1 + 0.8; x < s.x2 - 0.4; x += 1.5) kit.add(paint(box(0.7, 0.7, 0.08), "#0f766e", { at: [x, -1.7, 2.26] }));
  for (const side of [-1, 1]) {
    const x0 = side * (w / 2 - 0.7);
    const x1 = side * (w / 2 - 2.5);
    for (const x of [x0, x1]) {
      post(kit, x, -2.2, 0, 4.4, 0.3, "#fff7ed", 8);
      kit.add(paint(box(0.85, 0.22, 0.85), GOLD, { at: [x, 4.45, -2.2] }), paint(box(0.85, 0.2, 0.85), "#fde68a", { at: [x, 0.1, -2.2] }));
    }
    const mid = (x0 + x1) / 2;
    kit.add(
      paint(box(Math.abs(x0 - x1) + 1.2, 0.45, 1.1), "#fff7ed", { at: [mid, 4.8, -2.2] }),
      paint(cyl(0.1, 1.9, 1.2, 4), TEAL, { at: [mid, 5.6, -2.2], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.3] }),
    );
    kit.lit(paint(ico(0.28, 0), "#5eead4", { at: [mid, 6.35, -2.2] }));
  }
}

export function buildTemple(stage: StageDef): StageBuild {
  const kit = new SceneryKit();
  const [main, ...floats] = stage.surfaces;
  const look = { top: MARBLE, lip: GOLD, body: TEAL, depth: 4.5, floatDepth: 2.4 };
  mainBlock(kit, main!, look);
  temple(kit, main!);
  const rng = scatter(11);
  for (const s of floats) {
    floatSlab(kit, s, { ...look, body: "#0d9488" }, 0.4);
    const cx = (s.x1 + s.x2) / 2;
    // A little crystal hangs under each slab, like the charm that keeps it up.
    kit.lit(paint(cone(0.22, 0.8, 4), "#5eead4", { at: [cx, s.top - 0.85, 0], rot: [Math.PI, 0, 0] }));
    kit.add(paint(cone(0.6, 1.1, 5), "#a16207", { at: [cx, s.top - 0.95, -0.2], rot: [Math.PI, 0, 0] }));
  }
  // The waterfall pouring off the island's edge and away into the sky.
  const waterMat = new THREE.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.75 });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 16, 1, 8), waterMat);
  fall.position.set(-5.5, -10.8, 1.6);
  kit.mover(fall, (t) => (waterMat.opacity = 0.65 + Math.sin(t * 6) * 0.08));
  kit.own(waterMat);
  for (let i = 0; i < 10; i++) island(kit, -80 + i * 17 + rng() * 8, -6 + rng() * 22, -40 - rng() * 50, 2.5 + rng() * 4, rng);
  for (const [x, y, z] of [[-14, -4, -8], [15, 7, -12], [-17, 9, -14]] as const) island(kit, x, y, z, 1.4, rng, true);
  // Puffy clouds drifting slowly past, in front and behind.
  const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", flatShading: true, roughness: 1, emissive: "#dbeafe", emissiveIntensity: 0.35 });
  const cloudGeo = new THREE.IcosahedronGeometry(1, 0);
  const clouds = buildDrift({ count: 26, geometry: cloudGeo, material: cloudMat, x: [-120, 120], y: [-18, 26], z: [-70, -14], wind: 1.2, fall: 0, sway: 0, spin: 0.02, size: [3, 7], seed: 21 });
  kit.mover(clouds.mesh, (t) => clouds.update(t));
  const low = buildDrift({ count: 8, geometry: cloudGeo, material: cloudMat, x: [-60, 60], y: [-14, -9], z: [2, 10], wind: 1.8, fall: 0, sway: 0, spin: 0.02, size: [2.5, 4], seed: 22 });
  kit.mover(low.mesh, (t) => low.update(t));
  kit.own(cloudMat);
  kit.finish();
  const lighting: Lighting = { sky: "#e0f2fe", ground: "#86efac", hemi: 1.5, key: "#fff7e0", keyPower: 2.4, keyFrom: [8, 14, 10], rim: "#a5f3fc", rimPower: 1.2, fog: "#bae6fd", fogNear: 70, fogFar: 240 };
  return { kit, lighting, sky: { top: "#0284c7", mid: "#7dd3fc", low: "#e0f2fe", sun: "#fff7d6", sunDir: [0.5, 0.45, -1], sunSize: 0.01 } };
}
