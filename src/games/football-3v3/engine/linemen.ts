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
 * How much of a defender's pace survives the offensive line: a rusher
 * running into a blocker is held up, far less when holding Rush. The
 * blocker turns to take him on, which the renderer shows.
 */
export function blockedPace(state: MatchState, a: Athlete): number {
  if (a.team === state.drive.offense || state.phase !== "live") return 1;
  let pace = 1;
  for (const l of state.linemen) {
    if (l.team !== state.drive.offense) continue;
    if (l.blocking === a.id && dist(l.pos, a.pos) > LINE.pickUp) l.blocking = null;
    if (dist(l.pos, a.pos) > LINE.pickUp * 0.55) continue;
    l.blocking = a.id;
    pace = Math.min(pace, a.rush ? LINE.heldRush : LINE.held);
  }
  return pace;
}
