import type { Action, Athlete, DribbleMove } from "./types";
import { dir2, type V2 } from "./vec";

type Move = Extract<Action, { kind: "move" }>;

/**
 * How a beaten defender loses it, a hand made reaction per move:
 *
 * * bite: he jumps at the fake and lurches in, as the handler rocks
 *   back on a stepback or between the legs.
 * * freeze: the hesitation stands him up flat footed, and the first
 *   step is gone before his feet move.
 * * slip: thrown the wrong way by a crossover or a behind the back,
 *   the near leg buckling.
 * * ankles: a hard cross drops him, a hand on the floor.
 * * turned: a spin goes by him and twists him round.
 */
export const SHAKE_REACTS = ["bite", "freeze", "slip", "ankles", "turned"] as const;
export type ShakeReact = (typeof SHAKE_REACTS)[number];

const SOFT: Record<DribbleMove, ShakeReact> = {
  stepback: "bite", betweenLegs: "bite", hesitation: "freeze", crossover: "slip", behindBack: "slip", spin: "turned",
};
const HARD: Record<DribbleMove, ShakeReact> = {
  stepback: "bite", betweenLegs: "bite", hesitation: "freeze", crossover: "ankles", behindBack: "ankles", spin: "turned",
};

export function reactFor(move: DribbleMove, hard: boolean): ShakeReact {
  return (hard ? HARD : SOFT)[move];
}

/**
 * Seconds each reaction keeps him out of the play, soft and hard. A bite
 * lasts, so a stepback that wins buys its space; the rest are short, so a
 * beaten man recovers and closes out. Broken ankles stay a highlight.
 */
export const SHAKE_TIME: Record<ShakeReact, readonly [number, number]> = {
  bite: [0.85, 1.05],
  freeze: [0.4, 0.62],
  slip: [0.42, 0.8],
  ankles: [0.95, 1.35],
  turned: [0.5, 0.72],
};

/** How fast he is sent off, in metres a second, soft and hard. */
const SHOVE: Record<ShakeReact, readonly [number, number]> = {
  bite: [1.5, 2.2],
  freeze: [0, 0],
  slip: [1.4, 2.6],
  ankles: [2.2, 2.8],
  turned: [1.4, 2.2],
};

/** He bit on the fake: across from a sideways move, off to the side of one that goes straight by. */
export function wrongWay(act: Move): V2 {
  const forward = act.move === "spin" || act.move === "hesitation";
  if (!forward) return { x: -act.dir.x, z: -act.dir.z };
  const s = -act.side;
  return { x: -act.dir.z * s, z: act.dir.x * s };
}

/** Where the reaction sends him: a bite lunges at the handler, a freeze plants him, the rest throw him the wrong way. */
export function shakeVelocity(react: ShakeReact, d: Athlete, handler: Athlete, act: Move, hard: boolean): V2 {
  const speed = SHOVE[react][hard ? 1 : 0];
  const way = react === "bite" ? dir2(d, handler) : wrongWay(act);
  return { x: way.x * speed, z: way.z * speed };
}

/** Which way he turns on a spin, for the animation: away from the side the handler went. */
export const turnSide = (act: Move): 1 | -1 => (act.side === 1 ? -1 : 1);
