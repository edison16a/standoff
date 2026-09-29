import * as THREE from "three";
import { lacquer, metal, satinMetal, type Metal } from "./materials";
import { add, hoop, speckle, strand, turned } from "./shapes";

/** Heights of the parts, metres, from the bottom of the plinth. */
const PLINTH = 0.07;
const NET_TOP = 0.46;
const NET_BOTTOM = 0.3;
const RIM_R = 0.105;
const BALL_R = 0.115;

/**
 * A basketball championship trophy in the style of the one the pro
 * league hands out: a gold ball dunked into a rim, a diamond net that
 * tapers down into a tall slender column, on a black plinth. About 0.6 m
 * tall with its origin at the bottom centre. Scale it to taste.
 */
export function createBasketballTrophy(options: { metal?: Metal } = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "basketball-trophy";
  const gold = metal(options.metal ?? "gold");
  const satin = satinMetal(options.metal ?? "gold");
  add(group, turned([[0, 0], [0.13, 0], [0.13, 0.05], [0.12, PLINTH], [0, PLINTH]]), lacquer());
  // A gold band round the plinth, and the stepped foot the column rises from.
  add(group, hoop(0.131, 0.006, 0.035), gold);
  add(group, turned([[0, PLINTH], [0.1, PLINTH], [0.1, PLINTH + 0.012], [0.085, PLINTH + 0.02], [0.07, PLINTH + 0.03], [0, PLINTH + 0.03]]), gold);
  // The column narrows as it rises, then flares into the bottom of the net.
  const column: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = PLINTH + 0.03 + t * (NET_BOTTOM - PLINTH - 0.03);
    column.push([0.058 - 0.036 * Math.sin(t * Math.PI * 0.55) + 0.012 * t * t * t, y]);
  }
  column.push([0, NET_BOTTOM]);
  add(group, turned([[0, PLINTH + 0.03], ...column]), gold);
  add(group, hoop(0.036, 0.005, NET_BOTTOM - 0.004), gold);
  addNet(group, satin);
  add(group, hoop(RIM_R, 0.008, NET_TOP), gold);
  addBall(group, gold, satin);
  group.userData.height = NET_TOP + BALL_R * 1.55;
  return group;
}

/** Netting: strands spiral both ways from the rim down to the collar, crossing in diamonds. */
function addNet(group: THREE.Group, material: THREE.Material): void {
  const strands = 16;
  const rows = 10;
  const parts: THREE.BufferGeometry[] = [];
  for (const way of [1, -1]) {
    for (let k = 0; k < strands; k++) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= rows; i++) {
        const t = i / rows;
        const y = NET_TOP - t * (NET_TOP - NET_BOTTOM);
        // The net pulls in toward its bottom like a real one hanging from a rim.
        const r = RIM_R * (1 - 0.66 * Math.sin((t * Math.PI) / 2)) + 0.004;
        const a = ((k + way * t * 1.5) / strands) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      parts.push(strand(points, 0.0028, 40));
    }
  }
  for (const geometry of parts) add(group, geometry, material);
}

/** The ball sits a little into the rim, tilted, with its seams cut in. */
function addBall(group: THREE.Group, gold: THREE.MeshPhysicalMaterial, seam: THREE.Material): void {
  const ball = new THREE.Group();
  ball.position.set(0, NET_TOP + BALL_R * 0.55, 0);
  ball.rotation.set(0.35, 0.5, 0.25);
  const pebbled = gold.clone();
  const bump = speckle(256, 11);
  if (bump) {
    bump.repeat.set(6, 3);
    pebbled.bumpMap = bump;
    pebbled.bumpScale = 0.6;
  }
  add(ball, new THREE.SphereGeometry(BALL_R, 64, 48), pebbled);
  const tube = 0.0032;
  const ring = (radius: number) => new THREE.TorusGeometry(radius, tube, 8, 96);
  add(ball, ring(BALL_R), seam).rotation.x = Math.PI / 2;
  add(ball, ring(BALL_R), seam);
  // The two curved seams run beside the upright one, each a smaller circle on the sphere.
  const off = BALL_R * 0.62;
  for (const side of [-1, 1]) add(ball, ring(Math.sqrt(BALL_R * BALL_R - off * off)), seam).position.z = side * off;
  group.add(ball);
}
