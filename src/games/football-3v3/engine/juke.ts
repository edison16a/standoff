import { advance, athleteLimits, setAction } from "./athlete";
import { steer } from "./body";
import { JUKE } from "./tuning";
import type { Athlete, JukeKind, MatchState } from "./types";
import { add, angleOf, cross, dot, fromAngle, len, norm, perp, scale, type Vec2 } from "./vec";

/**
 * Which juke the stick asks for, against the way the player runs: pushed
 * back is a back move, to either side a side step, forward or centred a
 * full spin. The side is +1 to the left of the run (toward perp).
 */
export function jukeFor(run: Vec2, stick: Vec2): { kind: JukeKind; side: 1 | -1 } {
  const r = norm(run);
  if (len(stick) < JUKE.deadzone) return { kind: "spin", side: 1 };
  const s = norm(stick);
  const along = dot(r, s);
  const side: 1 | -1 = cross(r, s) >= 0 ? 1 : -1;
  if (along < -0.7) return { kind: "back", side };
  if (along > 0.7) return { kind: "spin", side };
  return { kind: "side", side };
}

/** How long a juke takes: quicker for agile players, slower when spammed. */
export function jukeLength(a: Athlete, kind: JukeKind): number {
  return JUKE[kind] * (1.15 - 0.3 * a.agility) * (1 + JUKE.heatLength * a.juke.heat);
}

export function canJuke(a: Athlete): boolean {
  return a.juke.wait <= 0 && (a.action === "free" || a.action === "stance");
}

/** Starts a juke if the cooldown allows. Each one adds heat, which stretches the next cooldown. */
export function startJuke(state: MatchState, a: Athlete, stick: Vec2): boolean {
  if (!canJuke(a)) return false;
  const run = len(a.vel) > 0.5 ? a.vel : fromAngle(a.facing);
  const { kind, side } = jukeFor(run, stick);
  setAction(a, "juke", jukeLength(a, kind));
  a.juke.kind = kind;
  a.juke.side = side;
  a.juke.dir = norm(run);
  a.juke.wait = JUKE.cooldown * (1 + JUKE.heatCooldown * a.juke.heat) + a.actionLen;
  a.juke.heat += 1;
  state.events.push({ type: "juke", athlete: a.id, kind });
  return true;
}

/** Inside the part of a juke that makes a tackle whiff. */
export function evading(a: Athlete): boolean {
  if (a.action !== "juke") return false;
  const p = a.actionT / Math.max(a.actionLen, 1e-6);
  return p >= JUKE.evadeFrom && p <= JUKE.evadeTo;
}

/**
 * The juke's footwork. A spin keeps running through a full turn of the
 * body; a side step bursts across the run then straightens; a back move
 * plants, steps back and across, then drives on. Every one sheds pace.
 */
export function stepJuke(state: MatchState, a: Athlete, dt: number): void {
  const lim = athleteLimits(state, a);
  const p = a.actionT / Math.max(a.actionLen, 1e-6);
  const dir = a.juke.dir;
  const across = scale(perp(dir), a.juke.side);
  const kind = a.juke.kind ?? "spin";
  let want: Vec2;
  if (kind === "spin") {
    want = scale(dir, lim.top * JUKE.spinKeep);
    // The body goes all the way round while the feet keep moving.
    a.facing = angleOf(dir) + a.juke.side * Math.PI * 2 * Math.min(1, p);
  } else if (kind === "side") {
    want = p < 0.6 ? add(scale(dir, len(a.vel) * JUKE.sideKeep), across, JUKE.sideBurst) : scale(dir, lim.top);
  } else {
    want = p < 0.5 ? add(scale(dir, -JUKE.backBurst * 0.6), across, JUKE.backBurst) : scale(dir, lim.top * JUKE.backKeep * 2);
  }
  // Jukes are sharp: the feet get more grip than a plain run allows.
  a.vel = steer(a.vel, want, { ...lim, top: Math.max(lim.top, JUKE.sideBurst), grip: lim.grip * 2.5, brake: lim.brake * 1.5 }, dt);
  if (kind !== "spin") a.facing = angleOf(dir);
  advance(a, dt);
  if (a.actionT >= a.actionLen) {
    a.action = "free";
    a.juke.kind = null;
    if (kind === "spin") a.facing = angleOf(dir);
  }
}

/** Cools the juke heat and the cooldown. */
export function coolJuke(a: Athlete, dt: number): void {
  a.juke.wait = Math.max(0, a.juke.wait - dt);
  a.juke.heat = Math.max(0, a.juke.heat - JUKE.heatDecay * dt);
}
