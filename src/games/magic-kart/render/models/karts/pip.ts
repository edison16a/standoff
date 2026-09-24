import type * as THREE from "three";
import { eyes, seatedBody, steeringWheel } from "../driver-parts";
import { ball, box, cyl, merge, mirrorX, paint, profile, ring, rod, type V3 } from "../geo";
import type { KartDesign } from "../kart-design";
import { buildWheel } from "../wheel";

const LEAF = "#3fcf52";
const LEAF_DARK = "#249b3a";
const PAD = "#8be06a";
const TUBE = "#ffd23f";
const DARK = "#2a2f2a";

/** A tube of the roll cage between two points. */
const tube = (a: V3, b: V3) => rod(a, b, 0.045, TUBE);

/** Pip the frog in the Lily Buggy: a bouncy dune buggy with a yellow roll cage and balloon tyres. */
export function buildPip(): KartDesign {
  const body: THREE.BufferGeometry[] = [
    paint(box(1.1, 0.14, 2.2, 0.06), DARK, { at: [0, 0.36, 0] }),
    // Rounded tub with a lily pad bonnet on top.
    paint(profile([[1.15, 0.4], [1.1, 0.62], [0.7, 0.78], [0.1, 0.8], [-0.7, 0.78], [-1.1, 0.64], [-1.15, 0.4]], 1.18, 0.14, true), LEAF),
    paint(cyl(0.62, 0.62, 0.05, 28, false), PAD, { at: [0, 0.84, 0.62], scale: [1, 1, 0.85] }),
    paint(box(0.08, 0.06, 0.6), LEAF_DARK, { at: [0, 0.88, 0.62] }),
    paint(box(1.5, 0.2, 0.22, 0.09), DARK, { at: [0, 0.42, 1.2] }),
    paint(box(1.3, 0.2, 0.2, 0.09), DARK, { at: [0, 0.44, -1.2] }),
    // Seat, a big yellow cushion.
    paint(box(0.68, 0.18, 0.6, 0.08), TUBE, { at: [0, 0.86, -0.3] }),
    paint(box(0.68, 0.6, 0.16, 0.08), TUBE, { at: [0, 1.12, -0.62], rot: [-0.15, 0, 0] }),
    ...steeringWheel([0, 1.2, 0.25], DARK, LEAF),
    // Spare tyre strapped on the back.
    paint(ring(0.26, 0.1, 20, 10), DARK, { at: [0, 0.82, -1.22] }),
    paint(cyl(0.16, 0.16, 0.12, 16), TUBE, { at: [0, 0.82, -1.22], rot: [Math.PI / 2, 0, 0] }),
    // Roll hoop over the seat and bars forward.
    tube([-0.5, 0.82, -0.72], [-0.44, 1.75, -0.72]),
    tube([0.5, 0.82, -0.72], [0.44, 1.75, -0.72]),
    tube([-0.44, 1.75, -0.72], [0.44, 1.75, -0.72]),
    tube([-0.44, 1.75, -0.72], [-0.52, 0.86, 0.3]),
    tube([0.44, 1.75, -0.72], [0.52, 0.86, 0.3]),
    tube([-0.44, 1.3, -0.72], [-0.52, 0.86, -1.18]),
    tube([0.44, 1.3, -0.72], [0.52, 0.86, -1.18]),
    paint(cyl(0.015, 0.02, 0.7, 6), "#ececec", { at: [-0.44, 2.1, -0.72] }),
  ];
  const sides: THREE.BufferGeometry[] = [
    // Mudguards over the balloon tyres.
    paint(ring(0.52, 0.1, 18, 8, Math.PI), LEAF_DARK, { at: [0.8, 0.5, 0.78], rot: [0, Math.PI / 2, 0] }),
    paint(ring(0.56, 0.1, 18, 8, Math.PI), LEAF_DARK, { at: [0.82, 0.54, -0.72], rot: [0, Math.PI / 2, 0] }),
    // Spotlights on the hoop, and exhaust stack.
    paint(cyl(0.1, 0.08, 0.14, 14), DARK, { at: [0.3, 1.82, -0.66], rot: [Math.PI / 2, 0, 0] }),
    paint(cyl(0.06, 0.06, 0.5, 10), "#c9c9c9", { at: [0.45, 0.72, -1.3], rot: [-0.5, 0, 0] }),
    paint(ball(0.05, 8, 6), "#f48fb1", { at: [0.62, 0.72, 1.2] }),
  ];
  const glow = merge(mirrorX([
    paint(ball(0.1, 12, 8), "#fffbe0", { at: [0.3, 1.82, -0.58], scale: [1, 1, 0.5] }),
    paint(ball(0.09, 12, 8), "#fffbe0", { at: [0.42, 0.66, 1.2], scale: [1, 1, 0.5] }),
    paint(box(0.14, 0.08, 0.03), "#ff3b3b", { at: [0.52, 0.56, -1.31] }),
  ]));

  const driver: THREE.BufferGeometry[] = [
    ...seatedBody({ suit: "#ffb13b", trim: "#2c7be5", glove: "#3fcf52" }, 0.52),
    // Frog head: wide and flat, eyes up on top, a big grin.
    paint(ball(0.34, 20, 14), LEAF, { at: [0, 1.06, 0.02], scale: [1.2, 0.72, 1] }),
    paint(ball(0.3, 18, 12), "#d8f5b0", { at: [0, 0.98, 0.06], scale: [1.1, 0.55, 0.95] }),
    paint(ring(0.2, 0.025, 16, 6, Math.PI), "#b3334a", { at: [0, 1.02, 0.3], rot: [Math.PI / 2 + 0.2, 0, Math.PI], scale: [1.2, 1, 1] }),
    paint(ball(0.06, 10, 8), "#ff8fb0", { at: [-0.3, 1.02, 0.22] }),
    paint(ball(0.06, 10, 8), "#ff8fb0", { at: [0.3, 1.02, 0.22] }),
    paint(ball(0.13, 14, 10), LEAF, { at: [-0.17, 1.26, 0.08] }),
    paint(ball(0.13, 14, 10), LEAF, { at: [0.17, 1.26, 0.08] }),
    ...eyes([0, 1.3, 0.14], 0.17, 0.1),
    // A little flower tucked behind one eye.
    paint(ball(0.06, 8, 6), "#ff6fa8", { at: [0.3, 1.3, -0.1], scale: [1.4, 0.5, 1.4] }),
  ];

  const front = buildWheel({ radius: 0.42, width: 0.38, tire: "#262626", rim: "#ffd23f", hub: LEAF_DARK, spokes: 6, balloon: true, knobbly: true });
  const rear = buildWheel({ radius: 0.46, width: 0.44, tire: "#262626", rim: "#ffd23f", hub: LEAF_DARK, spokes: 6, balloon: true, knobbly: true });
  return {
    body: merge([...body, ...mirrorX(sides)]),
    glow,
    driver: merge(driver),
    driverAt: [0, 0.78, -0.3],
    wheels: [
      { at: [0.8, 0.42, 0.78], geometry: front, radius: 0.42, front: true },
      { at: [-0.8, 0.42, 0.78], geometry: front, radius: 0.42, front: true },
      { at: [0.84, 0.46, -0.72], geometry: rear, radius: 0.46, front: false },
      { at: [-0.84, 0.46, -0.72], geometry: rear, radius: 0.46, front: false },
    ],
    exhausts: [[0.45, 0.9, -1.45], [-0.45, 0.9, -1.45]],
    flagAt: [-0.44, 2.42, -0.72],
    length: 2.8,
    width: 2,
  };
}
