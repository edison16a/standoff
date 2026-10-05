import type * as THREE from "three";
import type { V3 } from "../geo";
import type { KartDesign } from "../kart-design";
import { emblemRegion, REGIONS } from "../kit/atlas-layout";
import { decal } from "../kit/decal";
import { loft } from "../kit/loft";
import { part } from "../kit/part";
import { bar, lathe, plate, profile, rbox, tube } from "../kit/shapes";
import { bucketSeat, exhaust, headlamp, mirror, numberPlate, tailLamp } from "../parts/fittings";
import { assemble } from "./assemble";
import { blazeHead } from "./blaze-driver";

const RED = "#e8321a";
const DEEP = "#8f1608";
const GOLD = "#ffc21a";
const DARK = "#1e1e24";

/** A thin wing section, nose at +z, for the front and rear wings. */
const AIRFOIL: [number, number][] = [[0.22, 0.01], [0.12, 0.05], [-0.06, 0.05], [-0.22, 0.012], [-0.1, -0.012], [0.12, -0.016]];

/**
 * Blaze the fox in the Flame Rod: a long, low candy red hot rod with an
 * open supercharged engine, titanium side pipes, a front wing and a big
 * rear wing, flames licking back along the side pods.
 */
export function buildBlaze(): KartDesign {
  const tub = part(loft([
    { z: -1.5, w: 0.36, y0: 0.3, y1: 0.5, n: 3 },
    { z: -1.36, w: 0.74, y0: 0.24, y1: 0.62, n: 3.4 },
    { z: -0.95, w: 0.86, y0: 0.2, y1: 0.68, n: 3.6, top: 0.82 },
    { z: -0.45, w: 0.92, y0: 0.18, y1: 0.56, n: 3.8, top: 0.86 },
    { z: 0.05, w: 0.94, y0: 0.18, y1: 0.52, n: 3.8, top: 0.86 },
    { z: 0.5, w: 0.86, y0: 0.18, y1: 0.68, n: 3.4, top: 0.72 },
    { z: 0.95, w: 0.64, y0: 0.2, y1: 0.56, n: 3, top: 0.7 },
    { z: 1.38, w: 0.42, y0: 0.24, y1: 0.42, n: 2.6 },
    { z: 1.64, w: 0.12, y0: 0.29, y1: 0.34, n: 2.2 },
  ], { around: 40, along: 64 }), RED, { finish: "metallic" });
  const pod = part(loft([
    { z: -0.4, w: 0.18, y0: 0.26, y1: 0.42, x: 0.6, n: 3 },
    { z: -0.22, w: 0.3, y0: 0.2, y1: 0.5, x: 0.61, n: 3.6, top: 0.8 },
    { z: 0.25, w: 0.32, y0: 0.2, y1: 0.52, x: 0.6, n: 3.6, top: 0.8 },
    { z: 0.5, w: 0.3, y0: 0.22, y1: 0.48, x: 0.6, n: 3.2 },
    { z: 0.57, w: 0.26, y0: 0.24, y1: 0.44, x: 0.6, n: 3 },
  ], { around: 28, along: 24 }), RED, { finish: "metallic" });
  const wing = (span: number, chord: number, at: V3, color: string, finish: "metallic" | "carbon") =>
    part(profile(AIRFOIL.map(([z, y]) => [z * chord, y * chord] as [number, number]), span, 0.01, true), color, { finish, at, region: finish === "carbon" ? REGIONS.carbon : undefined });

  const centre: THREE.BufferGeometry[] = [
    tub,
    part(rbox(1.15, 0.04, 2.7, 0.02), "#ffffff", { finish: "carbon", region: REGIONS.carbon, at: [0, 0.16, 0] }),
    // Gold racing stripes over the nose and the badge in front of the cockpit.
    decal(tub, REGIONS.white, { at: [0.09, 0.6, 1.0], facing: "up", size: [0.06, 1.3], color: GOLD, depth: 0.6 }),
    decal(tub, REGIONS.white, { at: [-0.09, 0.6, 1.0], facing: "up", size: [0.06, 1.3], color: GOLD, depth: 0.6 }),
    decal(tub, emblemRegion("blaze"), { at: [0, 0.6, 1.12], facing: "up", size: [0.26, 0.26], depth: 0.6 }),
    // Front wing with end plates.
    wing(1.62, 1, [0, 0.21, 1.56], "#ffffff", "carbon"),
    part(rbox(0.03, 0.2, 0.42, 0.012), DEEP, { finish: "metallic", at: [0.82, 0.26, 1.54] }),
    part(rbox(0.03, 0.2, 0.42, 0.012), DEEP, { finish: "metallic", at: [-0.82, 0.26, 1.54] }),
    // Engine: block, cooling fins, the supercharger and its intake trumpets.
    part(rbox(0.5, 0.22, 0.52, 0.05), "#3a3a42", { finish: "gunmetal", at: [0, 0.76, -0.95] }),
    part(rbox(0.36, 0.14, 0.44, 0.04), "#d0d4dc", { finish: "brushed", at: [0, 0.93, -0.95] }),
    part(rbox(0.38, 0.02, 0.46, 0.01), GOLD, { finish: "metallic", at: [0, 1.0, -0.95] }),
    ...bucketSeat([0, 0.5, -0.3], 0.62, RED, DARK),
    // Dash with a lit gauge, and the antenna for the flag.
    part(rbox(0.36, 0.1, 0.12, 0.04), DARK, { finish: "plastic", at: [0, 0.74, 0.5], rot: [-0.5, 0, 0] }),
    part(tube(0.035, 0.035, 0.01, 20), "#9ff3ff", { finish: "neon", at: [0.08, 0.77, 0.47], rot: [Math.PI / 2 - 0.5, 0, 0] }),
    part(tube(0.035, 0.035, 0.01, 20), "#ffd27a", { finish: "neon", at: [-0.08, 0.77, 0.47], rot: [Math.PI / 2 - 0.5, 0, 0] }),
    part(bar([-0.42, 0.66, -0.75], [-0.42, 1.78, -0.75], 0.012, 8), "#e8e8ee", { finish: "chrome" }),
    // Rear wing on two struts, a gold gurney strip along its trailing edge.
    wing(1.5, 1.6, [0, 1.16, -1.32], RED, "metallic"),
    part(rbox(1.5, 0.05, 0.02, 0.008), GOLD, { finish: "metallic", at: [0, 1.2, -1.66] }),
    part(bar([0.22, 0.62, -1.24], [0.26, 1.12, -1.3], 0.022), "#c4c8d0", { finish: "brushed" }),
    part(bar([-0.22, 0.62, -1.24], [-0.26, 1.12, -1.3], 0.022), "#c4c8d0", { finish: "brushed" }),
    // Tail: diffuser, lamps and the number plate the chase camera sees all race.
    part(rbox(0.96, 0.08, 0.3, 0.02), "#ffffff", { finish: "carbon", region: REGIONS.carbon, at: [0, 0.22, -1.44], rot: [0.25, 0, 0] }),
    ...numberPlate("blaze", [0, 0.44, -1.56], [0.1, Math.PI, 0], 0.3),
    ...tailLamp([0.24, 0.5, -1.47], 0.13, 0.05),
    ...tailLamp([-0.24, 0.5, -1.47], 0.13, 0.05),
  ];
  for (const [x, z] of [[-0.09, -1.05], [0.09, -1.05], [-0.09, -0.85], [0.09, -0.85]] as const) {
    centre.push(part(lathe([[0.035, 0], [0.036, 0.08], [0.05, 0.13], [0.062, 0.15], [0.055, 0.152]], 20), "#f2f2f6", { finish: "chrome", at: [x, 1.0, z] }));
  }
  for (let i = 0; i < 4; i++) centre.push(part(rbox(0.56, 0.015, 0.5, 0.006), "#8a8e98", { finish: "brushed", at: [0, 0.69 + i * 0.04, -0.95] }));

  const sides: THREE.BufferGeometry[] = [
    pod,
    decal(pod, REGIONS.flame, { at: [0.76, 0.36, 0.12], facing: "left", size: [0.78, 0.32], depth: 0.3 }),
    decal(pod, REGIONS.stickerGrip, { at: [0.76, 0.42, -0.26], facing: "left", size: [0.18, 0.045], depth: 0.3 }),
    part(plate(0.2, 0.16, 0.05, 0.01, 0.004), "#ffffff", { finish: "gunmetal", region: REGIONS.grille, at: [0.6, 0.36, 0.575] }),
    part(rbox(0.03, 0.2, 0.52, 0.012), "#ffffff", { finish: "carbon", region: REGIONS.carbon, at: [0.76, 1.15, -1.3] }),
    ...headlamp([0.2, 0.38, 1.33], 0.065, [0, 0.3, 0]),
    ...mirror([0.48, 0.82, 0.42], RED),
    ...exhaust([[0.24, 0.78, -0.78], [0.42, 0.68, -0.82], [0.5, 0.52, -1.02], [0.42, 0.44, -1.42], [0.36, 0.43, -1.62]], 0.045),
  ];

  return assemble({
    centre,
    sides,
    gear: { front: [0.8, 0.3, 1.0], rear: [0.86, 0.42, -0.85], frontWidth: 0.26, rearWidth: 0.44, rail: 0.36, floor: 0.24, spring: GOLD, frame: DARK },
    front: { tyre: { radius: 0.3, width: 0.26, tread: "race", sidewall: "blaze", bead: 0.66 }, rim: { kind: "star", color: "#eceef4", finish: "chrome", accent: RED, spokes: 5, badge: "blaze" } },
    rear: { tyre: { radius: 0.42, width: 0.44, tread: "race", sidewall: "blaze", bead: 0.64 }, rim: { kind: "star", color: "#eceef4", finish: "chrome", accent: RED, spokes: 5, badge: "blaze" } },
    seat: [0, 0.5, -0.32],
    wheel: { at: [0, 0.88, 0.3], radius: 0.19, column: 0.95 },
    suit: { suit: "#2b3150", trim: GOLD, glove: "#f4f4f4", boot: DARK, badge: "blaze", wheelAccent: GOLD, wheelRadius: 0.19 },
    head: blazeHead,
    exhausts: [[0.36, 0.43, -1.72], [-0.36, 0.43, -1.72]],
    lamps: { head: [[0.2, 0.38, 1.4], [-0.2, 0.38, 1.4]], tail: [[0.24, 0.5, -1.5], [-0.24, 0.5, -1.5]] },
    flagAt: [-0.42, 1.78, -0.75],
    length: 3.1,
    width: 1.9,
  });
}
