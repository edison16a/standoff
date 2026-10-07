import { buildOf } from "../athlete";
import { RIM_SPOT, rimDistance } from "../court";
import type { Match } from "../match";
import { gaussian } from "../rng";
import { inStealRange } from "../steal";
import type { Athlete } from "../types";
import { dir2, dist2, lerp, type V2 } from "../vec";
import { ballCarrier, goTo, type BotState } from "./util";

/** Between a player and the rim, `gap` metres off them. */
function between(p: V2, gap: number): V2 {
  const d = dir2(p, RIM_SPOT);
  return { x: p.x + d.x * gap, z: p.z + d.z * gap };
}

/** On the ball: how far a moment ahead the defender reads the run, and how tight he steps up on a shooter rising. */
export const ON_BALL = { lead: 0.16, closeGap: 0.55, ease: 0.3 } as const;

/** Where the man on the ball wants to be: between the handler, read a moment ahead, and the rim. */
export function onBallSpot(holder: Athlete): V2 {
  const at = { x: holder.x + holder.vx * ON_BALL.lead, z: holder.z + holder.vz * ON_BALL.lead };
  const act = holder.action;
  const rising = act.kind === "shoot" && !act.released && !act.free;
  const gap = rising ? ON_BALL.closeGap : 0.85 + (10 - buildOf(holder).stats.shooting) * 0.06;
  return between(at, gap);
}

/**
 * The computer on defence. It stays between its player and the rim,
 * reading the handler's run a moment ahead so it mirrors a drive or a
 * stepback, tighter on good shooters, and closes out on a jumper with a
 * hand up. Off the ball it sags toward the paint, helps when someone
 * drives free, jumps at shooters with a reaction delay, and now and
 * then reaches for a steal.
 */
export function thinkDefence(m: Match, a: Athlete, s: BotState, man: Athlete | null, dt: number): void {
  const holder = ballCarrier(m);
  if (!holder) return;
  s.decideIn -= dt;
  const act = holder.action;

  if (man === holder || (!man && dist2(a, holder) < 3)) {
    goTo(a, onBallSpot(holder), 1, ON_BALL.ease);
    if (act.kind === "shoot" && !act.released) contestJumper(m, a, s, holder);
    else if (act.kind === "drive") contestDrive(m, a, holder);
    else {
      s.jumpAt = null;
      if (s.decideIn <= 0) {
        s.decideIn = 0.2 + m.rng() * 0.15 + m.bots.think;
        // Two reaches are free; after that the whistle is a risk, so a third is rare and a fourth never comes.
        const tries = m.stealLog.count(a.id, holder.id);
        const reachy = m.bots.reach * (buildOf(a).stats.speed >= 8 ? 0.08 : 0.055) * (tries < 2 ? 1 : tries === 2 ? 0.2 : 0);
        if (inStealRange(a, holder) && act.kind === "none" && m.rng() < reachy) m.press(a.id, "defend");
      }
    }
    return;
  }

  // A spare defender on an uneven floor has nobody to guard: sit in the paint on the ball's side and help.
  if (!man) return goTo(a, { x: lerp(RIM_SPOT.x, holder.x, 0.4), z: lerp(RIM_SPOT.z + 1.2, holder.z, 0.4) }, 0.9);
  // Help: a driver with nobody on him gets met at the rim.
  const onBall = m.opponents(holder.team).some((o) => o !== a && dist2(o, holder) < 1.8);
  const nearestHelper = m.opponents(holder.team).filter((o) => o !== a).every((o) => dist2(o, RIM_SPOT) >= dist2(a, RIM_SPOT));
  if (!onBall && rimDistance(holder) < 4 && nearestHelper) {
    goTo(a, between(holder, 1));
    if (act.kind === "drive") contestDrive(m, a, holder);
    return;
  }
  // Off the ball: sag toward the ball and the paint, closer if the player is a shooter.
  const shooter = buildOf(man).stats.shooting >= 8;
  const sag = shooter ? 0.2 : 0.38;
  const guard = between(man, 1.2);
  const spot = { x: lerp(guard.x, holder.x, sag * 0.5), z: lerp(guard.z, RIM_SPOT.z + 2, sag * 0.5) };
  const pass = m.ball.mode === "flight" && m.ball.flightKind === "pass" && m.ball.passTo === man.id;
  goTo(a, pass ? { x: m.ball.pos.x, z: m.ball.pos.z } : spot, pass ? 1 : 0.9);
}

/** Jump so the hands are at their highest as the ball leaves: a reaction delay, then up. */
function contestJumper(m: Match, a: Athlete, s: BotState, shooter: Athlete): void {
  if (shooter.action.kind !== "shoot") return;
  if (s.jumpAt === null) s.jumpAt = 0.22 + gaussian(m.rng, 0.09) + (buildOf(a).stats.speed < 6 ? 0.05 : 0) + m.bots.lateJump;
  if (shooter.action.t >= s.jumpAt && dist2(a, shooter) < 2.4) {
    m.press(a.id, "defend");
    s.jumpAt = 99;
  }
}

function contestDrive(m: Match, a: Athlete, driver: Athlete): void {
  const act = driver.action;
  if (act.kind !== "drive") return;
  const leave = act.takeoff - 0.2 + (m.rng() - 0.5) * 0.12;
  // Waiting at the rim, or trailing him close behind on the way there: the chase down from behind.
  const way = dir2(act.from, act.to);
  const trailing = (a.x - driver.x) * way.x + (a.z - driver.z) * way.z < -0.2 && dist2(a, driver) < 2.4;
  if (act.t >= leave && (dist2(a, act.to) < 2 || trailing)) m.press(a.id, "defend");
}
