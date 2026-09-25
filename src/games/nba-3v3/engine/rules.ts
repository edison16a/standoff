import { startDead } from "./check-up";
import { beyondArc, outOfBounds } from "./court";
import type { Match } from "./match";
import { RULES } from "./tuning";
import type { Athlete, TeamId } from "./types";

/**
 * The rules of half court three on three: who has the ball, the shot
 * clock, taking it back past the arc, scoring and turnovers. The break
 * after a basket or a turnover, ending in a check up at the top, is in
 * `check-up.ts`.
 */

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
