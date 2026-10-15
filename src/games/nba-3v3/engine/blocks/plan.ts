import { buildOf } from "../athlete";
import { contestScale } from "../build-effects";
import { extraReach } from "../contest";
import type { Match } from "../match";
import { RIM } from "../tuning";
import type { Athlete, ShotInfo } from "../types";
import { clamp, type V3 } from "../vec";
import { byGlass, fingertip, type BlockHit } from "./hit";
import { meet, timingAt, type Meet } from "./meet";
import { hitFor, pickPreset, type BlockPreset } from "./presets";

export { armAt, goaltend, jumpHeight, timingAt } from "./meet";

/**
 * The block, decided before the hand gets there. As soon as a defender
 * is up (or the shot leaves the hand with him already up) the shot's
 * real flight is flown ahead next to his jump, to find the moment the
 * ball comes into his reach. The block math is rolled for that moment,
 * the preset picked from it, and the plan kept on his jump, so the
 * animation can play the preset and time the hand to arrive on the
 * ball, or to fall just short of it.
 */
export interface BlockPlan {
  /** When the hand meets the ball, on the jump's own clock, and when that was decided. */
  at: number;
  made: number;
  /** Where the ball is then. */
  point: V3;
  /** What the hand does to it, or null: the near miss. */
  hit: BlockHit | null;
  /** The authored play the body runs. */
  preset: BlockPreset;
  /** The hand that strikes (both go up for a two hand play, this one leads): the one on the ball's side. */
  hand: "L" | "R";
}

/** The hand on the ball's side of him, as he faces when the play is decided: his left is (cos yaw, -sin yaw). */
export function handFor(d: Pick<Athlete, "x" | "z" | "yaw">, p: { x: number; z: number }): "L" | "R" {
  return (p.x - d.x) * Math.cos(d.yaw) - (p.z - d.z) * Math.sin(d.yaw) >= 0 ? "L" : "R";
}

/**
 * The chance a hand that gets there blocks it: the timing of the jump,
 * the length of the arms and the defence rating. A layup preset made to
 * go round the hands takes its `evade` share of that away.
 */
export function touchChance(d: Athlete, kind: "jumper" | "layup", evade: number, timing: number): number {
  const long = extraReach(d);
  const base = kind === "jumper" ? 0.1 + long * 0.2 : (0.24 + long * 0.22) * (1 - evade);
  return clamp(base * (0.3 + 0.7 * timing) * contestScale(buildOf(d).stats.defence), 0.02, 0.62);
}

/** Rolls whether the hand gets it, once per man per shot. */
function rollTouch(m: Match, d: Athlete, shot: ShotInfo, k: Meet, timing: number): boolean {
  const fresh = !shot.rolled.includes(d.id);
  if (fresh) shot.rolled.push(d.id);
  // One chance only: a gold release, a scripted film or a fouled shot already gave every man his.
  if (!fresh || k.gap > 0 || m.forcedPreset === "miss") return false;
  const kind = shot.kind === "jumper" ? "jumper" : "layup";
  return m.forcedBlock || m.forcedPreset !== null || m.rng() < touchChance(d, kind, shot.evade, timing);
}

/** Plans this defender's jump against the shot in the air: a touch, a near miss, or nothing near enough to matter. */
export function planBlock(m: Match, d: Athlete): void {
  const act = d.action;
  const b = m.ball;
  const shot = b.shot;
  if (act.kind !== "block") return;
  act.plan = undefined;
  if (b.mode !== "flight" || b.flightKind !== "shot" || !shot || shot.kind === "free" || shot.kind === "dunk") return;
  const k = meet(b, shot, d, act);
  if (!k) return;
  const touch = rollTouch(m, d, shot, k, timingAt(act, act.t + k.dt));
  const glass = byGlass(k.body.pos);
  const forced = m.forcedPreset;
  // A lab or a film can fix the play, but only for a hand that really gets there.
  const preset =
    touch && forced ? forced : pickPreset({
      jump: act.style,
      kind: shot.kind,
      three: shot.points === 3,
      touch,
      grazing: fingertip(k.deep.body, k.deep.arm),
      glass,
      rimGap: Math.hypot(k.body.pos.x - RIM.x, k.body.pos.z - RIM.z),
      strong: buildOf(d).stats.strength >= 7,
      roll: touch ? m.rng() : 0,
    });
  const hit = preset === "miss" ? null : hitFor(preset, glass);
  if (hit) {
    m.forcedBlock = false;
    m.forcedPreset = null;
  }
  act.plan = { at: act.t + k.dt, made: act.t, point: { ...k.body.pos }, hit, preset, hand: handFor(d, k.body.pos) };
}

/** Plans every defender already up, as a shot leaves the hand. */
export function planBlocks(m: Match): void {
  const shot = m.ball.shot;
  if (!shot) return;
  for (const d of m.opponents(shot.team)) if (d.action.kind === "block") planBlock(m, d);
}
