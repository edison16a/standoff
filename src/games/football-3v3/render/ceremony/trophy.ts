import * as THREE from "three";
import { lacquer, metal, satinMetal } from "@/games/kit/victory";
import { add, hoop, turned } from "@/games/kit/victory/trophies/shapes";

/** Heights of the parts, metres, from the bottom of the plinth. */
const PLINTH = 0.085;
const STAND_TOP = 0.39;
/** The ball: half its length and its fattest radius. */
const BALL_HALF = 0.1;
const BALL_R = 0.058;
/** Kicking position: the nose tipped up this far from level. */
const TILT = 0.5;

/**
 * A football championship trophy in the style of the one the pro league
 * hands out: a regulation football in sterling silver, set on a kicking
 * tee in kicking position, over a tall stand that sweeps in from a wide
 * foot, on a black plinth. About 0.56 m tall with its origin at the
 * bottom centre, like the kit's trophies. `userData.height` is its height.
 */
export function createFootballTrophy(): THREE.Group {
  const group = new THREE.Group();
  group.name = "football-trophy";
  const silver = metal("silver", 0.14);
  const satin = satinMetal("silver");
  // The plinth: black, stepped, with a silver band where a plate would go.
  add(group, turned([[0, 0], [0.1, 0], [0.1, 0.012], [0.094, 0.018], [0.09, PLINTH - 0.01], [0.082, PLINTH], [0, PLINTH]]), lacquer());
  add(group, hoop(0.0915, 0.004, PLINTH * 0.55), silver);
  addStand(group, silver);
  addBall(group, silver, satin);
  group.userData.height = STAND_TOP + BALL_HALF * Math.sin(TILT) + BALL_R + 0.02;
  return group;
}

/**
 * The stand: a wide foot that sweeps in along a concave curve to a slim
 * neck, with three facets cut into it so it catches the light in bands,
 * then the little cup of the kicking tee the ball sits on.
 */
function addStand(group: THREE.Group, silver: THREE.Material): void {
  const profile: [number, number][] = [[0, PLINTH]];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    // Concave: it narrows fast off the foot, then slowly up the neck.
    const r = 0.016 + 0.058 * (1 - t) ** 2.4;
    profile.push([r, PLINTH + t * (STAND_TOP - PLINTH - 0.02)]);
  }
  profile.push([0.022, STAND_TOP - 0.012], [0.03, STAND_TOP], [0.026, STAND_TOP + 0.004], [0, STAND_TOP + 0.004]);
  // Three sides of turning, so the flat faces show as the trophy turns.
  const stand = add(group, turned(profile, 3), silver);
  stand.rotation.y = Math.PI / 6;
  // A smooth sleeve over it softens the facets to a gentle ridge.
  add(group, turned(profile.map(([r, y]) => [r * 0.93, y] as [number, number]), 48), silver);
  add(group, hoop(0.075, 0.004, PLINTH + 0.004), silver);
}

/** The ball in kicking position, with its seams and raised laces. */
function addBall(group: THREE.Group, silver: THREE.MeshPhysicalMaterial, satin: THREE.Material): void {
  const ball = new THREE.Group();
  ball.position.set(0, STAND_TOP + BALL_R * 0.72 + Math.sin(TILT) * BALL_HALF * 0.55, 0);
  ball.rotation.set(0, 0, Math.PI / 2 - TILT);
  const shape: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = -BALL_HALF + 2 * BALL_HALF * t;
    // A football's profile: round in the middle, drawn out to blunt points.
    shape.push([BALL_R * Math.sin(Math.PI * t) ** 0.8 + 0.0015, y]);
  }
  shape[0] = [0, -BALL_HALF];
  shape[24] = [0, BALL_HALF];
  add(ball, turned(shape, 48), silver);
  // The seams between the four panels, running tip to tip.
  for (let k = 0; k < 4; k++) {
    const seam = add(ball, seamGeometry(shape), satin);
    seam.rotation.y = (k * Math.PI) / 2 + Math.PI / 4;
  }
  addLaces(ball, satin);
  group.add(ball);
}

/** A fine ridge following the ball's outline from tip to tip, on its +x side. */
function seamGeometry(shape: readonly [number, number][]): THREE.TubeGeometry {
  const points = shape.map(([r, y]) => new THREE.Vector3(r + 0.0005, y, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.0016, 5, false);
}

/** The lace strip along the top and its stitches across it, standing proud of the leather. */
function addLaces(ball: THREE.Group, satin: THREE.Material): void {
  const up = BALL_R + 0.002;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.09, 0.012), satin);
  strip.position.set(0, 0, up);
  ball.add(strip);
  for (let i = 0; i < 8; i++) {
    const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0042, 0.024), satin);
    stitch.position.set(0, -0.038 + i * 0.011, up + 0.0015);
    stitch.rotation.y = Math.PI / 2;
    ball.add(stitch);
  }
}
