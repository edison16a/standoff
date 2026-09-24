import * as THREE from "three";
import { MeshBuilder } from "../mesh-builder";
import { Dresser, makeRig, type BodyDims, type Rig } from "./rig";
import { sneaker } from "./pickups";

const matte = (color: number) => ({ color, finish: "matte" as const });
const satin = (color: number) => ({ color, finish: "satin" as const });
const gloss = (color: number) => ({ color, finish: "gloss" as const });

const GUARD_DIMS: BodyDims = {
  foot: 0.1,
  shin: 0.42,
  thigh: 0.42,
  torso: 0.52,
  neck: 0.06,
  head: 0.3,
  shoulderW: 0.5,
  hipW: 0.26,
  upperArm: 0.3,
  forearm: 0.28,
};

const UNIFORM = 0x2b4c9b;
const DARK = 0x1c2a52;
const SKIN = 0xf0b894;

/** The yard guard: a stout man in a blue uniform and peaked cap, with a whistle and a moustache. */
export function buildGuard(): Rig {
  const rig = makeRig(GUARD_DIMS);
  const dress = new Dresser(rig);
  const uniform = satin(UNIFORM);
  const chest = dress.on("chest");
  chest.box(0.52, 0.36, 0.34, uniform, [0, 0.12, 0], undefined, 0.14);
  chest.sphere(0.1, uniform, [-0.25, 0.24, 0]).sphere(0.1, uniform, [0.25, 0.24, 0]);
  chest.box(0.1, 0.06, 0.02, gloss(0xffd21f), [0.12, 0.2, -0.17], undefined, 0.01);
  chest.box(0.02, 0.3, 0.01, matte(0xffd21f), [0, 0.1, -0.172]);
  for (const y of [0.02, 0.12, 0.22]) chest.sphere(0.018, gloss(0xffd21f), [0, y, -0.175]);
  // Hi-vis stripes, so he reads from far down the track.
  chest.box(0.54, 0.05, 0.36, satin(0xd8ff3a), [0, 0.02, 0], undefined, 0.02);
  const spine = dress.on("spine");
  spine.sphere(0.25, uniform, [0, 0.08, -0.04], [1.02, 0.9, 1]);
  spine.box(0.48, 0.07, 0.4, matte(0x1d1d24), [0, -0.02, -0.02], undefined, 0.03);
  spine.box(0.08, 0.06, 0.02, gloss(0xd9dde4), [0, -0.02, -0.22]);
  dress.on("hips").box(0.42, 0.18, 0.3, satin(DARK), [0, -0.04, 0], undefined, 0.08);
  dress.on("neck").post(0.07, 0.1, matte(SKIN), [0, 0.02, 0]);

  const head = dress.on("head");
  const cy = 0.14;
  head.sphere(0.15, matte(SKIN), [0, cy, 0], [1, 1.05, 1], 20);
  head.sphere(0.035, matte(0xf29a8c), [0, cy - 0.01, -0.15], [1, 0.9, 1], 10);
  head.sphere(0.06, matte(0x6b4a33), [0, cy - 0.06, -0.125], [1.5, 0.5, 0.6], 12);
  for (const x of [-1, 1]) {
    head.sphere(0.018, gloss(0x1b1320), [x * 0.05, cy + 0.035, -0.135], [1, 1, 0.6], 8);
    head.box(0.06, 0.02, 0.02, satin(0x5a3a26), [x * 0.055, cy + 0.07, -0.132], [0, 0, x * 0.25], 0.008);
    head.sphere(0.036, matte(SKIN), [x * 0.15, cy, 0], [0.6, 1, 0.9], 8);
  }
  // The peaked cap with its badge.
  head.post(0.16, 0.1, satin(DARK), [0, cy + 0.12, 0], 20, 0.17);
  head.box(0.24, 0.025, 0.14, gloss(0x111111), [0, cy + 0.07, -0.15], [0.15, 0, 0], 0.01);
  head.post(0.165, 0.03, satin(0xffd21f), [0, cy + 0.08, 0], 20);
  head.sphere(0.03, gloss(0xffd21f), [0, cy + 0.14, -0.16], [1, 1, 0.4]);

  for (const side of ["L", "R"] as const) {
    dress.on(`shoulder${side}`).capsule(0.085, 0.2, uniform, [0, -0.15, 0]);
    const forearm = dress.on(`elbow${side}`);
    forearm.sphere(0.08, uniform, [0, 0, 0], [1, 1, 1], 10);
    forearm.capsule(0.075, 0.17, uniform, [0, -0.12, 0]);
    forearm.post(0.08, 0.04, satin(0xd8ff3a), [0, -0.22, 0]);
    dress.on(`hand${side}`).sphere(0.075, matte(SKIN), [0, -0.055, 0], [0.9, 1.1, 1], 12);
    dress.on(`hip${side}`).capsule(0.11, 0.24, satin(DARK), [0, -0.2, 0]);
    const shin = dress.on(`knee${side}`);
    shin.sphere(0.095, satin(DARK), [0, 0, 0], [1, 1, 1], 10);
    shin.capsule(0.09, 0.26, satin(DARK), [0, -0.2, 0]);
    sneaker(dress.on(`ankle${side}`), 0x1b1b22, 0, 0.04, -0.05, 0x1b1b22);
  }
  // A whistle on a cord, in his right hand.
  dress.on("handR").tube(0.025, 0.08, gloss(0xd9dde4), [0, -0.09, -0.05], 10);
  return dress.finish();
}

export interface Dog {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
}

/** The guard's dog: a scruffy brown terrier that bounds along at his side. */
export function buildDog(): Dog {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.42;
  root.add(body);
  const fur = matte(0x9a5b2e);
  const light = matte(0xe6c49a);
  const b = new MeshBuilder();
  b.sphere(0.2, fur, [0, 0, 0], [0.9, 0.85, 1.6], 16);
  b.sphere(0.13, light, [0, -0.07, -0.12], [1, 0.7, 1.4], 12);
  b.post(0.07, 0.06, matte(0xe8312a), [0, 0.1, -0.26], 12, 0.07, [0.9, 0, 0]);
  body.add(b.build("dog-body"));

  const head = new THREE.Group();
  head.position.set(0, 0.16, -0.32);
  body.add(head);
  const h = new MeshBuilder();
  h.sphere(0.14, fur, [0, 0.04, 0], [1, 0.95, 1], 14);
  h.sphere(0.08, light, [0, -0.01, -0.13], [0.9, 0.75, 1.2], 12);
  h.sphere(0.03, gloss(0x111111), [0, 0.01, -0.23]);
  h.box(0.06, 0.012, 0.1, matte(0xff6f8a), [0, -0.07, -0.15], [0.3, 0, 0], 0.005);
  for (const x of [-1, 1]) {
    h.sphere(0.022, gloss(0x111111), [x * 0.055, 0.08, -0.11], [1, 1, 0.6]);
    h.box(0.08, 0.14, 0.03, matte(0x5c3218), [x * 0.11, 0.1, 0.02], [0.3, 0, x * 0.6], 0.015);
  }
  head.add(h.build("dog-head"));

  const tail = new THREE.Group();
  tail.position.set(0, 0.1, 0.3);
  body.add(tail);
  tail.add(new MeshBuilder().capsule(0.03, 0.18, fur, [0, 0.1, 0.03], [0.5, 0, 0]).build("dog-tail"));

  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-0.1, -0.2], [0.1, -0.2], [-0.1, 0.2], [0.1, 0.2]] as const) {
    const leg = new THREE.Group();
    leg.position.set(x, -0.05, z);
    body.add(leg);
    const l = new MeshBuilder();
    l.capsule(0.045, 0.22, fur, [0, -0.17, 0]);
    l.sphere(0.05, light, [0, -0.32, -0.02], [1, 0.7, 1.3]);
    leg.add(l.build("dog-leg"));
    legs.push(leg);
  }
  return { root, body, head, tail, legs };
}
