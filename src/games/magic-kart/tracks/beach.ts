import { scalePoints } from "./scale";
import type { TrackDef } from "./types";

/**
 * Sunny Shores, the map on the cover. Purple tarmac along a turquoise
 * sea, palm trees, and a jump over a lagoon inlet. Mostly walled, with
 * one open stretch by the water where a wide line ends in a splash.
 */
export const BEACH: TrackDef = {
  id: "beach",
  name: "Sunny Shores",
  blurb: "Palm trees, rainbow kerbs and a jump over the lagoon.",
  theme: "beach",
  points: scalePoints(
    [
      [0, 0], [0, 55], [6, 105], [30, 145], [75, 165], [125, 155], [155, 120], [150, 75],
      [120, 50], [105, 15], [118, -25], [140, -60], [130, -105], [90, -135], [40, -135], [10, -105], [0, -55],
    ],
    1.35,
  ),
  width: 15,
  shoulder: 4,
  ramps: [{ at: 0.62, length: 12, height: 2.2 }],
  gaps: [{ at: 0.62, length: 11 }],
  boostPads: [
    { at: 0.585, offset: -3 },
    { at: 0.585, offset: 3 },
    { at: 0.9, offset: 0 },
  ],
  cubeRows: [0.1, 0.33, 0.52, 0.8],
  obstacles: [
    { kind: "crab", at: 0.22, offset: 0, radius: 1.1, sweep: { amplitude: 5, period: 3.4 } },
    { kind: "crab", at: 0.45, offset: 0, radius: 1.1, sweep: { amplitude: 5.5, period: 4, phase: 1.5 } },
    { kind: "sandcastle", at: 0.71, offset: -3.5, radius: 1.5 },
    { kind: "sandcastle", at: 0.74, offset: 4, radius: 1.5 },
    { kind: "crab", at: 0.95, offset: 0, radius: 1.1, sweep: { amplitude: 5, period: 3, phase: 3 } },
  ],
  openEdges: [{ from: 0.02, to: 0.09, side: "right" }],
};
