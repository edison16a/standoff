import { buildOf } from "../athlete";
import type { Match } from "../match";
import type { BallBody } from "../physics/air";
import { between } from "../rng";
import { BOARD, COURT, RIM } from "../tuning";
import type { Athlete, ShotInfo } from "../types";
import type { V3 } from "../vec";
import type { BlockJump } from "./style";

/**
 * What the hand does to the ball, picked with the block: a swat through
 * it, a volleyball spike down and out of bounds, the ball pinned to the
 * glass, or only a fingertip. Each sets the ball off on its own real
 * flight; from then on the physics alone has it.
 */
export const BLOCK_HITS = ["swat", "spike", "pin", "tip"] as const;
export type BlockHit = (typeof BLOCK_HITS)[number];

/** The name a block goes by, for the lab, the sounds and the replay: the hit when it is special, else the jump. */
export type BlockPreset = BlockJump | "layup" | "spike" | "pin" | "tip";

export function presetName(jump: BlockJump, hit: BlockHit, kind: ShotInfo["kind"]): BlockPreset {
  if (hit !== "swat") return hit;
  if (jump === "stand" && kind === "layup") return "layup";
  return jump;
}

/** Beyond this share of the arm's reach a block is only a fingertip on the ball. */
const TIP_REACH = 0.7;

/** Whether a hand that gets to the ball only gets fingertips on it: its path grazes the end of the reach. */
export function fingertip(body: Pick<BallBody, "pos" | "vel">, s: { x: number; y: number; z: number; reach: number }): boolean {
  return closestPass(body, s) > s.reach * TIP_REACH;
}

/** How near the ball's straight path comes to the shoulder from here on. */
function closestPass(body: Pick<BallBody, "pos" | "vel">, s: { x: number; y: number; z: number }): number {
  const rx = body.pos.x - s.x;
  const ry = body.pos.y - s.y;
  const rz = body.pos.z - s.z;
  const v = body.vel;
  const vv = v.x * v.x + v.y * v.y + v.z * v.z;
  const t = vv > 1e-6 ? Math.max(0, -(rx * v.x + ry * v.y + rz * v.z) / vv) : 0;
  return Math.hypot(rx + v.x * t, ry + v.y * t, rz + v.z * t);
}

/** Close enough to the glass, and high enough, to pin it there. */
export const byGlass = (p: V3): boolean => p.z < BOARD.face + 0.75 && Math.abs(p.x) < BOARD.halfWidth + 0.15 && p.y > RIM.y - 0.35;

/**
 * Picks the hit. A grazing path is a fingertip. By the glass a chase
 * down or a block on a layup pins it there. A strong man sometimes
 * spikes it out of bounds. Everything else is swatted.
 */
export function chooseHit(m: Match, d: Athlete, jump: BlockJump, kind: ShotInfo["kind"], at: V3, grazing: boolean): BlockHit {
  if (grazing) return "tip";
  if (byGlass(at) && (jump === "chase" || kind === "layup") && m.rng() < 0.7) return "pin";
  const strong = buildOf(d).stats.strength >= 7;
  return m.rng() < (strong ? 0.35 : 0.12) ? "spike" : "swat";
}

/** Sends the ball off the hand the way the hit does. */
export function applyHit(m: Match, body: BallBody, hit: BlockHit): void {
  if (hit === "tip") return tipShot(m, body);
  if (hit === "spike") return spike(m, body);
  if (hit === "pin" && byGlass(body.pos)) return pin(m, body);
  swat(m, body);
}

/**
 * The swat: the hand comes through the ball, back the way it came and
 * off to a side or down, and the ball bounces off the moving hand like
 * any hit, keeping a little of its own speed reversed.
 */
export function swat(m: Match, body: BallBody): void {
  // Back off the shooter's line and into the floor more often than into the stands: toward the middle of the half court.
  const away = { x: COURT.check.x * 0.3 - body.pos.x * 0.6, z: (RIM.z + COURT.check.z) / 2 - body.pos.z };
  const l = Math.hypot(away.x, away.z) || 1;
  const side = between(m.rng, -0.8, 0.8);
  const speed = between(m.rng, 1.2, 3.4);
  const hand = { x: ((away.x - side * away.z) / l) * speed, y: between(m.rng, -1.8, 1.4), z: ((away.z + side * away.x) / l) * speed };
  const v = body.vel;
  const e = 0.15;
  body.vel = { x: hand.x + (hand.x - v.x) * e, y: hand.y + (hand.y - v.y) * e, z: hand.z + (hand.z - v.z) * e };
  body.w = { x: body.w.x * 0.3 + between(m.rng, -12, 12), y: between(m.rng, -6, 6), z: body.w.z * 0.3 + between(m.rng, -12, 12) };
}

/** A fingertip on a shot: the ball keeps much of its flight but is knocked up and off line, and goes short. */
export function tipShot(m: Match, body: BallBody): void {
  const v = body.vel;
  const side = between(m.rng, -1.2, 1.2);
  body.vel = { x: v.x * 0.45 + side * v.z * 0.15, y: Math.abs(v.y) * 0.25 + between(m.rng, 1.2, 2.4), z: v.z * 0.45 - side * v.x * 0.15 };
  body.w = { x: between(m.rng, -14, 14), y: between(m.rng, -6, 6), z: between(m.rng, -14, 14) };
}

/** The volleyball spike: the hand comes over the top and drives it down hard toward the nearest line, so it bounces once and is gone. */
export function spike(m: Match, body: BallBody): void {
  const p = body.pos;
  const toSide = COURT.halfWidth - Math.abs(p.x);
  const toBase = p.z;
  const dir = toBase < toSide ? { x: between(m.rng, -0.35, 0.35), z: -1 } : { x: Math.sign(p.x || 1), z: between(m.rng, -0.3, 0.3) };
  const l = Math.hypot(dir.x, dir.z);
  const speed = between(m.rng, 7, 9);
  body.vel = { x: (dir.x / l) * speed, y: between(m.rng, -4.2, -2.6), z: (dir.z / l) * speed };
  body.w = { x: between(m.rng, -20, 20), y: between(m.rng, -8, 8), z: between(m.rng, -20, 20) };
}

/** Pinned to the glass: the open palm takes it flat against the board, and it drops off down the face. */
export function pin(m: Match, body: BallBody): void {
  body.vel = { x: between(m.rng, -0.4, 0.4), y: between(m.rng, 0.2, 0.7), z: -between(m.rng, 2, 2.8) };
  body.w = { x: between(m.rng, -3, 3), y: 0, z: between(m.rng, -3, 3) };
}
