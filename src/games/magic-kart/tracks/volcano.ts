import { scalePoints } from "./scale";
import type { TrackDef } from "./types";

/**
 * Magma Peak. The road climbs the side of a live volcano past lava
 * pools, jumps a river of lava near the top and swoops back down.
 * Boulders roll across the road, and the lava side has no wall.
 */
export const VOLCANO: TrackDef = {
  id: "volcano",
  name: "Magma Peak",
  blurb: "Climb a live volcano, dodge boulders and leap the lava river.",
  theme: "volcano",
  points: scalePoints(
    [
      [0, 0, 0], [0, 70, 2], [15, 120, 6], [55, 147, 10], [100, 137, 14], [122, 95, 17], [102, 55, 19],
      [64, 44, 20], [44, 10, 20], [48, -28, 18], [90, -42, 15], [132, -70, 11], [124, -122, 7],
      [72, -142, 4], [20, -126, 2], [0, -70, 0],
    ],
    1.35,
  ),
  width: 15,
  shoulder: 3.5,
  ramps: [{ at: 0.45, length: 12, height: 2.2 }],
  gaps: [{ at: 0.45, length: 10 }],
  boostPads: [
    { at: 0.425, offset: -3 },
    { at: 0.425, offset: 3 },
    { at: 0.2, offset: 0 },
  ],
  cubeRows: [0.12, 0.33, 0.58, 0.84],
  obstacles: [
    { kind: "boulder", at: 0.25, offset: 0, radius: 1.7, sweep: { amplitude: 5, period: 4 } },
    { kind: "pillar", at: 0.63, offset: 0, radius: 1.6 },
    { kind: "boulder", at: 0.72, offset: 0, radius: 1.7, sweep: { amplitude: 5, period: 3.4, phase: 2 } },
    { kind: "pillar", at: 0.9, offset: -4.5, radius: 1.4 },
  ],
  openEdges: [{ from: 0.5, to: 0.56, side: "right" }],
};
