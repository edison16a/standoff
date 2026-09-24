import * as THREE from "three";
import { eyes, seatedBody, steeringWheel } from "../driver-parts";
import { ball, box, cyl, flat, lathe, merge, mirrorX, paint, profile, ring, rod } from "../geo";
import type { KartDesign } from "../kart-design";
import { buildWheel } from "../wheel";

const PINK = "#ff86bd";
const CREAM = "#fff4e4";
const BERRY = "#d9467f";
const BAMBOO = "#8fc93a";
const DARK = "#2b2530";

/** A little heart, for the badge on the back. */
function heart(): THREE.Shape {
  const h = new THREE.Shape();
  h.moveTo(0, 0);
  h.bezierCurveTo(-0.5, 0.35, -0.3, 0.75, 0, 0.5);
  h.bezierCurveTo(0.3, 0.75, 0.5, 0.35, 0, 0);
  return h;
}

/** Mochi the panda in the Dumpling Tank: a chunky, rounded bumper car with a steamed bun on the bonnet. */
export function buildMochi(): KartDesign {
  const body: THREE.BufferGeometry[] = [
    paint(box(1.3, 0.14, 2.4, 0.06), DARK, { at: [0, 0.28, 0] }),
    // A tall soft body, all curves, like a bath toy.
    paint(profile([[1.3, 0.3], [1.34, 0.58], [1.12, 0.78], [0.45, 0.84], [0.1, 0.8], [0.1, 0.3]], 1.4, 0.18, true), PINK),
    paint(profile([[-0.5, 0.3], [-0.5, 0.86], [-0.95, 0.92], [-1.35, 0.72], [-1.38, 0.3]], 1.45, 0.18, true), PINK),
    // A cream belly band all the way round.
    paint(box(1.62, 0.16, 2.7, 0.08), CREAM, { at: [0, 0.4, 0] }),
    paint(box(1.7, 0.26, 0.3, 0.13), BERRY, { at: [0, 0.34, 1.38] }),
    paint(box(1.7, 0.26, 0.3, 0.13), BERRY, { at: [0, 0.34, -1.38] }),
    // The kart's own face on the nose: big friendly eyes and a smile.
    ...eyes([0, 0.66, 1.3], 0.26, 0.13),
    paint(ring(0.12, 0.025, 14, 6, Math.PI), DARK, { at: [0, 0.5, 1.37], rot: [0, 0, Math.PI] }),
    // The dumpling on the bonnet: a squashed bun with pleats on top.
    paint(ball(0.3, 20, 12), CREAM, { at: [0, 1.0, 0.72], scale: [1, 0.62, 1] }),
    paint(lathe([[0.001, 0.2], [0.08, 0.14], [0.03, 0]], 10), CREAM, { at: [0, 1.04, 0.72] }),
    paint(box(0.74, 0.16, 0.62, 0.07), BERRY, { at: [0, 0.5, -0.28] }),
    paint(box(0.74, 0.7, 0.16, 0.08), BERRY, { at: [0, 0.86, -0.58], rot: [-0.15, 0, 0] }),
    ...steeringWheel([0, 1.1, 0.32], DARK, PINK),
    rod([-0.48, 0.9, -0.9], [-0.48, 2.05, -0.9], 0.02, BAMBOO, 6),
    // The back, which the chase camera sees most: a fluffy tail, a cream heart and a berry bumper stripe.
    paint(ball(0.16, 12, 10), "#ffffff", { at: [0, 0.78, -1.47] }),
    paint(flat(heart(), 0.03), CREAM, { at: [0, 0.4, -1.52], rot: [0, Math.PI, 0], scale: 0.5 }),
    paint(box(1.3, 0.06, 0.05), CREAM, { at: [0, 0.68, -1.45] }),
  ];
  for (let i = 0; i < 3; i++) body.push(paint(cyl(0.035, 0.035, 0.02, 8), "#6d9b28", { at: [-0.48, 1.2 + i * 0.3, -0.9] }));

  const sides: THREE.BufferGeometry[] = [
    // Round fender bubbles over each wheel.
    paint(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), PINK, { at: [0.8, 0.5, 0.85], scale: [0.5, 0.6, 0.95] }),
    paint(new THREE.SphereGeometry(0.54, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), PINK, { at: [0.82, 0.54, -0.8], scale: [0.5, 0.62, 0.95] }),
    // Bath toy cheeks either side of the face on the nose.
    paint(ball(0.09, 10, 8), "#ff5c9a", { at: [0.5, 0.52, 1.36], scale: [1.2, 0.8, 0.5] }),
    // A bamboo bundle strapped along each side.
    rod([0.9, 0.62, -0.5], [0.9, 0.62, 0.45], 0.05, BAMBOO, 8),
    rod([0.92, 0.72, -0.45], [0.92, 0.72, 0.4], 0.04, "#a5dc4e", 8),
    paint(cyl(0.07, 0.07, 0.05, 10), BERRY, { at: [0.9, 0.66, 0], rot: [Math.PI / 2, 0, 0] }),
    // Round headlamp housings and chunky exhaust.
    paint(cyl(0.1, 0.1, 0.08, 16), CREAM, { at: [0.62, 0.42, 1.5], rot: [Math.PI / 2, 0, 0] }),
    paint(cyl(0.08, 0.1, 0.3, 12), "#bfb6c7", { at: [0.4, 0.42, -1.5], rot: [Math.PI / 2, 0, 0] }),
  ];
  const glow = merge(mirrorX([
    paint(ball(0.08, 12, 8), "#fffbe8", { at: [0.62, 0.42, 1.54], scale: [1, 1, 0.5] }),
    paint(ball(0.08, 10, 8), "#ff3d6a", { at: [0.62, 0.72, -1.36], scale: [1, 1, 0.5] }),
  ]));

  const driver: THREE.BufferGeometry[] = [
    ...seatedBody({ suit: "#fbfbfb", trim: BERRY, glove: DARK }, 0.62),
    // Panda head: big and round, black ears and eye patches, a small black nose.
    paint(ball(0.36, 22, 16), "#ffffff", { at: [0, 1.16, 0], scale: [1.05, 0.95, 0.95] }),
    paint(ball(0.13, 12, 10), DARK, { at: [-0.28, 1.44, -0.02] }),
    paint(ball(0.13, 12, 10), DARK, { at: [0.28, 1.44, -0.02] }),
    paint(ball(0.1, 12, 8), DARK, { at: [-0.13, 1.18, 0.28], scale: [0.9, 1.25, 0.5], rot: [0, 0, 0.5] }),
    paint(ball(0.1, 12, 8), DARK, { at: [0.13, 1.18, 0.28], scale: [0.9, 1.25, 0.5], rot: [0, 0, -0.5] }),
    ...eyes([0, 1.2, 0.3], 0.13, 0.045),
    paint(ball(0.13, 12, 8), "#f2ece6", { at: [0, 1.05, 0.28], scale: [1.2, 0.8, 0.8] }),
    paint(ball(0.045, 10, 8), DARK, { at: [0, 1.1, 0.38], scale: [1.3, 0.8, 1] }),
    // A bamboo sprig held in the teeth.
    rod([-0.2, 1.0, 0.35], [0.3, 1.02, 0.32], 0.02, BAMBOO, 6),
    paint(ball(0.06, 8, 6), "#6cc24a", { at: [0.34, 1.06, 0.32], scale: [1.6, 0.4, 0.8] }),
  ];

  const front = buildWheel({ radius: 0.36, width: 0.36, tire: "#2a2a30", rim: CREAM, hub: BERRY, spokes: 4, balloon: true });
  const rear = buildWheel({ radius: 0.4, width: 0.42, tire: "#2a2a30", rim: CREAM, hub: BERRY, spokes: 4, balloon: true });
  return {
    body: merge([...body, ...mirrorX(sides)]),
    glow,
    driver: merge(driver),
    driverAt: [0, 0.5, -0.3],
    wheels: [
      { at: [0.78, 0.36, 0.85], geometry: front, radius: 0.36, front: true },
      { at: [-0.78, 0.36, 0.85], geometry: front, radius: 0.36, front: true },
      { at: [0.8, 0.4, -0.8], geometry: rear, radius: 0.4, front: false },
      { at: [-0.8, 0.4, -0.8], geometry: rear, radius: 0.4, front: false },
    ],
    exhausts: [[0.4, 0.42, -1.68], [-0.4, 0.42, -1.68]],
    flagAt: [-0.48, 2.05, -0.9],
    length: 3,
    width: 2,
  };
}
