import { scalePoints } from "./scale";
import type { TrackDef } from "./types";

/**
 * Star Ring, a glowing road floating through space. It climbs and dips,
 * has long stretches with no rail at all, and a boosted leap across an
 * open gap. Fall off and you drop into the stars.
 */
export const SPACE: TrackDef = {
  id: "space",
  name: "Star Ring",
  blurb: "A floating neon road with open edges and a leap across the void.",
  theme: "space",
  points: scalePoints(
    [
      [0, 0, 0], [0, 70, 0], [-10, 130, 3], [-50, 170, 8], [-110, 172, 12], [-152, 132, 12], [-150, 72, 8],
      [-112, 42, 4], [-70, 20, 2], [-58, -28, 0], [-98, -70, -4], [-92, -128, -7], [-42, -160, -6],
      [18, -150, -3], [42, -100, 0], [22, -50, 0],
    ],
    1.35,
    1.4,
  ),
  width: 15,
  shoulder: 3,
  ramps: [{ at: 0.43, length: 14, height: 3 }],
  gaps: [{ at: 0.43, length: 26 }],
  boostPads: [
    { at: 0.405, offset: -3 },
    { at: 0.405, offset: 3 },
    { at: 0.14, offset: 0 },
    { at: 0.76, offset: -4 },
  ],
  cubeRows: [0.07, 0.3, 0.55, 0.82],
  skyRows: [{ at: 0.452, height: 5.4 }],
  obstacles: [
    { kind: "asteroid", at: 0.2, offset: 0, radius: 1.6, sweep: { amplitude: 5, period: 4.2 } },
    { kind: "satellite", at: 0.64, offset: 4, radius: 1.4 },
    { kind: "asteroid", at: 0.68, offset: 0, radius: 1.6, sweep: { amplitude: 5, period: 3.6, phase: 2 } },
    { kind: "satellite", at: 0.9, offset: -4, radius: 1.4 },
  ],
  openEdges: [
    { from: 0.24, to: 0.36 },
    { from: 0.47, to: 0.58 },
    { from: 0.86, to: 0.95 },
  ],
};
