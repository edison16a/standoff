import { beyondArc, outOfBounds } from "./court";
import type { Match } from "./match";
import { COURT, RIM, RULES } from "./tuning";
import type { Athlete, TeamId } from "./types";
import type { V2 } from "./vec";

/**
 * The rules of half court three on three: who has the ball, the shot
 * clock, taking it back past the arc, scoring, and the reset after a
 * basket or a turnover, when the other team checks the ball at the top.
 */

const OFFENCE_SPOTS: readonly V2[] = [
  { x: COURT.check.x, z: COURT.check.z },
  { x: -4.9, z: 6.1 },
  { x: 4.9, z: 6.1 },
];

export interface CheckPlan {
  checker: number;
  spots: Map<number, V2>;
}

/** Guards stand between their player and the rim. */
function guardSpot(p: V2, gap: number): V2 {
  const dx = RIM.x - p.x;
  const dz = RIM.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: p.x + (dx / d) * gap, z: p.z + (dz / d) * gap };
}

/**
 * Chooses who brings the ball up, taking turns, and players on phones
 * first so the people playing get the ball in their hands.
 */
export function planCheck(m: Match, team: TeamId): CheckPlan {
  const side = m.athletes.filter((a) => a.team === team).sort((a, b) => a.slot - b.slot);
  const humans = side.filter((a) => !a.auto);
  const pool = humans.length > 0 ? humans : side;
  const checker = pool[m.checkTurn[team] % pool.length]!;
  m.checkTurn[team]++;
  const order = [checker, ...side.filter((a) => a !== checker)];
  const spots = new Map<number, V2>();
  order.forEach((a, i) => spots.set(a.id, OFFENCE_SPOTS[i] ?? OFFENCE_SPOTS[0]!));
  const guards = m.athletes.filter((a) => a.team !== team).sort((a, b) => a.slot - b.slot);
  guards.forEach((g, i) => spots.set(g.id, guardSpot(OFFENCE_SPOTS[i] ?? OFFENCE_SPOTS[0]!, i === 0 ? 1.3 : 1.8)));
  return { checker: checker.id, spots };
}

/** Puts everyone on their spot and the ball in the checker's hands. */
export function placeForCheck(m: Match, team: TeamId, fresh: boolean, plan = planCheck(m, team)): void {
  for (const a of m.athletes) {
    const spot = plan.spots.get(a.id)!;
    a.x = spot.x;
    a.z = spot.z;
    a.vx = a.vz = a.y = 0;
    a.action = { kind: "none" };
    a.yaw = Math.PI;
  }
  const checker = m.athletes[plan.checker]!;
  const b = m.ball;
  b.mode = "held";
  b.holder = checker.id;
  b.flight = null;
  b.flightKind = null;
  b.passTo = null;
  b.shot = null;
  b.lastTouch = checker.id;
  m.offence = team;
  m.needsClear = false;
  m.shotClock = RULES.shotClock;
  m.clockWarned = false;
  m.lastPass = null;
  m.brains.reset();
  if (!fresh) m.emit({ type: "check", team, id: checker.id });
}

export function startDead(m: Match, next: TeamId): void {
  m.phase = "dead";
  m.phaseT = 0;
  m.nextOffence = next;
  m.checkPlan = planCheck(m, next);
}

/** After a short pause for the celebration everyone jogs to their spot, then the ball is checked. */
export function updateDead(m: Match): void {
  const current = m.checkPlan;
  if (!current) return;
  for (const a of m.athletes) {
    const spot = current.spots.get(a.id);
    if (!spot || m.phaseT < 0.9) {
      a.move = { x: 0, z: 0 };
      continue;
    }
    const dx = spot.x - a.x;
    const dz = spot.z - a.z;
    const d = Math.hypot(dx, dz);
    a.move = d > 0.25 ? { x: (dx / d) * Math.min(0.75, d), z: (dz / d) * Math.min(0.75, d) } : { x: 0, z: 0 };
  }
  if (m.phaseT < RULES.deadTime) return;
  m.phase = "live";
  m.phaseT = 0;
  placeForCheck(m, m.nextOffence, false, current);
  m.checkPlan = null;
}

/** Someone got the ball: a rebound, a catch, a steal or a loose ball. */
export function gainPossession(m: Match, a: Athlete): void {
  const b = m.ball;
  const shot = b.shot;
  b.mode = "held";
  b.holder = a.id;
  b.flight = null;
  b.flightKind = null;
  b.passTo = null;
  b.lastTouch = a.id;
  b.vel = { x: 0, y: 0, z: 0 };
  if (shot && !shot.counted) {
    a.box.rebounds++;
    m.emit({ type: "rebound", id: a.id, offensive: a.team === shot.team });
  }
  b.shot = null;
  if (a.team !== m.offence) {
    m.offence = a.team;
    m.needsClear = !beyondArc(a);
    m.shotClock = RULES.shotClock;
    m.clockWarned = false;
    m.lastPass = null;
    m.brains.reset();
  } else if (shot?.touchedRim) {
    m.shotClock = RULES.shotClock;
    m.clockWarned = false;
  }
}

/** Puts a made shot on the board, once. */
export function scoreShot(m: Match): void {
  const shot = m.ball.shot;
  if (!shot || shot.counted || m.phase === "over") return;
  shot.counted = true;
  const shooter = m.athletes[shot.shooter]!;
  m.score[shot.team] += shot.points;
  shooter.box.points += shot.points;
  shooter.box.made++;
  if (shot.points === 3) shooter.box.threes++;
  if (shot.kind === "dunk") shooter.box.dunks++;
  const pass = m.lastPass;
  let assist: number | null = null;
  if (pass && pass.to === shooter.id && m.time - pass.at < 5 && pass.from !== shooter.id) {
    assist = pass.from;
    m.athletes[pass.from]!.box.assists++;
  }
  shooter.streak++;
  if (shooter.streak === 3) m.emit({ type: "heating", id: shooter.id });
  if (shooter.streak >= 4 && !shooter.onFire) {
    shooter.onFire = true;
    m.emit({ type: "onFire", id: shooter.id });
  }
  for (const o of m.opponents(shot.team)) {
    if (o.onFire) m.emit({ type: "fireOut", id: o.id });
    o.onFire = false;
    o.streak = 0;
  }
  m.emit({ type: "score", team: shot.team, points: shot.points, id: shooter.id, kind: shot.kind, outcome: shot.outcome, assist, streak: shooter.streak });
  shooter.action = shooter.action.kind === "none" ? { kind: "celebrate", t: 0, dur: 1.3 } : shooter.action;
  if (m.score[shot.team] >= m.target) {
    m.phase = "over";
    m.phaseT = 0;
    m.winner = shot.team;
    m.emit({ type: "win", team: shot.team });
    return;
  }
  if (m.score[shot.team] >= m.target - 2 && !m.gamePoint[shot.team]) {
    m.gamePoint[shot.team] = true;
    m.emit({ type: "gamePoint", team: shot.team });
  }
  startDead(m, shot.team === 0 ? 1 : 0);
}

/** A shot that did not go in: the streak ends and the crowd groans. */
export function missShot(m: Match): void {
  const shot = m.ball.shot;
  if (!shot || shot.counted) return;
  const shooter = m.athletes[shot.shooter]!;
  shooter.streak = 0;
  if (shooter.onFire) m.emit({ type: "fireOut", id: shooter.id });
  shooter.onFire = false;
  m.emit({ type: "miss", id: shooter.id });
}

function turnover(m: Match, to: TeamId, reason: "clock" | "out"): void {
  m.emit({ type: "violation", team: to === 0 ? 1 : 0, reason });
  const b = m.ball;
  if (b.mode === "held") {
    b.mode = "loose";
    b.holder = null;
    b.vel = { x: 0, y: 1.5, z: 0 };
  }
  b.shot = null;
  startDead(m, to);
}

/** The shot clock, taking it back past the arc, and the ball going out. */
export function updateClock(m: Match, dt: number): void {
  const b = m.ball;
  const holder = m.holder;
  if (m.needsClear && holder && holder.team === m.offence && beyondArc(holder)) {
    m.needsClear = false;
    m.emit({ type: "cleared", team: m.offence });
  }
  const running = b.mode === "held" || (b.mode === "flight" && b.flightKind === "pass");
  if (running) {
    m.shotClock = Math.max(0, m.shotClock - dt);
    if (!m.clockWarned && m.shotClock <= 5) {
      m.clockWarned = true;
      m.emit({ type: "clockWarning" });
    }
    if (m.shotClock <= 0) return turnover(m, m.offence === 0 ? 1 : 0, "clock");
  }
  if (b.mode === "loose" && b.pos.y < 1.4 && outOfBounds(b.pos)) {
    const last = b.lastTouch === null ? null : m.athletes[b.lastTouch];
    const to: TeamId = last ? (last.team === 0 ? 1 : 0) : m.offence === 0 ? 1 : 0;
    turnover(m, to, "out");
  }
}
