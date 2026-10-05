import type * as THREE from "three";
import type { KartDesign } from "../kart-design";
import { emblemRegion, REGIONS } from "../kit/atlas-layout";
import { decal } from "../kit/decal";
import { loft } from "../kit/loft";
import { part } from "../kit/part";
import { bar, rbox, sphere } from "../kit/shapes";
import { fender, tubing } from "../parts/bodywork";
import { bucketSeat, exhaust, headlamp, mirror, numberPlate, tailLamp } from "../parts/fittings";
import { buildTyre } from "../parts/tyre";
import { assemble } from "./assemble";
import { pipHead } from "./pip-driver";

const LEAF = "#2fbf4a";
const DEEP = "#17742c";
const CAGE = "#ffd23f";
const DARK = "#22262a";

/**
 * Pip the frog in the Lily Buggy: a bouncy dune buggy on long travel
 * coilovers and knobbly balloon tyres, with a yellow roll cage, a light
 * bar on the roof, a bull bar, a skid plate and a spare wheel on the back.
 */
export function buildPip(): KartDesign {
  const tub = part(loft([
    { z: -1.22, w: 0.7, y0: 0.42, y1: 0.64, n: 3 },
    { z: -1.06, w: 1.0, y0: 0.37, y1: 0.8, n: 3.6, top: 0.84 },
    { z: -0.5, w: 1.08, y0: 0.35, y1: 0.78, n: 3.8, top: 0.86 },
    { z: 0.1, w: 1.08, y0: 0.35, y1: 0.74, n: 3.8, top: 0.86 },
    { z: 0.6, w: 1.02, y0: 0.37, y1: 0.86, n: 3.4, top: 0.8 },
    { z: 1.05, w: 0.92, y0: 0.39, y1: 0.78, n: 3.2, top: 0.78 },
    { z: 1.3, w: 0.66, y0: 0.44, y1: 0.62, n: 2.8 },
  ], { around: 36, along: 44 }), LEAF, { finish: "metallic" });
  const centre: THREE.BufferGeometry[] = [
    tub,
    decal(tub, emblemRegion("pip"), { at: [0, 0.9, 0.72], facing: "up", size: [0.42, 0.42], depth: 0.5 }),
    decal(tub, REGIONS.white, { at: [0, 0.9, 0.1], facing: "up", size: [0.14, 2.6], color: CAGE, depth: 0.5 }),
    // Skid plate under the nose and a bull bar in front of it.
    part(rbox(0.9, 0.04, 0.5, 0.02), "#c8ccd4", { finish: "brushed", at: [0, 0.36, 1.2], rot: [-0.45, 0, 0] }),
    ...tubing([[0.5, 0.48, 1.32], [0.48, 0.7, 1.42], [0.2, 0.74, 1.47], [-0.2, 0.74, 1.47], [-0.48, 0.7, 1.42], [-0.5, 0.48, 1.32]], 0.032, "#eef0f5", "chrome", true),
    ...bucketSeat([0, 0.8, -0.32], 0.64, CAGE, DARK),
    // The roll cage: a main hoop, a roof halo and braces back to the tail.
    ...tubing([[0.54, 0.8, -0.74], [0.52, 1.55, -0.78], [0.36, 1.84, -0.76], [-0.36, 1.84, -0.76], [-0.52, 1.55, -0.78], [-0.54, 0.8, -0.74]], 0.04, CAGE, "paint", true),
    ...tubing([[0.36, 1.84, -0.76], [0.4, 1.8, -0.3], [0.34, 1.78, 0.02], [-0.34, 1.78, 0.02], [-0.4, 1.8, -0.3], [-0.36, 1.84, -0.76]], 0.034, CAGE, "paint"),
    // A light bar across the front of the roof.
    part(rbox(0.86, 0.1, 0.1, 0.03), DARK, { finish: "gunmetal", at: [0, 1.86, 0.02] }),
    ...[-0.3, -0.1, 0.1, 0.3].flatMap((x) => headlamp([x, 1.86, 0.08], 0.042)),
    // Spare wheel on the back, strapped to a carrier.
    ...buildTyre({ radius: 0.3, width: 0.2, tread: "knobby", sidewall: "pip", bead: 0.6, balloon: true }).map((g) => g.rotateY(Math.PI / 2).translate(0, 0.86, -1.36)),
    part(sphere(0.18, 20, 14), CAGE, { finish: "paint", at: [0, 0.86, -1.33], scale: [1, 1, 0.3] }),
    ...numberPlate("pip", [0, 0.52, -1.24], [0.2, Math.PI, 0], 0.3),
    ...tailLamp([0.3, 0.6, -1.2], 0.12, 0.06),
    ...tailLamp([-0.3, 0.6, -1.2], 0.12, 0.06),
    part(rbox(0.36, 0.1, 0.1, 0.03), DARK, { finish: "plastic", at: [0, 1.06, 0.52], rot: [-0.5, 0, 0] }),
    part(bar([-0.36, 1.84, -0.76], [-0.36, 2.36, -0.76], 0.012, 8), "#e8e8ee", { finish: "chrome" }),
  ];
  const sides: THREE.BufferGeometry[] = [
    ...fender([0.82, 0.42, 0.85], 0.44, 0.44, [-0.5, 1.75], LEAF),
    ...fender([0.85, 0.46, -0.78], 0.48, 0.5, [-1.5, 0.75], LEAF),
    decal(tub, REGIONS.stickerGrip, { at: [0.54, 0.62, -0.2], facing: "left", size: [0.36, 0.09], depth: 0.3 }),
    ...tubing([[0.36, 1.82, -0.6], [0.48, 1.4, 0.1], [0.52, 0.86, 0.5]], 0.034, CAGE, "paint", true),
    ...tubing([[0.5, 1.5, -0.78], [0.5, 1.0, -1.05], [0.48, 0.66, -1.2]], 0.03, CAGE, "paint", true),
    // Mud flaps behind the front wheels.
    part(rbox(0.3, 0.26, 0.02, 0.01), "#1a1a1e", { finish: "rubber", at: [0.84, 0.3, 0.32] }),
    ...headlamp([0.32, 0.66, 1.3], 0.075, [0, 0.15, 0]),
    ...mirror([0.56, 1.3, 0.2], LEAF),
    ...exhaust([[0.3, 0.5, -0.9], [0.4, 0.55, -1.15], [0.42, 0.85, -1.3], [0.42, 1.05, -1.36]], 0.04),
  ];

  return assemble({
    centre,
    sides,
    gear: { front: [0.82, 0.42, 0.85], rear: [0.85, 0.46, -0.78], frontWidth: 0.38, rearWidth: 0.44, rail: 0.42, floor: 0.4, spring: DEEP, frame: DARK },
    front: { tyre: { radius: 0.42, width: 0.38, tread: "knobby", sidewall: "pip", bead: 0.58, balloon: true }, rim: { kind: "beadlock", color: CAGE, finish: "paint", accent: DEEP, spokes: 6, badge: "pip" } },
    rear: { tyre: { radius: 0.46, width: 0.44, tread: "knobby", sidewall: "pip", bead: 0.58, balloon: true }, rim: { kind: "beadlock", color: CAGE, finish: "paint", accent: DEEP, spokes: 6, badge: "pip" } },
    seat: [0, 0.8, -0.34],
    wheel: { at: [0, 1.17, 0.26], radius: 0.18, column: 0.85 },
    suit: { suit: "#ff9f1c", trim: "#2c7be5", glove: "#3fcf52", boot: DARK, badge: "pip", wheelAccent: CAGE, wheelRadius: 0.18, build: 0.95 },
    head: pipHead,
    exhausts: [[0.42, 1.12, -1.38], [-0.42, 1.12, -1.38]],
    lamps: { head: [[0.32, 0.66, 1.38], [-0.32, 0.66, 1.38], [0.2, 1.86, 0.14], [-0.2, 1.86, 0.14]], tail: [[0.3, 0.6, -1.24], [-0.3, 0.6, -1.24]] },
    flagAt: [-0.36, 2.35, -0.76],
    length: 2.8,
    width: 2.05,
  });
}
