import * as THREE from "three";
import type { StageDef } from "../../engine/stages";
import { ball, box, cone, cyl, ico, paint } from "../models/geo";
import { buildDrift } from "./drift";
import { scatter, SceneryKit, type Lighting } from "./kit";
import { floatSlab, mainBlock, planks, post } from "./platforms";
import type { StageBuild } from "./scenery";

const RED = "#dc2626";
const INK = "#1c1917";
const WOOD = "#c2783c";
const TILE = "#b91c1c";

/** A tiered pagoda: a wall and a wide sloping roof for each storey, with warm lit windows. */
function pagoda(kit: SceneryKit, x: number, z: number, tiers: number, scale: number, wall: string, roof: string): void {
  let y = -12;
  for (let i = 0; i < tiers; i++) {
    const w = (5 - i * 0.7) * scale;
    kit.add(paint(box(w * 0.7, 2.2 * scale, w * 0.7), wall, { at: [x, y + 1.1 * scale, z] }));
    kit.lit(paint(box(w * 0.5, 0.5 * scale, 0.05), "#fcd34d", { at: [x, y + 1.2 * scale, z + w * 0.35 + 0.03] }));
    kit.add(paint(cyl(w * 0.35, w * 0.85, 1 * scale, 4), roof, { at: [x, y + 2.7 * scale, z], rot: [0, Math.PI / 4, 0] }));
    y += 3.2 * scale;
  }
  kit.add(paint(cone(0.3 * scale, 2 * scale, 5), "#fbbf24", { at: [x, y + 0.6 * scale, z] }));
}

/** Low roof tiers under the main floor: the dojo the fighters stand on top of. */
function dojoBody(kit: SceneryKit, s: StageDef["surfaces"][number]): void {
  const w = s.x2 - s.x1;
  const bottom = s.bottom ?? -2.4;
  // Dark posts and glowing paper panels along the top storey's front.
  for (let x = s.x1 + 0.2; x <= s.x2 - 0.1; x += 1.7) kit.add(paint(box(0.22, -bottom - 0.3, 0.2), "#451a03", { at: [x, bottom / 2 - 0.15, 2.52] }));
  for (let x = s.x1 + 1.05; x < s.x2 - 0.5; x += 1.7) kit.lit(paint(box(1.2, 1.2, 0.05), "#fde68a", { at: [x, bottom / 2 - 0.2, 2.52] }));
  // The sweeping roof below, with gold tips turned up at the corners.
  kit.add(paint(cyl(w * 0.62, w * 0.9, 1.4, 4), TILE, { at: [0, bottom - 0.7, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.45] }));
  for (const side of [-1, 1]) kit.add(paint(cone(0.25, 1, 4), "#fbbf24", { at: [side * w * 0.64, bottom - 0.9, 3.4], rot: [0, 0, -side * 1.1] }));
  kit.add(paint(box(w + 2, 4.5, 5.5), "#fef3c7", { at: [0, bottom - 3.6, 0] }));
  for (let x = -w / 2; x <= w / 2 + 1; x += 2.1) kit.add(paint(box(0.3, 4.5, 0.2), "#451a03", { at: [x, bottom - 3.6, 2.8] }));
  kit.add(paint(cyl(w * 0.75, w * 1.1, 1.6, 4), TILE, { at: [0, bottom - 6.4, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.45] }));
}

/** The torii gate whose top beam is the high platform. */
function torii(kit: SceneryKit, s: StageDef["surfaces"][number]): void {
  const w = s.x2 - s.x1;
  for (const x of [s.x1 + 0.4, s.x2 - 0.4]) post(kit, x, -1.2, 0, s.top - 0.3, 0.16, RED);
  kit.add(
    paint(box(w, 0.32, 0.6), INK, { at: [0, s.top - 0.16, -0.6] }),
    paint(box(w + 0.3, 0.12, 2.2), INK, { at: [0, s.top - 0.06, 0] }),
    paint(box(w - 0.3, 0.2, 0.3), RED, { at: [0, s.top - 0.85, -1.2] }),
  );
  for (const side of [-1, 1]) kit.add(paint(cone(0.12, 0.6, 4), INK, { at: [side * (w / 2 + 0.2), s.top + 0.05, 0], rot: [0, 0, -side * 1.2] }));
}

export function buildDojo(stage: StageDef): StageBuild {
  const kit = new SceneryKit();
  const [main, ...floats] = stage.surfaces;
  const look = { top: WOOD, lip: RED, body: "#fef3c7", depth: 5, floatDepth: 2.2 };
  mainBlock(kit, main!, look);
  planks(kit, main!, 5, "#9a5b2a");
  dojoBody(kit, main!);
  for (const s of floats) {
    if (s.top > 3) {
      torii(kit, s);
      continue;
    }
    floatSlab(kit, s, { ...look, top: WOOD, body: "#7c2d12", lip: RED });
    // Paper lanterns under each hanging walkway, on ropes up out of the shot.
    for (const x of [s.x1 + 0.5, s.x2 - 0.5]) {
      post(kit, x, 0, s.top, s.top + 14, 0.03, "#44403c", 4);
      kit.lit(paint(ball(0.28, 8, 6), "#fb923c", { at: [x, s.top - 0.75, 0], scale: [1, 1.25, 1] }));
      kit.add(paint(cyl(0.12, 0.12, 0.1, 6), INK, { at: [x, s.top - 0.4, 0] }), paint(cyl(0.12, 0.12, 0.1, 6), INK, { at: [x, s.top - 1.1, 0] }));
    }
  }
  const rng = scatter(3);
  // The city at dusk, then a ridge of purple mountains under the setting sun.
  for (let i = 0; i < 9; i++) pagoda(kit, -70 + i * 17 + rng() * 6, -45 - rng() * 30, 3 + Math.floor(rng() * 3), 1 + rng() * 0.6, "#6b21a8", "#3b0764");
  for (let i = 0; i < 14; i++) kit.add(paint(cone(18 + rng() * 14, 26 + rng() * 22, 5), i % 2 ? "#7e22ce" : "#9333ea", { at: [-160 + i * 25, -8, -130 - rng() * 30] }));
  // Cherry trees either side of the stage.
  for (const x of [-17, -12.5, 13, 18]) {
    const z = -12 - rng() * 6;
    kit.add(paint(cyl(0.35, 0.5, 9, 6), "#57301a", { at: [x, -6.5, z] }));
    for (let k = 0; k < 5; k++) kit.add(paint(ico(1.1 + rng() * 0.7, 0), k % 2 ? "#f9a8d4" : "#f472b6", { at: [x + (rng() - 0.5) * 3.5, -1.5 + rng() * 2.5, z + (rng() - 0.5) * 2] }));
  }
  const petalMat = new THREE.MeshBasicMaterial({ color: "#fbcfe8", side: THREE.DoubleSide });
  const petals = buildDrift({ count: 90, geometry: new THREE.PlaneGeometry(0.16, 0.1), material: petalMat, x: [-26, 26], y: [-6, 16], z: [-6, 5], wind: 0.9, fall: 0.8, sway: 0.6, spin: 1.6, size: [0.8, 1.4], seed: 9 });
  kit.mover(petals.mesh, (t) => petals.update(t));
  kit.own(petalMat);
  kit.finish();
  const lighting: Lighting = { sky: "#fbcfe8", ground: "#4c1d95", hemi: 1.3, key: "#ffd6a5", keyPower: 2.6, keyFrom: [6, 10, 12], rim: "#f472b6", rimPower: 1.8, fog: "#f58aa0", fogNear: 70, fogFar: 230 };
  return { kit, lighting, sky: { top: "#3b0764", mid: "#fb7185", low: "#f97316", sun: "#fde68a", sunDir: [0.15, 0.06, -1], sunSize: 0.012 } };
}
