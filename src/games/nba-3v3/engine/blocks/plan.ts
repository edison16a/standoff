import { buildOf, standingReach } from "../athlete";
import { contestScale } from "../build-effects";
import { extraReach } from "../contest";
import type { Match } from "../match";
import { copyBody, type BallBody } from "../physics/air";
import { BALL } from "../physics/ball-spec";
import type { Contact } from "../physics/world";
import { copyFlight, stepShotFlight } from "../shot-outcome/flight";
import { RIM, STEP } from "../tuning";
import type { Action, Athlete, ShotInfo } from "../types";
import { clamp, type V3 } from "../vec";
import { chooseHit, fingertip, type BlockHit } from "./hit";

type Block = Extract<Action, { kind: "block" }>;

/**
 * The block, decided before the hand gets there. As soon as a defender
 * is up (or the shot leaves the hand with him already up) the shot's
 * real flight is flown ahead next to his jump, to find the moment the
 * ball comes into his reach. The block math is rolled for that moment,
 * the hit picked, and the plan kept on his jump, so the animation can
 * time the hand to arrive on the ball, or to fall just short of it.
 */
export interface BlockPlan {
  /** When the hand meets the ball, on the jump's own clock. */
  at: number;
  /** Where the ball is then. */
  point: V3;
  /** What the hand does to it, or null: the near miss. */
  hit: BlockHit | null;
}

/** A ball whose path passes within this much past the reach still draws a full stretch at it. */
const NEAR = 0.4;

/** Where the shoulder is with the feet `y` off the floor, and how far the arm reaches from it. */
export function armAt(a: Athlete, x: number, y: number, z: number): { x: number; y: number; z: number; reach: number } {
  const h = buildOf(a).body.height;
  const shoulder = y + h * 0.81;
  return { x, y: shoulder, z, reach: y + standingReach(a) - shoulder + 0.06 };
}

/** Feet off the floor at `t` on the jump's clock. */
export function jumpHeight(act: Block, t: number): number {
  const s = (t - act.gather) / act.air;
  return s > 0 && s < 1 ? act.peak * 4 * s * (1 - s) : 0;
}

/** How well timed the jump is at `t`: full at the top of the arc, nothing still crouched. */
export function timingAt(act: Block, t: number): number {
  if (t < act.gather) return 0;
  return clamp(Math.sin(Math.PI * clamp((t - act.gather) / act.air, 0, 1)), 0, 1);
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

/** Touching a ball on its way down above the ring is goaltending, and nobody tries it. */
export const goaltend = (b: Pick<BallBody, "pos" | "vel">) => b.vel.y < 0 && b.pos.y > RIM.y && Math.hypot(b.pos.x - RIM.x, b.pos.z - RIM.z) < 0.7;

interface Meet {
  dt: number;
  body: BallBody;
  gap: number;
  arm: ReturnType<typeof armAt>;
}

/** Flies the shot and the jump ahead together and finds the first touch, or the nearest pass if none. */
function meet(ball: BallBody, shot: ShotInfo, d: Athlete, act: Block): Meet | null {
  const body = copyBody(ball);
  const flight = copyFlight(shot.flight);
  const out: Contact[] = [];
  let best: Meet | null = null;
  for (let dt = 0; act.t + dt < act.gather + act.air; dt += STEP) {
    const y = jumpHeight(act, act.t + dt);
    if (y > 0.08 && !goaltend(body)) {
      const s = armAt(d, d.x + d.vx * dt, y, d.z + d.vz * dt);
      const gap = Math.hypot(body.pos.x - s.x, body.pos.y - s.y, body.pos.z - s.z) - s.reach - BALL.radius;
      if (body.pos.y >= s.y && (!best || gap < best.gap)) best = { dt, body: copyBody(body), gap, arm: s };
      if (best && best.gap <= 0) return best;
    }
    out.length = 0;
    stepShotFlight(body, flight, STEP, out);
  }
  return best && best.gap < NEAR ? best : null;
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
  // One chance only: a gold release, a scripted film or a fouled shot already gave every man his.
  const fresh = !shot.rolled.includes(d.id);
  if (fresh) shot.rolled.push(d.id);
  let hit: BlockHit | null = null;
  const forced = m.forcedHit;
  const kind = shot.kind === "jumper" ? "jumper" : "layup";
  if (fresh && k.gap <= 0 && forced !== "miss") {
    const timing = timingAt(act, act.t + k.dt);
    if (m.forcedBlock || forced || m.rng() < touchChance(d, kind, shot.evade, timing)) {
      hit = forced ?? chooseHit(m, d, act.style, shot.kind, k.body.pos, fingertip(k.body, k.arm));
    }
  }
  if (hit) {
    m.forcedBlock = false;
    m.forcedHit = null;
  }
  act.plan = { at: act.t + k.dt, point: { ...k.body.pos }, hit };
}

/** Plans every defender already up, as a shot leaves the hand. */
export function planBlocks(m: Match): void {
  const shot = m.ball.shot;
  if (!shot) return;
  for (const d of m.opponents(shot.team)) if (d.action.kind === "block") planBlock(m, d);
}
