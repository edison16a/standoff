import * as THREE from "three";
import { Dresser, makeRig, type BodyDims, type Rig } from "./rig";
import { sneaker } from "./pickups";
import { dressHead } from "./runner-head";

/** Everything that makes one runner look like themselves. */
export interface Look {
  name: string;
  skin: number;
  hair: number;
  top: number;
  topTrim: number;
  pants: number;
  pantsTrim: number;
  shoes: number;
  soles: number;
  pack: number;
  packTrim: number;
  /** Kai wears a cap backwards. Mia has a bun and a headband. */
  style: "cap" | "bun";
  /** The colour of their hoverboard. */
  board: [number, number];
}

/** Two runners, one per player, in the players' colours: red for one and green for two. */
export const LOOKS: readonly Look[] = [
  {
    name: "Kai",
    skin: 0xe7b48a,
    hair: 0x3b2417,
    top: 0xe8312a,
    topTrim: 0xffffff,
    pants: 0x3a5fb4,
    pantsTrim: 0x7fa2e6,
    shoes: 0xffffff,
    soles: 0xe8312a,
    pack: 0xffc21a,
    packTrim: 0x1f5fd6,
    style: "cap",
    board: [0xff4757, 0xffd21f],
  },
  {
    name: "Mia",
    skin: 0x9a6441,
    hair: 0x1d1426,
    top: 0x22c168,
    topTrim: 0xffffff,
    pants: 0x6a3bd6,
    pantsTrim: 0xb18cff,
    shoes: 0xffd21f,
    soles: 0xffffff,
    pack: 0xff4db8,
    packTrim: 0x2a1d45,
    style: "bun",
    board: [0x2ed573, 0x4db8ff],
  },
];

export const RUNNER_DIMS: BodyDims = {
  foot: 0.1,
  shin: 0.4,
  thigh: 0.4,
  torso: 0.44,
  neck: 0.07,
  head: 0.33,
  shoulderW: 0.38,
  hipW: 0.2,
  upperArm: 0.27,
  forearm: 0.25,
};

const matte = (color: number) => ({ color, finish: "matte" as const });
const satin = (color: number) => ({ color, finish: "satin" as const });

/** Builds a runner: a teen in a hoodie or tracksuit, with a backpack, jeans or leggings and big sneakers. */
export function buildRunner(look: Look): Rig {
  const rig = makeRig(RUNNER_DIMS);
  const dress = new Dresser(rig);
  const top = satin(look.top);
  const trim = satin(look.topTrim);

  dressHead(dress, look);
  dress.on("neck").post(0.058, 0.12, matte(look.skin), [0, 0.03, 0]);

  // The chest: the top, its hood or collar, and the backpack everyone behind sees.
  const chest = dress.on("chest");
  chest.box(0.43, 0.32, 0.26, top, [0, 0.1, 0], undefined, 0.12);
  chest.sphere(0.088, top, [-0.2, 0.19, 0]).sphere(0.088, top, [0.2, 0.19, 0]);
  if (look.style === "cap") {
    // A hoodie: the hood bunched at the back of the neck and drawstrings at the front.
    chest.sphere(0.13, top, [0, 0.22, 0.1], [1.3, 0.7, 0.85], 14);
    for (const x of [-0.045, 0.045]) {
      chest.box(0.014, 0.13, 0.014, matte(look.topTrim), [x, 0.13, -0.132]);
      chest.sphere(0.014, matte(look.topTrim), [x, 0.06, -0.132]);
    }
  } else {
    // A track jacket: a zip, a stand up collar and stripes down the sleeves.
    chest.box(0.02, 0.3, 0.012, gloss(0xd9dde4), [0, 0.1, -0.13]);
    chest.box(0.2, 0.06, 0.2, trim, [0, 0.265, 0], undefined, 0.025);
  }
  // A proper backpack: rounded, with a front pocket, a grab loop and a charm.
  chest.box(0.32, 0.38, 0.17, satin(look.pack), [0, 0.07, 0.2], undefined, 0.08);
  chest.box(0.24, 0.15, 0.06, satin(look.packTrim), [0, -0.03, 0.29], undefined, 0.028);
  chest.box(0.2, 0.02, 0.02, gloss(0xd9dde4), [0, 0.04, 0.315]);
  for (const x of [-1, 1]) chest.box(0.05, 0.16, 0.12, satin(look.packTrim), [x * 0.175, -0.02, 0.2], undefined, 0.02);
  chest.add(new THREE.TorusGeometry(0.045, 0.012, 6, 14, Math.PI), satin(look.packTrim), [0, 0.26, 0.2]);
  for (const x of [-0.11, 0.11]) chest.box(0.055, 0.3, 0.03, satin(look.packTrim), [x, 0.11, -0.135], undefined, 0.012);
  chest.sphere(0.04, gloss(0xffd21f), [0.1, -0.14, 0.3]);

  const spine = dress.on("spine");
  spine.box(0.37, 0.25, 0.24, top, [0, 0.09, 0], undefined, 0.1);
  if (look.style === "cap") spine.box(0.24, 0.1, 0.02, satin(shadeOf(look.top, 0.8)), [0, 0.05, -0.12], undefined, 0.01);
  const hips = dress.on("hips");
  hips.box(0.36, 0.17, 0.23, satin(look.pants), [0, -0.03, 0], undefined, 0.08);
  hips.box(0.37, 0.04, 0.24, matte(0x2a2d35), [0, 0.045, 0], undefined, 0.012);
  hips.box(0.05, 0.035, 0.02, gloss(0xd9dde4), [0, 0.045, -0.122]);

  for (const side of ["L", "R"] as const) {
    const sx = side === "L" ? -1 : 1;
    const upper = dress.on(`shoulder${side}`);
    upper.capsule(0.072, 0.16, top, [0, -0.13, 0]);
    const forearm = dress.on(`elbow${side}`);
    forearm.sphere(0.07, top, [0, 0, 0], [1, 1, 1], 10);
    forearm.capsule(0.064, 0.13, top, [0, -0.1, 0]);
    if (look.style === "bun") {
      upper.box(0.022, 0.22, 0.02, trim, [sx * 0.068, -0.13, 0]);
      forearm.box(0.022, 0.18, 0.02, trim, [sx * 0.06, -0.09, 0]);
    }
    forearm.post(0.068, 0.05, trim, [0, -0.21, 0]);
    // Big mitten hands with a thumb, easy to read in motion.
    const hand = dress.on(`hand${side}`);
    hand.sphere(0.066, matte(look.skin), [0, -0.05, 0], [0.9, 1.1, 1], 12);
    hand.sphere(0.03, matte(look.skin), [-sx * 0.045, -0.03, -0.035], [1, 1.3, 1], 8);
    const thigh = dress.on(`hip${side}`);
    thigh.capsule(0.095, 0.24, satin(look.pants), [0, -0.19, 0]);
    const shin = dress.on(`knee${side}`);
    shin.sphere(0.088, satin(look.pants), [0, 0, 0], [1, 1, 1], 10);
    shin.capsule(0.082, 0.24, satin(look.pants), [0, -0.18, 0]);
    // Rolled up cuffs over the sneakers.
    shin.post(0.092, 0.07, satin(look.pantsTrim), [0, -0.33, 0], 14, 0.088);
    sneaker(dress.on(`ankle${side}`), look.shoes, 0, 0.04, -0.05, look.soles, look.pack);
  }
  return dress.finish();
}

const gloss = (color: number) => ({ color, finish: "gloss" as const });

function shadeOf(color: number, k: number): number {
  return new THREE.Color(color).multiplyScalar(k).getHex();
}
