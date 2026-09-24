import * as THREE from "three";
import { eyes, seatedBody, steeringWheel } from "../driver-parts";
import { ball, box, cyl, flat, lathe, merge, mirrorX, paint, profile } from "../geo";
import type { KartDesign } from "../kart-design";
import { buildWheel } from "../wheel";

const RED = "#ff4a1c";
const DEEP = "#c92a0e";
const FLAME = "#ffc21a";
const CHROME = "#d9dde6";
const DARK = "#26262e";

/** A flame decal: three licks of fire, drawn as one flat shape. */
function flameShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.35, 0.12, 0.62, 0.02);
  s.quadraticCurveTo(0.42, 0.1, 0.5, 0.2);
  s.quadraticCurveTo(0.3, 0.14, 0.34, 0.3);
  s.quadraticCurveTo(0.18, 0.18, 0.1, 0.24);
  s.quadraticCurveTo(0.08, 0.1, 0, 0);
  return s;
}

/** Blaze the fox in the Flame Rod: a long, low hot rod with chrome pipes and flames down the sides. */
export function buildBlaze(): KartDesign {
  const body: THREE.BufferGeometry[] = [
    paint(box(1.2, 0.12, 2.6, 0.05), DARK, { at: [0, 0.24, 0] }),
    // Long hood, low nose.
    paint(profile([[1.5, 0.28], [1.46, 0.44], [1.15, 0.56], [0.55, 0.68], [0.12, 0.74], [0.12, 0.28]], 0.98, 0.1), RED),
    paint(box(0.5, 0.06, 1.1, 0.03), DEEP, { at: [0, 0.73, 0.75], rot: [0.12, 0, 0] }),
    paint(box(1.64, 0.18, 0.26, 0.08), DARK, { at: [0, 0.28, 1.45] }),
    // Rear engine deck behind the seat.
    paint(profile([[-0.55, 0.3], [-0.55, 0.78], [-0.9, 0.84], [-1.35, 0.72], [-1.4, 0.3]], 1.1, 0.1), RED),
    paint(box(0.62, 0.2, 0.5, 0.06), CHROME, { at: [0, 0.94, -0.95] }),
    paint(box(0.52, 0.2, 0.3, 0.05), DARK, { at: [0, 0.4, -1.42] }),
    // Seat and backrest.
    paint(box(0.7, 0.14, 0.62, 0.06), DARK, { at: [0, 0.42, -0.28] }),
    paint(box(0.7, 0.62, 0.14, 0.07), DARK, { at: [0, 0.74, -0.58], rot: [-0.18, 0, 0] }),
    ...steeringWheel([0, 0.95, 0.3], DARK, FLAME),
    // Rear wing.
    paint(box(1.62, 0.06, 0.4, 0.03), DEEP, { at: [0, 1.22, -1.28], rot: [0.12, 0, 0] }),
    paint(box(1.64, 0.02, 0.06), FLAME, { at: [0, 1.25, -1.1] }),
    // Antenna for the player's flag.
    paint(cyl(0.015, 0.02, 1.05, 6), CHROME, { at: [-0.42, 1.25, -0.72] }),
  ];
  // Intake trumpets on the engine.
  for (const x of [-0.18, 0.06]) body.push(paint(cyl(0.07, 0.09, 0.22, 12, true), CHROME, { at: [x + 0.06, 1.12, -0.95] }));

  const sides: THREE.BufferGeometry[] = [
    paint(box(0.34, 0.3, 1.36, 0.12), RED, { at: [0.64, 0.4, -0.1] }),
    paint(box(0.3, 0.08, 1.2, 0.04), DEEP, { at: [0.66, 0.58, -0.1] }),
    paint(flat(flameShape(), 0.02), FLAME, { at: [0.815, 0.3, 0.45], rot: [0, Math.PI / 2, 0], scale: [1.4, 1, 1] }),
    paint(cyl(0.012, 0.012, 0.3, 4), CHROME, { at: [0.62, 1.1, -1.28] }),
    // Chrome side pipes running back and up.
    paint(cyl(0.065, 0.065, 1.1, 12), CHROME, { at: [0.84, 0.36, -0.35], rot: [Math.PI / 2, 0, 0] }),
    paint(lathe([[0.065, 0], [0.1, 0.18], [0.11, 0.26]], 14), CHROME, { at: [0.84, 0.36, -0.92], rot: [-Math.PI / 2 - 0.35, 0, 0] }),
    // Headlight bezel.
    paint(cyl(0.12, 0.12, 0.08, 16), CHROME, { at: [0.3, 0.46, 1.44], rot: [Math.PI / 2 - 0.3, 0, 0] }),
    paint(box(0.2, 0.12, 0.06, 0.03), DARK, { at: [0.4, 0.62, -1.44] }),
  ];

  const glow = merge([
    ...mirrorX([paint(ball(0.085, 12, 8), "#fff6d5", { at: [0.3, 0.47, 1.49] }), paint(box(0.16, 0.07, 0.04, 0.02), "#ff2d2d", { at: [0.4, 0.62, -1.47] })]),
  ]);

  const driver: THREE.BufferGeometry[] = [
    ...seatedBody({ suit: "#3a3f5c", trim: FLAME, glove: "#f2f2f2" }, 0.58),
    // Fox head: orange dome, white cheeks and muzzle, tall ears, goggles up on the brow.
    paint(ball(0.3, 20, 14), "#ff7b2e", { at: [0, 1.12, 0], scale: [1, 0.95, 0.95] }),
    paint(ball(0.2, 16, 12), "#fff3e6", { at: [0, 1.0, 0.2], scale: [1.1, 0.75, 1] }),
    paint(lathe([[0.001, 0], [0.12, 0.02], [0.04, 0.22], [0.001, 0.26]], 12), "#ff7b2e", { at: [0, 1.04, 0.24], rot: [Math.PI / 2, 0, 0] }),
    paint(ball(0.045, 10, 8), DARK, { at: [0, 1.06, 0.5] }),
    ...eyes([0, 1.18, 0.2], 0.12, 0.07, "#2d6a1f"),
    paint(cyl(0.3, 0.3, 0.07, 20, true), "#5a3b22", { at: [0, 1.32, -0.02], rot: [0.2, 0, 0] }),
    paint(box(0.44, 0.07, 0.3, 0.03), "#5a3b22", { at: [0, 0.83, 0.02] }),
  ];
  for (const side of [-1, 1]) {
    driver.push(paint(cyl(0.09, 0.09, 0.08, 14), "#9fe4ff", { at: [side * 0.12, 1.38, 0.16], rot: [Math.PI / 2 - 0.5, 0, 0] }));
    driver.push(paint(lathe([[0.12, 0], [0.001, 0.3]], 4), "#ff7b2e", { at: [side * 0.18, 1.32, -0.05], rot: [0, 0, side * -0.3] }));
    driver.push(paint(lathe([[0.05, 0], [0.001, 0.1]], 4), DARK, { at: [side * 0.24, 1.55, -0.05], rot: [0, 0, side * -0.3] }));
  }
  // The bushy tail curls out over the engine deck, the first thing a chase camera sees.
  driver.push(paint(ball(0.2, 14, 10), "#ff7b2e", { at: [0, 0.8, -0.62], scale: [0.9, 0.9, 1.6], rot: [0.5, 0, 0] }));
  driver.push(paint(ball(0.14, 12, 8), "#fff3e6", { at: [0, 0.98, -0.9], scale: [0.9, 0.9, 1.2], rot: [0.8, 0, 0] }));

  const front = buildWheel({ radius: 0.3, width: 0.26, tire: "#1c1c22", rim: CHROME, hub: RED, spokes: 5 });
  const rear = buildWheel({ radius: 0.42, width: 0.44, tire: "#1c1c22", rim: CHROME, hub: RED, spokes: 5 });
  return {
    body: merge([...body, ...mirrorX(sides)]),
    glow,
    driver: merge(driver),
    driverAt: [0, 0.36, -0.3],
    wheels: [
      { at: [0.8, 0.3, 1.0], geometry: front, radius: 0.3, front: true },
      { at: [-0.8, 0.3, 1.0], geometry: front, radius: 0.3, front: true },
      { at: [0.86, 0.42, -0.85], geometry: rear, radius: 0.42, front: false },
      { at: [-0.86, 0.42, -0.85], geometry: rear, radius: 0.42, front: false },
    ],
    exhausts: [[0.9, 0.5, -1.05], [-0.9, 0.5, -1.05]],
    flagAt: [-0.42, 1.76, -0.72],
    length: 3,
    width: 1.9,
  };
}
