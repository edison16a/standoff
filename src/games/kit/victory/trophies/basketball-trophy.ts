import * as THREE from "three";
import { band, merged, sweep, turned } from "./shapes";
import { disposeGeometries, shadowAll, trophyMaterials } from "./materials";
import type { Trophy, TrophyOptions } from "./trophy";

/** Real proportions, in metres before scaling: the whole trophy stands about 0.6 tall. */
const BALL = 0.085;
const RIM = 0.1;
const NET_TOP = 0.43;
const NET_BOTTOM = 0.27;
const NET_LOW_RADIUS = 0.055;

const NATURAL_HEIGHT = NET_TOP + RIM * 0.05 + BALL * 1.7;

/**
 * A basketball championship trophy in the classic style: a gold ball
 * resting in a gold hoop, its net tapering down into a tall turned
 * base. All in code, no files to load.
 */
export function createBasketballTrophy(options: TrophyOptions = {}): Trophy {
  const materials = options.materials ?? trophyMaterials();
  const owned = !options.materials;
  const group = new THREE.Group();
  const scale = (options.height ?? NATURAL_HEIGHT) / NATURAL_HEIGHT;
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  group.add(root);

  // The base: a stepped foot, a long flared column, and a collar where the net sits.
  const base = turned([
    [0.075, 0],
    [0.078, 0.012],
    [0.07, 0.02],
    [0.066, 0.03],
    [0.05, 0.05],
    [0.042, 0.12],
    [0.04, 0.2],
    [0.046, 0.245],
    [0.058, 0.262],
    [0.058, NET_BOTTOM],
  ]);
  root.add(new THREE.Mesh(base, materials.gold));
  root.add(new THREE.Mesh(merged([band(0.071, 0.004, 0.022), band(0.056, 0.004, 0.258), band(0.041, 0.003, 0.16)]), materials.satinGold));

  root.add(new THREE.Mesh(net(), materials.gold));
  // The hoop: a thick ring, and the flat plate behind it where a backboard would bolt on.
  const rim = new THREE.TorusGeometry(RIM, 0.007, 14, 80);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, NET_TOP, 0);
  root.add(new THREE.Mesh(rim, materials.gold));

  // The ball sits down in the hoop, a little under half its height below the rim.
  const ball = new THREE.Group();
  ball.position.set(0, NET_TOP + BALL * 0.7, 0);
  ball.rotation.set(0.35, 0.5, 0.2);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(BALL, 48, 32), materials.gold));
  ball.add(new THREE.Mesh(seams(), materials.satinGold));
  root.add(ball);

  shadowAll(group);
  return {
    group,
    grip: new THREE.Vector3(0, NET_TOP * scale, 0),
    height: NATURAL_HEIGHT * scale,
    dispose() {
      disposeGeometries(group);
      if (owned) materials.dispose();
    },
  };
}

/** The net: two sets of spirals crossing into diamonds, narrowing from the rim to the base. */
function net(): THREE.BufferGeometry {
  const strands = 14;
  const parts: THREE.BufferGeometry[] = [];
  for (const way of [1, -1]) {
    for (let i = 0; i < strands; i++) {
      const start = (i / strands) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const y = NET_TOP - t * (NET_TOP - NET_BOTTOM);
        // The net pinches in fast under the rim, then runs almost straight down.
        const r = NET_LOW_RADIUS + (RIM - NET_LOW_RADIUS) * Math.pow(1 - t, 1.6);
        const a = start + way * t * 1.1;
        points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      parts.push(sweep(new THREE.CatmullRomCurve3(points), () => 0.0028, 32, 5));
    }
  }
  // Rings where the strands cross read as knots.
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    parts.push(band(NET_LOW_RADIUS + (RIM - NET_LOW_RADIUS) * Math.pow(1 - t, 1.6), 0.0022, NET_TOP - t * (NET_TOP - NET_BOTTOM)));
  }
  return merged(parts);
}

/** The ball's seams: one round the middle, one over the top, and the two curves on the sides. */
function seams(): THREE.BufferGeometry {
  const width = 0.0026;
  const middle = new THREE.TorusGeometry(BALL * 1.004, width, 8, 72);
  const over = new THREE.TorusGeometry(BALL * 1.004, width, 8, 72);
  over.rotateY(Math.PI / 2);
  const parts = [middle, over];
  for (const side of [1, -1]) {
    const angle = 0.95;
    const curve = new THREE.TorusGeometry(BALL * 1.004 * Math.sin(angle), width, 8, 72);
    curve.rotateY(Math.PI / 2);
    curve.translate(side * BALL * 1.004 * Math.cos(angle), 0, 0);
    parts.push(curve);
  }
  return merged(parts);
}
