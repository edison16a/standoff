import * as THREE from "three";
import type { StageDef, Surface } from "../../engine/stages";
import { box, cyl, ico, paint } from "../models/geo";
import { buildDrift } from "./drift";
import { scatter, SceneryKit, type Lighting } from "./kit";
import { floatSlab, mainBlock, planks, post } from "./platforms";
import type { StageBuild } from "./scenery";

const LEAVES = ["#22c55e", "#16a34a", "#4ade80", "#15803d"];
const BARK = "#6b3f1d";

/** A giant tree: a thick trunk and a crown of leafy blobs. */
function tree(kit: SceneryKit, x: number, z: number, height: number, rng: () => number): void {
  const r = height * 0.06;
  kit.add(paint(cyl(r * 0.8, r * 1.2, height, 7), BARK, { at: [x, height / 2 - 20, z] }));
  for (let i = 0; i < 6; i++) {
    const s = height * (0.14 + rng() * 0.08);
    kit.add(paint(ico(s, 0), LEAVES[i % LEAVES.length]!, { at: [x + (rng() - 0.5) * height * 0.35, height - 20 + (rng() - 0.3) * height * 0.2, z + (rng() - 0.5) * s] }));
  }
}

/** The treehouse deck on its great trunk, with leafy clumps round the back and sides. */
function treehouse(kit: SceneryKit, s: Surface, rng: () => number): void {
  const bottom = s.bottom ?? -2.8;
  kit.add(paint(cyl(2.6, 3.4, 20, 8), BARK, { at: [0, bottom - 10, -0.5] }));
  for (const side of [-1, 1]) {
    // Branches bracing the deck from below.
    kit.add(paint(cyl(0.35, 0.6, 7, 6), BARK, { at: [side * 4, bottom - 2.2, 0], rot: [0, 0, side * 1.0] }));
  }
  for (let i = 0; i < 9; i++) {
    const x = s.x1 + (i / 8) * (s.x2 - s.x1);
    kit.add(paint(ico(0.9 + rng() * 0.6, 0), LEAVES[i % LEAVES.length]!, { at: [x, 0.1 + rng() * 0.8, -3.4 - rng()] }));
  }
  // Log ends along the deck's front, and leafy clumps spilling over its corners.
  for (let x = s.x1 + 0.45; x < s.x2; x += 0.9) kit.add(paint(cyl(0.38, 0.38, 0.12, 7), x % 1.8 < 0.9 ? "#b45309" : "#a16207", { at: [x, bottom + 1.1, 2.34], rot: [Math.PI / 2, 0, 0] }));
  kit.add(paint(box(s.x2 - s.x1, 0.14, 0.1), "#65a30d", { at: [0, bottom + 0.3, 2.35] }));
  for (const x of [s.x1, s.x2, s.x1 + 3.5, s.x2 - 5]) kit.add(paint(ico(0.9 + rng() * 0.4, 0), LEAVES[Math.floor(rng() * 4)]!, { at: [x, -0.5 - rng() * 1.2, 2.1] }));
  // A rope rail along the back edge.
  for (let x = s.x1 + 0.3; x <= s.x2; x += 2.1) post(kit, x, -2.1, 0, 1.1, 0.07, "#92400e", 5);
  kit.add(paint(box(s.x2 - s.x1, 0.06, 0.06), "#fde68a", { at: [0, 1.05, -2.1] }));
}

export function buildForest(stage: StageDef): StageBuild {
  const kit = new SceneryKit();
  const [main, ...floats] = stage.surfaces;
  const look = { top: "#d97706", lip: "#65a30d", body: "#92400e", depth: 4.6, floatDepth: 2.2 };
  mainBlock(kit, main!, look);
  planks(kit, main!, 4.6, "#b45309", 0.8);
  const rng = scatter(8);
  treehouse(kit, main!, rng);
  for (const s of floats) {
    floatSlab(kit, s, { ...look, top: "#f59e0b", body: "#78350f" }, 0.34);
    // Each platform hangs from a branch on two ropes, with leaves on top of the branch.
    for (const x of [s.x1 + 0.25, s.x2 - 0.25]) post(kit, x, 0, s.top, s.top + 4.5, 0.04, "#fde68a", 4);
    kit.add(paint(cyl(0.2, 0.3, s.x2 - s.x1 + 2.5, 6), BARK, { at: [(s.x1 + s.x2) / 2, s.top + 4.6, -0.4], rot: [0, 0, Math.PI / 2 + 0.08] }));
    kit.add(paint(ico(1.3, 0), "#22c55e", { at: [s.x1 - 0.2, s.top + 5.2, -0.8] }), paint(ico(1.1, 0), "#4ade80", { at: [s.x2 + 0.4, s.top + 5, -0.6] }));
  }
  // Layers of forest, nearer trees brighter, far ones lost in the golden haze.
  for (let i = 0; i < 8; i++) tree(kit, -44 + i * 12.5 + rng() * 5, -16 - rng() * 8, 34 + rng() * 10, rng);
  for (let i = 0; i < 12; i++) tree(kit, -90 + i * 16 + rng() * 6, -50 - rng() * 20, 50 + rng() * 14, rng);
  // Hanging vines at the sides of the view.
  for (const x of [-13, -10, 11, 14.5]) kit.add(paint(cyl(0.05, 0.05, 10, 4), "#15803d", { at: [x, 10, -3 - rng() * 3] }));
  const leafMat = new THREE.MeshBasicMaterial({ color: "#86efac", side: THREE.DoubleSide });
  const leaves = buildDrift({ count: 60, geometry: new THREE.PlaneGeometry(0.2, 0.12), material: leafMat, x: [-26, 26], y: [-6, 16], z: [-6, 5], wind: -0.6, fall: 0.7, sway: 1, spin: 1.3, size: [0.8, 1.5], seed: 31 });
  kit.mover(leaves.mesh, (t) => leaves.update(t));
  const flyMat = new THREE.MeshBasicMaterial({ color: "#fef08a", toneMapped: false });
  const flies = buildDrift({ count: 40, geometry: new THREE.OctahedronGeometry(0.06), material: flyMat, x: [-22, 22], y: [-2, 12], z: [-5, 3], wind: 0.1, fall: -0.1, sway: 1.4, spin: 2, size: [0.8, 1.4], seed: 32 });
  kit.mover(flies.mesh, (t) => flies.update(t));
  kit.own(leafMat, flyMat);
  kit.finish();
  const lighting: Lighting = { sky: "#fef9c3", ground: "#14532d", hemi: 1.35, key: "#fff1c1", keyPower: 2.6, keyFrom: [-7, 12, 11], rim: "#fde047", rimPower: 1.6, fog: "#bef264", fogNear: 60, fogFar: 200 };
  return { kit, lighting, sky: { top: "#38bdf8", mid: "#d9f99d", low: "#65a30d", sun: "#fff7c2", sunDir: [-0.4, 0.5, -1], sunSize: 0.012 } };
}
