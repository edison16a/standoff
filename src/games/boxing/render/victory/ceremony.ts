import { CORNERS } from "../../engine/footwork";
import { other, type FighterId, type Spot } from "../../engine/types";

/** Where the ceremony starts: who won, where both boxers stand, and whether the loser is down. */
export interface CeremonySetup {
  winner: FighterId;
  from: readonly [Spot, Spot];
  loserDown: boolean;
  /** Which way the winner faces once in the middle: toward where the camera starts. */
  showFacing: number;
}

/** One moment of the ceremony, for the animation. */
export interface CeremonyFrame {
  spots: [Spot, Spot];
  facing: [number, number];
  /** The belt is in the winner's hands. */
  holding: boolean;
  /** 0 the belt held low in front, 1 pressed high overhead. */
  lift: number;
  /** The knees dip before the press, 0 to 1. */
  dip: number;
  /** Small pumps of the belt once it is up, 0 to 1. */
  pump: number;
  /** The loser getting up from the canvas, 0 down to 1 standing. */
  rise: number;
  /** The loser slumped back on the ropes in their corner, 0 to 1. */
  ropes: number;
  /** Seconds since the belt reached the top, or a negative number before. */
  sinceLift: number;
}

const WALK = 1.05;
const TIRED_WALK = 0.7;
const RISE_S = 1.6;
const TURN_S = 0.6;
/** From the loser's corner post out to where they lean on the ropes. */
const ROPES_IN = 0.45;
/** How far the winner keeps from the loser, who may be lying full length on the canvas. */
const CLEAR = 1.4;

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Turns from one angle toward another the short way round. */
function turn(from: number, to: number, t: number): number {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * smooth(t);
}

/** A walk from a to b starting at `start` seconds: where, how far along, and when it ends. */
function walk(a: Spot, b: Spot, start: number, speed: number, t: number): { at: Spot; k: number; end: number; heading: number } {
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const length = Math.max(0.6, distance / speed);
  const k = smooth((t - start) / length);
  return { at: { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }, k, end: start + length, heading: Math.atan2(b.x - a.x, b.z - a.z) };
}

/**
 * Where the winner stands for the belt: the middle of the ring, unless
 * the loser is still near it. Then a clear step away on the winner's own
 * side, so nobody walks through a boxer lying on the canvas.
 */
export function stageSpot(setup: CeremonySetup): Spot {
  const loser = setup.from[other(setup.winner)];
  const winner = setup.from[setup.winner];
  if (Math.hypot(loser.x, loser.z) >= CLEAR) return { x: 0, z: 0 };
  const dx = winner.x - loser.x;
  const dz = winner.z - loser.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: loser.x + (dx / d) * CLEAR, z: loser.z + (dz / d) * CLEAR };
}

/**
 * The winner's ceremony, `t` seconds in. The winner walks to the middle
 * of the ring and turns to the camera, takes the belt in both hands,
 * dips at the knees and presses it high overhead, then holds it up with
 * small pumps and turns slowly to the crowd. The loser, getting up first
 * if they were knocked down, trudges back to their corner and slumps on
 * the ropes. Pure, so it is the same at any frame rate and in tests.
 */
export function ceremonyAt(setup: CeremonySetup, t: number): CeremonyFrame {
  const w = setup.winner;
  const l = other(w);
  const toMiddle = walk(setup.from[w], stageSpot(setup), 0.3, WALK, t);
  const arrived = toMiddle.end;
  const winnerFacing = turn(toMiddle.heading, setup.showFacing, (t - arrived) / TURN_S);
  const beltAt = arrived + 0.4;
  const liftAt = beltAt + 1.1;
  const liftEnd = liftAt + 1.1;
  const sinceLift = t - liftEnd;
  // Once up, the champion turns slowly one way and back, showing the belt round the arena.
  const show = sinceLift > 0 ? Math.sin(sinceLift * 0.45) * 0.5 * smooth(sinceLift / 2) : 0;

  const rise = setup.loserDown ? smooth((t - 0.2) / RISE_S) : 1;
  const corner = CORNERS[l];
  const inward = Math.hypot(corner.x, corner.z) || 1;
  const ropesSpot = { x: corner.x - (corner.x / inward) * ROPES_IN, z: corner.z - (corner.z / inward) * ROPES_IN };
  const trudge = walk(setup.from[l], ropesSpot, setup.loserDown ? 0.2 + RISE_S + 0.3 : 0.4, TIRED_WALK, t);
  const faceCentre = Math.atan2(-ropesSpot.x, -ropesSpot.z);
  const loserFacing = trudge.k < 1 ? trudge.heading : turn(trudge.heading, faceCentre, (t - trudge.end) / TURN_S);

  const spots: [Spot, Spot] = [setup.from[0], setup.from[1]];
  const facing: [number, number] = [0, 0];
  spots[w] = toMiddle.at;
  facing[w] = winnerFacing + show;
  spots[l] = trudge.at;
  facing[l] = loserFacing;
  return {
    spots,
    facing,
    holding: t >= beltAt,
    lift: smooth((t - liftAt - 0.25) / 0.85),
    dip: Math.sin(Math.PI * Math.min(1, Math.max(0, (t - liftAt) / 0.6))) * (t < liftAt + 0.6 ? 1 : 0),
    pump: sinceLift > 0.6 ? Math.max(0, Math.sin((sinceLift - 0.6) * 4.2)) ** 2 : 0,
    rise,
    ropes: smooth((t - trudge.end) / 0.8),
    sinceLift,
  };
}
