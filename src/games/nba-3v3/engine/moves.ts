import { airborne, charOf, topSpeed } from "./athlete";
import type { Match } from "./match";
import { basketDir, nearestDefender, pickMove, rightOf } from "./move-pick";
import { switchHands } from "./dribble";
import { knockLoose } from "./steal";
import type { Action, Athlete, DribbleMove } from "./types";
import { angleDiff, clamp, dir2, dist2, yawOf, type V2 } from "./vec";

type Move = Extract<Action, { kind: "move" }>;

interface MoveSpec {
  dur: number;
  /** When the move is checked against the defender, in seconds. */
  at: number;
  /** The base chance it beats an honest defender. */
  beat: number;
}

/** Each move's length and how well it beats a defender who stays home. */
export const MOVES: Record<DribbleMove, MoveSpec> = {
  stepback: { dur: 0.46, at: 0.2, beat: 0.42 },
  crossover: { dur: 0.34, at: 0.14, beat: 0.45 },
  spin: { dur: 0.56, at: 0.3, beat: 0.42 },
  hesitation: { dur: 0.5, at: 0.3, beat: 0.36 },
  behindBack: { dur: 0.38, at: 0.18, beat: 0.34 },
};

/** A short breather after each move before the next. */
const COOLDOWN = 0.3;
/** Heat from recent moves cools this much a second; past about two in a row they get risky. */
const HEAT_DECAY = 0.55;
const SPAM_HEAT = 1.6;

/** Cools the dribble moves down, every step. */
export function tickMoves(a: Athlete, dt: number): void {
  a.moveCd = Math.max(0, a.moveCd - dt);
  a.moveHeat = Math.max(0, a.moveHeat - HEAT_DECAY * dt);
}

/** Dribble pressed with the ball: a move picked by the stick, if the last one has had its breather. */
export function pressDribble(m: Match, a: Athlete, aim: V2 | null): void {
  if (a.action.kind !== "none" || a.moveCd > 0 || m.ball.mode !== "held" || m.phase !== "live") return;
  const choice = pickMove(a, aim, nearestDefender(m, a));
  const spec = MOVES[choice.move];
  a.moveHeat += 1;
  a.moveCd = spec.dur + COOLDOWN;
  // Crossovers and behind the back change hands on the next push down.
  if (choice.move === "crossover" || choice.move === "behindBack") {
    switchHands(a, choice.side);
    a.crossCd = spec.dur + 0.4;
  }
  a.action = { kind: "move", t: 0, move: choice.move, dur: spec.dur, side: choice.side, dir: choice.dir, resolved: false };
  m.emit({ type: "move", id: a.id, move: choice.move });
}

/** Whether a move is far enough along to shoot out of it, as off a stepback. */
export function canShootOutOf(act: Move): boolean {
  return act.t >= MOVES[act.move].at + 0.1;
}

const bump = (t: number, from: number, to: number) => (t <= from || t >= to ? 0 : Math.sin((Math.PI * (t - from)) / (to - from)));

/** The velocity the move wants at time `t`, in the basket's frame: `f` forward, `r` right. */
function wanted(act: Move, a: Athlete, f: V2, r: V2): { v: V2; rate: number } {
  const t = act.t;
  const s = act.side;
  const top = topSpeed(a, true);
  const fwd = Math.max(0, a.vx * f.x + a.vz * f.z);
  const mix = (kf: number, kr: number): V2 => ({ x: f.x * kf + r.x * kr, z: f.z * kf + r.z * kr });
  switch (act.move) {
    case "stepback":
      // Plant, hop back off the front foot, land square to shoot.
      return { v: t < 0.07 ? mix(0, 0) : mix(-4.8 * bump(t, 0.05, 0.32), 0), rate: 30 };
    case "crossover":
      // The ball goes across low and the body follows it hard to that side.
      return { v: t < 0.05 ? mix(fwd * 0.6, 0) : mix(1.6 + t * 4, 5.2 * s * Math.max(0.35, bump(t, 0.03, 0.34))), rate: 24 };
    case "spin": {
      // Round the defender: forward, swinging out to the side and back in.
      const turn = clamp((t - 0.06) / 0.44, 0, 1);
      return { v: mix(2.6 + turn * 1.4, 3 * s * Math.sin(Math.PI * turn)), rate: 20 };
    }
    case "hesitation":
      // Ease off and stand tall, then explode.
      return t < 0.26 ? { v: mix(0.8, 0), rate: 9 } : { v: mix(top * 1.05, 0), rate: 16 };
    case "behindBack":
      return { v: mix(Math.max(1.5, fwd), 3 * s * bump(t, 0.04, 0.28)), rate: 22 };
  }
}

/** Runs a move: the move carries the player, turns them, and is checked against the defender once. */
export function updateMove(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "move") return;
  act.t += dt;
  const f = basketDir(a);
  const r = rightOf(f);
  const { v, rate } = wanted(act, a, f, r);
  const k = 1 - Math.exp(-rate * dt);
  a.vx += (v.x - a.vx) * k;
  a.vz += (v.z - a.vz) * k;
  const face = yawOf(f.x, f.z);
  // A spin goes all the way round; every other move stays square to the basket.
  const spin = act.move === "spin" ? act.side * Math.PI * 2 * smooth((act.t - 0.06) / 0.44) : 0;
  a.yaw = act.move === "spin" ? face + spin : a.yaw + angleDiff(a.yaw, face) * Math.min(1, dt * 14);
  if (!act.resolved && act.t >= MOVES[act.move].at) {
    act.resolved = true;
    resolveMove(m, a, act);
  }
  if (a.action === act && act.t >= act.dur) {
    a.yaw = face;
    a.action = { kind: "none" };
  }
}

const smooth = (u: number) => {
  const k = clamp(u, 0, 1);
  return k * k * (3 - 2 * k);
};

/**
 * The moment of truth. Spamming moves or making one into a defender
 * right on top risks losing the ball. Otherwise a quicker handler, and
 * a defender caught reaching, jumping or lunging, gets them beaten: a
 * stumble on a hard beat, a step lost on a small one.
 */
function resolveMove(m: Match, a: Athlete, act: Move): void {
  if (m.ball.holder !== a.id) return;
  const d = nearestDefender(m, a);
  const close = !!d && dist2(d, a) < 0.95;
  const risk = 0.012 + Math.max(0, a.moveHeat - SPAM_HEAT) * 0.09 + (close ? 0.07 : 0) + (close && act.move === "spin" ? 0.04 : 0);
  if (m.rng() < risk) {
    const away = d && close ? dir2(a, d) : { x: act.dir.x, z: act.dir.z };
    knockLoose(m, a, away, 1.8);
    if (d && close) d.box.steals++;
    m.emit({ type: "fumble", id: a.id, by: d && close ? d.id : null });
    return;
  }
  if (!d || airborne(d) || d.action.kind === "stumble") return;
  const ds = charOf(d).stats;
  const hs = charOf(a).stats;
  const bit = d.action.kind === "steal" || d.whiff > 0 ? 0.3 : 0;
  const lunging = (d.vx * (a.x - d.x) + d.vz * (a.z - d.z)) / Math.max(0.3, dist2(a, d)) > 2 && act.move !== "stepback" ? 0.12 : 0;
  const chance = clamp(MOVES[act.move].beat + (hs.speed - ds.speed) * 0.035 + bit + lunging - Math.max(0, a.moveHeat - 1) * 0.1, 0.05, 0.85);
  if (m.rng() >= chance) return;
  const hard = m.rng() < 0.2 + bit;
  if (hard) d.action = { kind: "stumble", t: 0, dur: 0.6 };
  d.whiff = Math.max(d.whiff, hard ? 0.6 : 0.4);
  m.emit({ type: "shake", id: a.id, victim: d.id, hard });
}
