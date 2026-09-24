import { scalePoints } from "./scale";
import type { TrackDef } from "./types";

/**
 * Neo City at night. Square city blocks give long straights and tight
 * right angle corners between glowing towers, with a ramp off a flyover
 * and drones sweeping across the road.
 */
export const CITY: TrackDef = {
  id: "city",
  name: "Neo City",
  blurb: "Neon towers, tight city corners and patrol drones.",
  theme: "city",
  points: scalePoints(
    [
      [0, 0], [0, 90], [0, 160], [10, 176], [28, 180], [100, 180], [116, 174], [120, 158], [120, 112],
      [126, 97], [142, 92], [198, 92], [214, 84], [220, 66], [220, -38], [213, -55], [196, -60], [122, -60],
      [106, -67], [100, -84], [100, -120], [93, -135], [76, -140], [20, -140], [4, -132], [0, -114], [0, -50],
    ],
    1.05,
  ),
  width: 16,
  shoulder: 3,
  ramps: [{ at: 0.5, length: 12, height: 1.8 }],
  gaps: [],
  boostPads: [
    { at: 0.1, offset: -4 },
    { at: 0.36, offset: 4 },
    { at: 0.62, offset: 0 },
  ],
  cubeRows: [0.14, 0.4, 0.66, 0.9],
  obstacles: [
    { kind: "drone", at: 0.27, offset: 0, radius: 1.3, sweep: { amplitude: 5.5, period: 3.2 } },
    { kind: "cone", at: 0.445, offset: -3.5, radius: 0.9 },
    { kind: "cone", at: 0.465, offset: 3.5, radius: 0.9 },
    { kind: "drone", at: 0.74, offset: 0, radius: 1.3, sweep: { amplitude: 5.5, period: 2.8, phase: 1 } },
    { kind: "drone", at: 0.95, offset: 0, radius: 1.3, sweep: { amplitude: 5, period: 3.6, phase: 2.5 } },
  ],
  openEdges: [],
};
