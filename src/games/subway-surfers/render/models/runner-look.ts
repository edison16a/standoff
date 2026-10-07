import type { Weave } from "../cloth";
import type { Finish } from "../mesh-builder";
import type { BodyDims } from "./rig";

/** Everything that makes one runner look like themselves: the colours of each piece of the outfit. */
export interface Look {
  name: string;
  skin: number;
  hair: number;
  eyes: number;
  /** The cap's crown, its front panels, and the badge's colours. */
  cap: number;
  capFront: number;
  /** The hoodie under the vest, and its ribbed cuffs and hem. */
  hoodie: number;
  hoodieRib: number;
  vest: number;
  /** Thread for the stitching on the denim. */
  thread: number;
  bandana: number;
  jeans: number;
  shoes: number;
  soles: number;
  /** Laces and the flash down each side of the shoe. */
  accent: number;
  /** The colour of their hoverboard. */
  board: [number, number];
}

/**
 * Zip, the runner: a cheeky kid in a red and yellow cap, a grey hoodie
 * under a pale denim vest, a red neckerchief, light jeans and big white
 * high tops on lime soles. A second palette is kept as a spare.
 */
export const LOOKS: readonly Look[] = [
  {
    name: "Zip",
    skin: 0xf0be96,
    hair: 0x7a4521,
    eyes: 0x6b4423,
    cap: 0xe8302c,
    capFront: 0xffc928,
    hoodie: 0xc9cdd5,
    hoodieRib: 0xa9aeb9,
    vest: 0x8cc0ec,
    thread: 0xf2b34a,
    bandana: 0xdf2a2a,
    jeans: 0x7aa7dc,
    shoes: 0xf7f7f4,
    soles: 0x8be02a,
    accent: 0x8be02a,
    board: [0x2fa8ff, 0xffc21a],
  },
  {
    name: "Rae",
    skin: 0x9a6441,
    hair: 0x1d1426,
    eyes: 0x3b2414,
    cap: 0x2a6fe0,
    capFront: 0xff4db8,
    hoodie: 0xf3ead8,
    hoodieRib: 0xd8ccb4,
    vest: 0x3e5f9a,
    thread: 0xffd06a,
    bandana: 0xffb21f,
    jeans: 0x2f3f66,
    shoes: 0xffffff,
    soles: 0xff4db8,
    accent: 0x3ad6ff,
    board: [0x2ed573, 0x4db8ff],
  },
];

/** Cartoon proportions: a big head, a slim body and long enough legs for a proper stride. Metres. */
export const RUNNER_DIMS: BodyDims = {
  foot: 0.13,
  shin: 0.36,
  thigh: 0.37,
  torso: 0.4,
  neck: 0.06,
  head: 0.4,
  shoulderW: 0.38,
  hipW: 0.22,
  upperArm: 0.25,
  forearm: 0.22,
};

/** The head's radius: big, as cartoon runners have. Its middle sits this high over the head joint. */
export const HEAD_R = 0.2;
export const HEAD_Y = 0.19;

type Coat ={ color: number; finish: Finish; weave?: Weave };

export const matte = (color: number): Coat => ({ color, finish: "matte" });
export const satin = (color: number): Coat => ({ color, finish: "satin" });
export const gloss = (color: number): Coat => ({ color, finish: "gloss" });
export const denim = (color: number): Coat => ({ color, finish: "satin", weave: "denim" });
export const fleece = (color: number): Coat => ({ color, finish: "matte", weave: "fleece" });

/** A colour a little darker or lighter, for seams, shadows in folds and inner linings. */
export function shadeOf(color: number, k: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * k));
  const b = Math.min(255, Math.round((color & 255) * k));
  return (r << 16) | (g << 8) | b;
}
