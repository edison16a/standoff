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
  dress.on("neck").post(0.05, 0.1, matte(look.skin), [0, 0.03, 0]);

  // The chest: the top, its hood or collar, and the backpack everyone behind sees.
  const chest = dress.on("chest");
  chest.box(0.4, 0.3, 0.24, top, [0, 0.1, 0], undefined, 0.1);
  chest.sphere(0.075, top, [-0.19, 0.2, 0]).sphere(0.075, top, [0.19, 0.2, 0]);
  if (look.style === "cap") {
    chest.sphere(0.12, top, [0, 0.2, 0.1], [1.3, 0.7, 0.8]);
    for (const x of [-0.045, 0.045]) chest.box(0.012, 0.13, 0.012, matte(look.topTrim), [x, 0.12, -0.125]);
  } else {
    chest.box(0.018, 0.28, 0.01, matte(look.topTrim), [0, 0.1, -0.122]);
    chest.box(0.16, 0.05, 0.2, trim, [0, 0.25, 0], undefined, 0.02);
  }
  chest.box(0.3, 0.36, 0.15, satin(look.pack), [0, 0.08, 0.19], undefined, 0.06);
  chest.box(0.22, 0.14, 0.05, satin(look.packTrim), [0, -0.02, 0.27], undefined, 0.02);
  chest.box(0.26, 0.03, 0.14, satin(look.packTrim), [0, 0.25, 0.19], undefined, 0.01);
  for (const x of [-0.11, 0.11]) chest.box(0.05, 0.3, 0.03, satin(look.packTrim), [x, 0.1, -0.125], undefined, 0.01);
  chest.sphere(0.035, satin(0xffffff), [0.1, -0.12, 0.27]);

  const spine = dress.on("spine");
  spine.box(0.35, 0.24, 0.22, top, [0, 0.09, 0], undefined, 0.08);
  if (look.style === "cap") spine.box(0.24, 0.1, 0.02, satin(0xc92a24), [0, 0.05, -0.11], undefined, 0.01);
  dress.on("hips").box(0.34, 0.16, 0.21, satin(look.pants), [0, -0.03, 0], undefined, 0.07);
  dress.on("hips").box(0.35, 0.035, 0.22, matte(0x2a2d35), [0, 0.04, 0], undefined, 0.01);

  for (const side of ["L", "R"] as const) {
    const sx = side === "L" ? -1 : 1;
    dress.on(`shoulder${side}`).capsule(0.063, 0.17, top, [0, -0.13, 0]);
    const forearm = dress.on(`elbow${side}`);
    forearm.capsule(0.056, 0.14, top, [0, -0.1, 0]);
    if (look.style === "bun") forearm.box(0.02, 0.2, 0.02, trim, [sx * 0.05, -0.09, 0]);
    forearm.post(0.058, 0.05, trim, [0, -0.21, 0]);
    dress.on(`hand${side}`).sphere(0.055, matte(look.skin), [0, -0.045, 0], [0.9, 1.1, 1]);
    const thigh = dress.on(`hip${side}`);
    thigh.capsule(0.083, 0.26, satin(look.pants), [0, -0.19, 0]);
    const shin = dress.on(`knee${side}`);
    shin.capsule(0.072, 0.26, satin(look.pants), [0, -0.19, 0]);
    shin.post(0.078, 0.06, satin(look.pantsTrim), [0, -0.34, 0]);
    sneaker(dress.on(`ankle${side}`), look.shoes, 0, 0.04, -0.05, look.soles);
  }
  return dress.finish();
}
