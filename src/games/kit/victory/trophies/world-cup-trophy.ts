import * as THREE from "three";
import { globeTexture } from "./globe-texture";
import { malachite, metal, satinMetal, type Metal } from "./materials";
import { add, taperedStrand, turned } from "./shapes";

const BASE_TOP = 0.1;
const WAIST = 0.2;
const GLOBE_Y = 0.305;
const GLOBE_R = 0.066;

/**
 * A football world trophy in the style of the famous one: two gold
 * figures spiral up out of the base, twisting round each other, and
 * their arms hold up a globe. The base has two green stone bands.
 * About 0.37 m tall, origin at the bottom centre.
 */
export function createWorldCupTrophy(options: { metal?: Metal } = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "world-cup-trophy";
  const gold = metal(options.metal ?? "gold", 0.2);
  const satin = satinMetal(options.metal ?? "gold");
  const stone = malachite();
  // The base: gold foot, two green bands with a gold band between and over them.
  add(group, turned([[0, 0], [0.078, 0], [0.078, 0.012], [0.074, 0.016], [0, 0.016]]), gold);
  add(group, turned([[0.0725, 0.016], [0.071, 0.04], [0, 0.04], [0, 0.016]]), stone);
  add(group, turned([[0, 0.04], [0.072, 0.04], [0.072, 0.047], [0, 0.047]]), gold);
  add(group, turned([[0.0695, 0.047], [0.067, 0.071], [0, 0.071], [0, 0.047]]), stone);
  add(group, turned([[0, 0.071], [0.068, 0.071], [0.066, 0.08], [0.058, BASE_TOP], [0, BASE_TOP]]), gold);
  // The core the figures twist round: in at the waist, out again to the globe.
  add(group, turned(hourglass()), satin);
  for (const figure of [0, 1]) addFigure(group, figure * Math.PI, gold);
  const globe = new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 1, roughness: 0.25, clearcoat: 0.5, envMapIntensity: 1.3 });
  const map = globeTexture();
  if (map) {
    globe.map = map;
    globe.bumpMap = map;
    globe.bumpScale = 1.2;
  } else globe.color.set("#f6c453");
  const ball = add(group, new THREE.SphereGeometry(GLOBE_R, 64, 48), globe);
  ball.position.y = GLOBE_Y;
  ball.rotation.set(0.4, 0.8, 0);
  group.userData.height = GLOBE_Y + GLOBE_R;
  return group;
}

function hourglass(): [number, number][] {
  const points: [number, number][] = [[0, BASE_TOP]];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = BASE_TOP + t * (GLOBE_Y - BASE_TOP - 0.02);
    points.push([radiusAt(y), y]);
  }
  points.push([0, GLOBE_Y - 0.02]);
  return points;
}

/**
 * One figure: three flowing strands that spiral up round the core, the
 * body's sweep, and two arms that rise out of them to cup the globe.
 */
function addFigure(group: THREE.Group, turn: number, gold: THREE.Material): void {
  for (let s = 0; s < 3; s++) {
    const points: THREE.Vector3[] = [];
    const start = turn + s * 0.42;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const y = BASE_TOP - 0.005 + t * (GLOBE_Y - BASE_TOP - 0.03);
      const r = radiusAt(y) + 0.008;
      const a = start + t * Math.PI * 1.15;
      points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    // The middle strand is the body, the widest; the outer two are the swirl of the limbs.
    const width = s === 1 ? 0.017 : 0.011;
    add(group, taperedStrand(points, (t) => width * (0.75 + 0.5 * Math.sin(t * Math.PI))), gold);
  }
  for (const side of [-1, 1]) {
    const a0 = turn + 0.42 + Math.PI * 1.15 + side * 0.3;
    const a1 = a0 + side * 0.9;
    const points = [0, 0.35, 0.7, 1].map((t) => {
      const a = a0 + (a1 - a0) * t;
      const lift = Math.sin(t * Math.PI * 0.5);
      // The hand ends on the globe's shoulder, reaching round it.
      const r = (1 - lift) * (radiusAt(GLOBE_Y - 0.035) + 0.01) + lift * GLOBE_R * 0.92;
      const y = GLOBE_Y - 0.04 + lift * 0.045;
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    });
    add(group, taperedStrand(points, (t) => 0.009 * (1 - 0.45 * t), 24, 8), gold);
  }
  // A head under the globe, where the figure looks out.
  const head = add(group, new THREE.SphereGeometry(0.012, 20, 14), gold);
  const a = turn + 0.42 + Math.PI * 1.15;
  head.position.set(Math.cos(a) * 0.058, GLOBE_Y - 0.052, Math.sin(a) * 0.058);
}

/** The core's radius at a height, matching `hourglass`. */
function radiusAt(y: number): number {
  const narrow = Math.cos(((y - WAIST) / (GLOBE_Y - BASE_TOP)) * Math.PI * 1.3);
  return 0.052 - 0.028 * Math.max(0, narrow);
}
