import { attackSign, TEAM_IDS } from "../teams";
import { cycleLength } from "./body";
import { LINE } from "./tuning";
import type { Athlete, Lineman, MatchState } from "./types";
import { clamp, dist, len, v2, v3 } from "./vec";

const LANES = [-1, 0, 1] as const;

/** Six linemen, three a side, lane by lane so each has a man across from him. */
export function makeLinemen(): Lineman[] {
  return TEAM_IDS.flatMap((team) => LANES.map((lane, i) => ({ id: team * 3 + i, team, lane, pos: v2(), vel: v2(), facing: 0, action: "stance" as const, actionT: 0, blocking: null, surge: 0 })));
}

/** Lines them up either side of the ball, in their stance. */
export function setLinemen(state: MatchState): void {
  const { offense, los, ballZ } = state.drive;
  for (const l of state.linemen) {
    // The offence sets just behind the ball and the defence just in front of it, both facing the line.
    const s = attackSign(offense) * (l.team === offense ? -1 : 1);
    l.pos = v2(los + s * LINE.offBall, ballZ + l.lane * LINE.spacing);
    l.vel = v2();
    l.facing = s > 0 ? Math.PI : 0;
    l.action = "stance";
    l.actionT = 0;
    l.surge = 0;
    l.blocking = null;
  }
}

/** The lineman across the line from this one. */
export function opposite(state: MatchState, l: Lineman): Lineman {
  return state.linemen.find((o) => o.team !== l.team && o.lane === l.lane)!;
}

/**
 * The snap: each pair fires out and meets at the line with a crack of
 * pads. After that they lean on each other, surging back and forth; the
 * defence slowly wins ground the longer the play lasts, as it does.
 */
export function stepLinemen(state: MatchState, dt: number, live: boolean): void {
  const { offense } = state.drive;
  const toBackfield = -attackSign(offense);
  for (const l of state.linemen) l.actionT += dt;
  if (!live) {
    for (const l of state.linemen) {
      l.vel = v2();
      if (l.action !== "celebrate") l.action = "stance";
    }
    return;
  }
  const bodyWidth = LINE.offBall * 0.62;
  for (const o of state.linemen.filter((l) => l.team === offense)) {
    const d = opposite(state, o);
    if (o.action === "stance") {
      o.action = d.action = "engage";
      o.actionT = d.actionT = 0;
      const mid = (o.pos.x + d.pos.x) / 2;
      state.events.push({ type: "pads", at: v3(mid, 1.2, o.pos.z), hard: o.lane === 0 });
    }
    // A new surge now and then, from either side, with a lean toward the defence the longer it goes.
    if (state.rng.chance(dt * 2.2)) o.surge = clamp(state.rng.range(-1, 1) + Math.min(0.5, o.actionT * 0.08), -1, 1);
    d.surge = o.surge;
    const shove = o.surge * LINE.surge;
    const vx = toBackfield * shove;
    const mid = (o.pos.x + d.pos.x) / 2 + vx * dt;
    o.vel = v2(vx, 0);
    d.vel = v2(vx, 0);
    o.pos = v2(mid + toBackfield * bodyWidth, o.pos.z);
    d.pos = v2(mid - toBackfield * bodyWidth, d.pos.z);
  }
}

/** The stride of a lineman's churning legs, for the renderer. */
export function linemanStride(l: Lineman): number {
  return l.actionT * (1.2 + len(l.vel)) / cycleLength(1);
}

/**
 * How much of a defender's pace survives the offensive line. A blocker
 * who gets hold of him slows him right down until he sheds the block;
 * holding Rush he keeps more pace and sheds it far sooner, then he is
 * through and the line no longer touches him.
 */
export function blockedPace(state: MatchState, a: Athlete, dt: number): number {
  if (a.team === state.drive.offense || state.phase !== "live") return 1;
  let near = false;
  for (const l of state.linemen) {
    if (l.team !== state.drive.offense) continue;
    const gap = dist(l.pos, a.pos);
    if (gap < LINE.contact && !a.block.through) {
      near = true;
      l.blocking = a.id;
    } else if (l.blocking === a.id && gap > LINE.pickUp) l.blocking = null;
  }
  if (!near) {
    // Clear of the line: the next block starts from scratch.
    if (!state.linemen.some((l) => l.team === state.drive.offense && dist(l.pos, a.pos) < LINE.pickUp)) a.block = { held: 0, through: false };
    return 1;
  }
  a.block.held += dt;
  if (a.block.held >= (a.rush ? LINE.shedRush : LINE.shed)) {
    a.block.through = true;
    return 1;
  }
  return a.rush ? LINE.heldRush : LINE.held;
}
