import * as THREE from "three";
import type { KartDesign } from "../kart-design";
import { emblemRegion, REGIONS } from "../kit/atlas-layout";
import { decal } from "../kit/decal";
import { loft } from "../kit/loft";
import { part } from "../kit/part";
import { bar, disc, lathe, profile, rbox, torus } from "../kit/shapes";
import { bucketSeat, mirror, numberPlate } from "../parts/fittings";
import { assemble } from "./assemble";
import { novaHead } from "./nova-driver";

const WHITE = "#f2f5fb";
const BLUE = "#1f6dff";
const NAVY = "#14204a";
const NEON = "#4ff0ff";

/**
 * Nova the robot in the Comet Glider: a wide, low pearl white wedge with
 * a fighter style windscreen, neon light lines that follow the bodywork,
 * twin fins and a jet turbine in the tail whose core burns brighter on
 * boost.
 */
export function buildNova(): KartDesign {
  const shell = part(loft([
    { z: -1.42, w: 0.5, y0: 0.34, y1: 0.66, n: 3 },
    { z: -1.18, w: 1.0, y0: 0.26, y1: 0.78, n: 4, top: 0.72 },
    { z: -0.7, w: 1.16, y0: 0.22, y1: 0.66, n: 4.2, top: 0.78 },
    { z: -0.2, w: 1.22, y0: 0.2, y1: 0.54, n: 4.4, top: 0.8 },
    { z: 0.35, w: 1.14, y0: 0.2, y1: 0.62, n: 4, top: 0.72 },
    { z: 0.85, w: 0.94, y0: 0.22, y1: 0.5, n: 3.6, top: 0.7 },
    { z: 1.3, w: 0.6, y0: 0.24, y1: 0.4, n: 3 },
    { z: 1.62, w: 0.18, y0: 0.28, y1: 0.33, n: 2.4 },
  ], { around: 44, along: 56 }), WHITE, { finish: "pearl" });
  const glass = new THREE.SphereGeometry(0.5, 32, 10, Math.PI / 2 - 1.1, 2.2, 0.08 * Math.PI, 0.42 * Math.PI);
  const centre: THREE.BufferGeometry[] = [
    shell,
    decal(shell, emblemRegion("nova"), { at: [0, 0.6, 1.05], facing: "up", size: [0.3, 0.3], depth: 0.6 }),
    decal(shell, REGIONS.white, { at: [0, 0.7, 0.2], facing: "up", size: [0.22, 3.2], color: BLUE, depth: 0.7 }),
    decal(shell, REGIONS.white, { at: [0, 0.7, 0.2], facing: "up", size: [0.03, 3.2], color: NEON, finish: "neon", depth: 0.7 }),
    // The windscreen, dark tinted glass sweeping round the front of the cockpit.
    part(glass, "#0d1a3a", { finish: "glass", at: [0, 0.52, 0.34], scale: [1.08, 0.46, 0.84] }),
    part(rbox(1.0, 0.03, 0.26, 0.012), "#ffffff", { finish: "carbon", region: REGIONS.carbon, at: [0, 0.21, 1.46] }),
    part(rbox(0.86, 0.04, 2.3, 0.02), "#ffffff", { finish: "carbon", region: REGIONS.carbon, at: [0, 0.19, -0.1] }),
    ...bucketSeat([0, 0.5, -0.3], 0.62, BLUE, NAVY),
    part(rbox(0.36, 0.08, 0.12, 0.03), NAVY, { finish: "plastic", at: [0, 0.7, 0.42], rot: [-0.6, 0, 0] }),
    part(disc(0.05, 20), NEON, { finish: "neon", at: [0, 0.736, 0.396], rot: [-Math.PI / 2 - 0.6, 0, 0] }),
    // The turbine: an intake ring, a nacelle, fan blades and a core that glows with the boost.
    part(lathe([[0.27, 0], [0.33, 0.06], [0.35, 0.2], [0.34, 0.4], [0.29, 0.5]], 40), WHITE, { finish: "pearl", at: [0, 0.62, -1.3], rot: [-Math.PI / 2, 0, 0] }),
    part(torus(0.3, 0.025, 40, 8), "#e8ecf4", { finish: "chrome", at: [0, 0.62, -1.8] }),
    part(disc(0.27, 36), NAVY, { finish: "gunmetal", at: [0, 0.62, -1.74], rot: [0, Math.PI, 0] }),
    part(disc(0.15, 28), NEON, { finish: "heat", at: [0, 0.62, -1.76], rot: [0, Math.PI, 0] }),
    part(torus(0.2, 0.012, 32, 6), NEON, { finish: "neon", at: [0, 0.62, -1.765] }),
    ...numberPlate("nova", [0, 0.32, -1.5], [0.15, Math.PI, 0], 0.3),
    part(rbox(0.7, 0.035, 0.03, 0.012), "#ffffff", { finish: "brake", region: REGIONS.tail, at: [0, 0.42, -1.43] }),
    part(bar([-0.42, 0.62, -0.8], [-0.42, 1.9, -0.8], 0.012, 8), "#e8e8ee", { finish: "chrome" }),
  ];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    centre.push(part(rbox(0.2, 0.04, 0.008, 0.004), "#b9c2d4", { finish: "brushed", at: [Math.cos(a) * 0.12, 0.62 + Math.sin(a) * 0.12, -1.72], rot: [0.5, 0, a] }));
  }
  const fin = profile([[-0.62, 0.66], [-0.98, 1.22], [-1.2, 1.26], [-1.14, 0.7]], 0.07, 0.025, true);
  const sides: THREE.BufferGeometry[] = [
    decal(shell, REGIONS.white, { at: [0.6, 0.32, 0], facing: "left", size: [3.0, 0.2], color: BLUE, depth: 0.5 }),
    decal(shell, REGIONS.white, { at: [0.6, 0.43, 0], facing: "left", size: [2.6, 0.022], color: NEON, finish: "neon", depth: 0.5 }),
    decal(shell, REGIONS.stickerNitro, { at: [0.6, 0.52, -0.55], facing: "left", size: [0.3, 0.075], depth: 0.5 }),
    part(fin, BLUE, { finish: "metallic", at: [0.36, 0, 0], rot: [0, 0, -0.16] }),
    part(bar([0.4, 0.72, -1.15], [0.52, 1.24, -1.0], 0.012, 6), NEON, { finish: "neon" }),
    // LED headlamp strips in the nose.
    part(rbox(0.26, 0.03, 0.04, 0.012), "#ffffff", { finish: "head", at: [0.28, 0.36, 1.33], rot: [0, 0.45, -0.1] }),
    part(rbox(0.06, 0.06, 0.24, 0.02), "#ffffff", { finish: "carbon", region: REGIONS.carbon, at: [0.78, 0.22, 1.5] }),
    ...mirror([0.52, 0.76, 0.3], WHITE),
  ];

  return assemble({
    centre,
    sides,
    gear: { front: [0.8, 0.3, 1.02], rear: [0.86, 0.38, -0.86], frontWidth: 0.26, rearWidth: 0.4, rail: 0.42, floor: 0.24, spring: NEON, frame: NAVY },
    front: { tyre: { radius: 0.3, width: 0.26, tread: "race", sidewall: "nova", bead: 0.68 }, rim: { kind: "turbine", color: WHITE, finish: "pearl", accent: BLUE, spokes: 10, badge: "nova" } },
    rear: { tyre: { radius: 0.38, width: 0.4, tread: "race", sidewall: "nova", bead: 0.68 }, rim: { kind: "turbine", color: WHITE, finish: "pearl", accent: BLUE, spokes: 10, badge: "nova" } },
    seat: [0, 0.5, -0.32],
    wheel: { at: [0, 0.86, 0.26], radius: 0.18, column: 0.95 },
    suit: { suit: "#8f9bb3", trim: BLUE, glove: NAVY, boot: NAVY, badge: "nova", wheelAccent: NEON, wheelRadius: 0.18 },
    head: novaHead,
    exhausts: [[0, 0.62, -1.84]],
    lamps: { head: [[0.3, 0.36, 1.4], [-0.3, 0.36, 1.4]], tail: [[0.25, 0.42, -1.47], [-0.25, 0.42, -1.47]] },
    flagAt: [-0.42, 1.9, -0.8],
    length: 3.2,
    width: 1.9,
  });
}
