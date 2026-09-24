import type { ZombieKind } from "../../../engine/zombie-kinds";
import { dressHead, dressLimbs, dressTorso } from "./anatomy";
import { Dresser, makeRig, standardProxies, type BodyDims, type Rig } from "./rig";
import { zombieMaterials } from "./zombie-materials";

const MAN: BodyDims = {
  thigh: 0.44, shin: 0.42, foot: 0.08, torso: 0.58, torsoW: 0.42, torsoD: 0.24, shoulderW: 0.5, hipW: 0.22,
  upperArm: 0.3, forearm: 0.27, hand: 0.11, neck: 0.08, head: 0.27, arm: 0.11, leg: 0.15,
};

const DIMS: Record<"walker" | "runner" | "brute" | "armored", BodyDims> = {
  walker: MAN,
  runner: { ...MAN, torsoW: 0.36, torsoD: 0.2, shoulderW: 0.44, arm: 0.09, leg: 0.12, thigh: 0.45, shin: 0.44, upperArm: 0.32, forearm: 0.29 },
  brute: { ...MAN, thigh: 0.48, shin: 0.44, torso: 0.66, torsoW: 0.62, torsoD: 0.38, shoulderW: 0.76, hipW: 0.3, arm: 0.17, leg: 0.21, upperArm: 0.34, forearm: 0.31, hand: 0.14, head: 0.29, neck: 0.05 },
  armored: { ...MAN, torsoW: 0.46, torsoD: 0.28, shoulderW: 0.54, arm: 0.12, leg: 0.16 },
};

/** A small repeatable random source, so a zombie looks the same every time it is built. */
export function seededRand(seed: number): () => number {
  let s = Math.floor(seed * 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * The ordinary dead. Walkers are townsfolk in torn clothes, runners are
 * thin and barefoot, brutes are huge and bare chested with their ribs
 * showing, and riot zombies still wear helmets, vests and pads.
 */
export function buildCommoner(kind: Extract<ZombieKind, "walker" | "runner" | "brute" | "armored">, seed: number): Rig {
  const m = zombieMaterials();
  const rand = seededRand(seed);
  const d = DIMS[kind];
  const rig = makeRig(d);
  const dress = new Dresser(rig);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const skin = pick(m.skins);

  if (kind === "walker") {
    const shirt = pick(m.shirts);
    dressHead(dress, d, m, { skin, hair: pick(["short", "messy", "none"] as const), rotten: rand() < 0.5 }, rand);
    dressTorso(dress, d, m, { skin, shirt, pants: pick(m.pants), ribs: rand() < 0.25, belly: rand() < 0.3 ? 0.4 : 0 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: rand() < 0.6 ? shirt : null, pants: pick(m.pants), shoes: rand() < 0.8 }, rand);
  } else if (kind === "runner") {
    dressHead(dress, d, m, { skin, hair: "messy", rotten: true }, rand);
    dressTorso(dress, d, m, { skin, shirt: rand() < 0.5 ? pick(m.shirts) : null, pants: pick(m.pants), ribs: true, belly: 0 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: null, pants: pick(m.pants), shoes: false }, rand);
  } else if (kind === "brute") {
    dressHead(dress, d, m, { skin, hair: "stitched", rotten: true }, rand);
    dressTorso(dress, d, m, { skin, shirt: null, pants: pick(m.pants), ribs: true, belly: 0.8 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: null, pants: pick(m.pants), shoes: true }, rand);
    // Lumps of muscle on the shoulders and a chain wrapped round one forearm.
    for (const s of ["L", "R"] as const) dress.on(`shoulder${s}`).sphere(d.arm * 0.75, skin, [0, -0.02, 0], [1.1, 0.9, 1], 10);
    for (let i = 0; i < 3; i++) dress.on("elbowR").box(d.arm * 1.08, 0.025, d.arm * 1.08, m.steel, [0, -0.08 - i * 0.05, 0], [0, i * 0.4, 0.15]);
  } else {
    dressRiot(dress, d, skin, rand);
  }
  standardProxies(dress, d);
  dress.finish();
  return rig;
}

/** Riot gear: helmet with the visor up, a plated vest, shoulder and knee pads. */
function dressRiot(dress: Dresser, d: BodyDims, skin: ReturnType<typeof zombieMaterials>["skins"][number], rand: () => number): void {
  const m = zombieMaterials();
  const shirt = m.armorDark;
  dressHead(dress, d, m, { skin, hair: "none", rotten: rand() < 0.5 }, rand);
  dressTorso(dress, d, m, { skin, shirt, pants: m.armorDark, ribs: false, belly: 0 }, rand);
  dressLimbs(dress, d, m, { skin, sleeve: shirt, pants: m.armorDark, shoes: true }, rand);
  const h = d.head;
  const head = dress.on("head");
  head.box(h * 1.02, h * 0.5, h * 1.04, m.armor, [0, h * 0.86, -h * 0.02], undefined, h * 0.2);
  head.box(h * 1.06, h * 0.08, h * 1.08, m.armorDark, [0, h * 0.64, -h * 0.02], undefined, h * 0.03);
  // The visor is pushed up, which is why the face is open to a head shot.
  head.box(h * 0.94, h * 0.34, h * 0.05, m.visor, [0, h * 1.02, h * 0.46], [-0.9, 0, 0]);
  const vest = dress.on("spine");
  vest.box(d.torsoW * 1.08, d.torso * 0.72, d.torsoD * 1.18, m.armor, [0, d.torso * 0.56, 0], undefined, 0.04);
  for (let i = 0; i < 3; i++) vest.box(d.torsoW * 0.28, 0.1, 0.05, m.armorDark, [(i - 1) * d.torsoW * 0.3, d.torso * 0.36, d.torsoD * 0.62], undefined, 0.01);
  vest.box(d.torsoW * 0.6, 0.08, 0.02, m.bone, [0, d.torso * 0.78, d.torsoD * 0.6]);
  for (const s of ["L", "R"] as const) {
    dress.on(`shoulder${s}`).box(d.arm * 1.6, d.arm * 1.1, d.arm * 1.6, m.armor, [0, -0.02, 0], undefined, d.arm * 0.4);
    dress.on(`knee${s}`).box(d.leg * 1.2, d.leg * 1.1, d.leg * 0.5, m.armor, [0, -0.02, d.leg * 0.4], undefined, 0.02);
    dress.on(`elbow${s}`).box(d.arm * 1.1, d.forearm * 0.6, d.arm * 1.15, m.armor, [0, -d.forearm * 0.45, 0], undefined, 0.02);
  }
}
