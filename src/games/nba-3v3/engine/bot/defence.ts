import { charOf } from "../athlete";
import { RIM_SPOT, rimDistance } from "../court";
import type { Match } from "../match";
import { gaussian } from "../rng";
import type { Athlete } from "../types";
import { dir2, dist2, lerp, type V2 } from "../vec";
import { ballCarrier, goTo, type BotState } from "./util";

/** Between a player and the rim, `gap` metres off them. */
function between(p: V2, gap: number): V2 {
  const d = dir2(p, RIM_SPOT);
  return { x: p.x + d.x * gap, z: p.z + d.z * gap };
}

/**
 * The computer on defence. It stays between its player and the rim,
 * tighter on the ball and on good shooters, sags off the ball toward the
 * paint, helps when someone drives free, jumps at shooters with a
 * reaction delay, and now and then reaches for a steal.
 */
export function thinkDefence(m: Match, a: Athlete, s: BotState, man: Athlete | null, dt: number): void {
  const holder = ballCarrier(m);
  if (!holder) return;
  s.decideIn -= dt;
  const act = holder.action;

  if (man === holder || (!man && dist2(a, holder) < 3)) {
    const gap = 0.9 + (10 - charOf(holder).stats.shooting) * 0.07;
    goTo(a, between(holder, gap), 1);
    if (act.kind === "shoot" && !act.released) contestJumper(m, a, s, holder);
    else if (act.kind === "drive") contestDrive(m, a, holder);
    else {
      s.jumpAt = null;
      if (s.decideIn <= 0) {
        s.decideIn = 0.2 + m.rng() * 0.15;
        const reachy = charOf(a).stats.speed >= 8 ? 0.07 : 0.045;
        if (dist2(a, holder) < 1.35 && act.kind === "none" && m.rng() < reachy) m.press(a.id, "defend");
      }
    }
    return;
  }

  if (!man) return;
  // Help: a driver with nobody on him gets met at the rim.
  const onBall = m.opponents(holder.team).some((o) => o !== a && dist2(o, holder) < 1.8);
  const nearestHelper = m.opponents(holder.team).filter((o) => o !== a).every((o) => dist2(o, RIM_SPOT) >= dist2(a, RIM_SPOT));
  if (!onBall && rimDistance(holder) < 4 && nearestHelper) {
    goTo(a, between(holder, 1));
    if (act.kind === "drive") contestDrive(m, a, holder);
    return;
  }
  // Off the ball: sag toward the ball and the paint, closer if the player is a shooter.
  const shooter = charOf(man).stats.shooting >= 8;
  const sag = shooter ? 0.2 : 0.38;
  const guard = between(man, 1.2);
  const spot = { x: lerp(guard.x, holder.x, sag * 0.5), z: lerp(guard.z, RIM_SPOT.z + 2, sag * 0.5) };
  const pass = m.ball.mode === "flight" && m.ball.flightKind === "pass" && m.ball.passTo === man.id;
  goTo(a, pass ? { x: m.ball.pos.x, z: m.ball.pos.z } : spot, pass ? 1 : 0.9);
}

/** Jump so the hands are at their highest as the ball leaves: a reaction delay, then up. */
function contestJumper(m: Match, a: Athlete, s: BotState, shooter: Athlete): void {
  if (shooter.action.kind !== "shoot") return;
  if (s.jumpAt === null) s.jumpAt = 0.3 + gaussian(m.rng, 0.09) + (charOf(a).stats.speed < 6 ? 0.05 : 0);
  if (shooter.action.t >= s.jumpAt && dist2(a, shooter) < 2.4) {
    m.press(a.id, "defend");
    s.jumpAt = 99;
  }
}

function contestDrive(m: Match, a: Athlete, driver: Athlete): void {
  if (driver.action.kind !== "drive") return;
  const leave = driver.action.takeoff - 0.08 + (m.rng() - 0.5) * 0.12;
  if (driver.action.t >= leave && dist2(a, driver.action.to) < 2) m.press(a.id, "defend");
}
