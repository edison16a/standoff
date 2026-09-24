import type * as THREE from "three";
import { seatedBody, steeringWheel } from "../driver-parts";
import { ball, box, cyl, lathe, merge, mirrorX, paint, profile, ring, rod } from "../geo";
import type { KartDesign } from "../kart-design";
import { buildWheel } from "../wheel";

const WHITE = "#eef3fb";
const BLUE = "#2f8cff";
const NAVY = "#1b2a52";
const STEEL = "#9aa7bd";
const NEON = "#5ff2ff";

/** Nova the robot in the Comet Glider: a sleek space wedge with fins, neon trim and a turbine. */
export function buildNova(): KartDesign {
  const body: THREE.BufferGeometry[] = [
    paint(box(1.2, 0.12, 2.6, 0.05), NAVY, { at: [0, 0.26, 0] }),
    // The wedge: a sharp nose sweeping up to a canopy cowl.
    paint(profile([[1.55, 0.3], [1.5, 0.38], [0.6, 0.66], [0.08, 0.8], [0.08, 0.3]], 1.05, 0.08), WHITE),
    paint(profile([[1.5, 0.39], [0.62, 0.67], [0.6, 0.7], [1.48, 0.42]], 0.4, 0.02), BLUE, { at: [0, 0.01, 0] }),
    paint(box(1.7, 0.1, 0.34, 0.05), NAVY, { at: [0, 0.3, 1.36] }),
    // Rear pod with the turbine.
    paint(profile([[-0.5, 0.3], [-0.5, 0.86], [-0.95, 0.9], [-1.35, 0.7], [-1.35, 0.3]], 1.15, 0.1), WHITE),
    paint(lathe([[0.3, 0], [0.34, 0.1], [0.34, 0.34], [0.26, 0.4]], 22), STEEL, { at: [0, 0.66, -1.35], rot: [-Math.PI / 2, 0, 0] }),
    paint(cyl(0.2, 0.2, 0.1, 18), NAVY, { at: [0, 0.66, -1.68], rot: [Math.PI / 2, 0, 0] }),
    paint(box(0.72, 0.14, 0.62, 0.06), NAVY, { at: [0, 0.42, -0.28] }),
    paint(box(0.72, 0.66, 0.14, 0.07), NAVY, { at: [0, 0.76, -0.6], rot: [-0.2, 0, 0] }),
    ...steeringWheel([0, 0.98, 0.32], NAVY, NEON),
    rod([-0.4, 0.8, -0.8], [-0.4, 1.95, -0.8], 0.018, STEEL, 6),
  ];
  const sides: THREE.BufferGeometry[] = [
    // Side pods and a tall swept fin each side.
    paint(box(0.32, 0.26, 1.5, 0.1), WHITE, { at: [0.66, 0.4, -0.05] }),
    paint(box(0.34, 0.06, 1.3, 0.03), BLUE, { at: [0.67, 0.55, -0.05] }),
    paint(profile([[-0.55, 0.8], [-0.9, 1.45], [-1.2, 1.5], [-1.1, 0.8]], 0.07, 0.02), BLUE, { at: [0.5, 0, 0] }),
    paint(box(0.08, 0.2, 0.6, 0.03), STEEL, { at: [0.86, 0.35, 1.2] }),
  ];
  const glow = merge([
    ...mirrorX([
      paint(box(0.04, 0.04, 1.3), NEON, { at: [0.83, 0.44, -0.05] }),
      paint(box(0.06, 0.05, 0.5), NEON, { at: [0.52, 1.1, -1.0], rot: [0.95, 0, 0] }),
      paint(box(0.24, 0.05, 0.05), "#8ff9ff", { at: [0.28, 0.4, 1.53] }),
      paint(box(0.2, 0.06, 0.04), "#ff3c6e", { at: [0.42, 0.6, -1.37] }),
    ]),
    paint(ring(0.27, 0.035, 24, 8), NEON, { at: [0, 0.66, -1.72] }),
    paint(cyl(0.16, 0.16, 0.02, 18), "#b6fbff", { at: [0, 0.66, -1.74], rot: [Math.PI / 2, 0, 0] }),
  ]);

  const driver: THREE.BufferGeometry[] = [
    ...seatedBody({ suit: STEEL, trim: BLUE, glove: NAVY }, 0.6),
    // Robot head: a rounded screen with a glowing visor, ear pods and an antenna.
    paint(box(0.56, 0.44, 0.46, 0.14), WHITE, { at: [0, 1.12, 0] }),
    paint(box(0.46, 0.2, 0.06, 0.05), NAVY, { at: [0, 1.14, 0.22] }),
    paint(cyl(0.09, 0.09, 0.06, 14), STEEL, { at: [0.3, 1.12, 0], rot: [0, 0, Math.PI / 2] }),
    paint(cyl(0.09, 0.09, 0.06, 14), STEEL, { at: [-0.3, 1.12, 0], rot: [0, 0, Math.PI / 2] }),
    rod([0, 1.34, -0.05], [0.05, 1.6, -0.1], 0.015, STEEL, 6),
    paint(box(0.4, 0.06, 0.3, 0.02), BLUE, { at: [0, 1.36, 0] }),
  ];
  // Nova's eyes and antenna tip glow, and lean with the head.
  const face = merge([
    paint(box(0.1, 0.08, 0.02, 0.01), NEON, { at: [-0.1, 1.15, 0.26] }),
    paint(box(0.1, 0.08, 0.02, 0.01), NEON, { at: [0.1, 1.15, 0.26] }),
    paint(ball(0.05, 10, 8), "#ff6ad5", { at: [0.05, 1.62, -0.1] }),
  ]);

  const wheel = (radius: number, width: number) => buildWheel({ radius, width, tire: "#1d2233", rim: STEEL, hub: BLUE, spokes: 3 });
  const front = wheel(0.3, 0.26);
  const rear = wheel(0.38, 0.4);
  const driverAt = [0, 0.36, -0.3] as const;
  return {
    body: merge([...body, ...mirrorX(sides)]),
    glow,
    driverGlow: face,
    driver: merge(driver),
    driverAt,
    wheels: [
      { at: [0.8, 0.3, 1.02], geometry: front, radius: 0.3, front: true },
      { at: [-0.8, 0.3, 1.02], geometry: front, radius: 0.3, front: true },
      { at: [0.86, 0.38, -0.86], geometry: rear, radius: 0.38, front: false },
      { at: [-0.86, 0.38, -0.86], geometry: rear, radius: 0.38, front: false },
    ],
    exhausts: [[0, 0.66, -1.75]],
    flagAt: [-0.4, 1.95, -0.8],
    length: 3.1,
    width: 1.9,
  };
}
