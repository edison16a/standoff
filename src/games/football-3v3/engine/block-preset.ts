import type { PlayCall } from "./types";

/**
 * Line play is authored too. Every pair of linemen is in one block
 * move at a time, picked by the game logic at the snap and again with
 * every new shove, from the call and from who is winning:
 *
 * engage, the punch off the snap and the hand fight for the inside;
 * pass, the blocker's kick slide back into his set with the rusher
 * bull rushing him; drive, the blocker firing out low and walking his
 * man back; anchor, the blocker sitting his hips down against a rusher
 * who is winning; pancake, the blocker putting his man flat on his
 * back; shed, the rusher ripping past and going after the ball.
 *
 * A pancake and a shed break the pair up: the men play on alone
 * (line-free.ts). The pair's leg drive still moves the bodies.
 */
export const BLOCK_KINDS = ["engage", "pass", "drive", "anchor", "pancake", "shed"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/** One pair's move: which, and seconds into it. */
export interface BlockMove {
  kind: BlockKind;
  t: number;
}

export const BLOCK_PICK = {
  /** Seconds after the snap the punch and hand fight last. */
  engage: 0.45,
  /** A shove this strong toward the backfield has the blocker sitting down to anchor. */
  anchor: 0.5,
  /** One this strong the other way has him driving his man. */
  drive: -0.4,
  /** A rusher shoving this hard this long after the snap may rip past, this often. */
  shed: 0.86,
  shedAfter: 1.8,
  shedOdds: 0.18,
  /** On a run, a blocker winning this hard may put his man on his back, this often. */
  pancake: -0.45,
  pancakeAfter: 0.6,
  pancakeOdds: 0.4,
} as const;

/** What a pair is doing at a shove. Pure: `roll` is a chance from 0 to 1. Positive `surge` is the rusher winning. */
export function blockKindFor(call: PlayCall, since: number, surge: number, roll: number): BlockKind {
  if (since < BLOCK_PICK.engage) return "engage";
  if (call === "run" && surge <= BLOCK_PICK.pancake && since >= BLOCK_PICK.pancakeAfter && roll < BLOCK_PICK.pancakeOdds) return "pancake";
  if (call !== "kick" && surge >= BLOCK_PICK.shed && since >= BLOCK_PICK.shedAfter && roll < BLOCK_PICK.shedOdds) return "shed";
  if (surge >= BLOCK_PICK.anchor) return "anchor";
  if (surge <= BLOCK_PICK.drive) return "drive";
  return call === "run" ? "drive" : "pass";
}

/** Moves that leave the two men apart. */
export const breaksPair = (k: BlockKind): boolean => k === "pancake" || k === "shed";

/** Seconds a blocker stands over a man he pancaked, and a beaten blocker stumbles, before they play on. */
export const LOOSE = { pancakeDown: 1.9, overHim: 0.9, beaten: 0.8 } as const;
