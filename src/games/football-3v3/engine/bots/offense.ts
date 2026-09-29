import { attackSign } from "../../teams";
import { isDown } from "../body";
import { jumpingDefender } from "../catching";
import { FIELD, YARD, yardToX } from "../field";
import { startJuke } from "../juke";
import type { Match } from "../match";
import { receivers, throwTo } from "../passing";
import { PASS } from "../tuning";
import { startDive } from "../tackle";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";
import { ahead, headFor, runDir } from "./goal";
import type { FootballSkill } from "./skill";

const defendersOf = (m: Match, a: Athlete) => m.athletes.filter((d) => d.team !== a.team && d.role !== "lineman" && !isDown(d));

/** How open a receiver is: room from the nearest defender, a little extra for depth, and no defender sat in front. */
function openness(m: Match, qb: Athlete, r: Athlete, skill: FootballSkill): number {
  const near = Math.min(99, ...defendersOf(m, qb).map((d) => dist2(d, r)));
  const depth = Math.max(0, (r.x - yardToX(m.offense, m.drive.los)) * m.sign);
  const from = { x: qb.x, y: PASS.releaseHeight, z: qb.z };
  const trap = jumpingDefender(m, qb, from, ahead(r, 0.8), r) ? 6 * skill.accuracy : 0;
  return near + depth * 0.03 - trap + m.rng.gauss((1 - skill.accuracy) * 2);
}

/**
 * A computer QB: drops back, reads the receivers, and throws to the most
 * open one when the read is done or the pocket closes. With nobody open
 * for long, it tucks the ball and runs.
 */
export function readField(m: Match, qb: Athlete, skill: FootballSkill): void {
  const t = m.play?.sinceSnap ?? 0;
  const threat = defendersOf(m, qb).reduce((n, d) => Math.min(n, dist2(d, qb)), 99);
  const pressure = threat < 3.2;
  const options = receivers(m, qb);
  if (options.length > 0 && (t >= qb.bot.readAt || pressure)) {
    let best: Athlete | null = null;
    let bestOpen = -Infinity;
    for (const r of options) {
      const o = openness(m, qb, r, skill);
      if (o > bestOpen) {
        best = r;
        bestOpen = o;
      }
    }
    if (best && (bestOpen >= 3 || pressure || t > qb.bot.readAt + 1.2)) {
      qb.aim = { x: best.x - qb.x, z: best.z - qb.z };
      throwTo(m, qb, best.id);
      qb.aim = null;
      qb.bot.goal = { x: 0, z: 0 };
      return;
    }
  }
  if (options.length === 0 || t > qb.bot.readAt + 3.5) return carry(m, qb, skill);
  const drop = { x: yardToX(m.offense, m.drive.los) - m.sign * 7.5 * YARD, z: qb.z };
  headFor(qb, drop, 1.5);
}

/**
 * A computer ball carrier heads for the end zone, bending away from
 * tacklers and the sideline, jukes a lunging defender when it sees one
 * coming, and dives for the line when it is close and about to be hit.
 */
export function carry(m: Match, a: Athlete, skill: FootballSkill): void {
  // After an interception the carrier's own team is the one heading the other way.
  const sign = attackSign(a.team);
  const dir: V2 = { x: sign, z: 0 };
  const goalX = sign * FIELD.goalX;
  for (const d of defendersOf(m, a)) {
    const dx = a.x - d.x;
    const dz = a.z - d.z;
    const dd = Math.hypot(dx, dz);
    if (dd > 9 || dd < 1e-3) continue;
    const inFront = (d.x - a.x) * dir.x > -1 ? 1.6 : 0.6;
    dir.z += (dz / (dd * dd)) * 5 * inFront;
    dir.x += (dx / (dd * dd)) * 1.2 * inFront * 0.3;
    if (d.action.kind === "lunge" && d.action.target === a.id && dd < 3.5 && m.rng.chance(skill.juke)) {
      a.move = { x: -dz / dd, z: dx / dd };
      startJuke(a, (e) => m.emit(e));
    }
  }
  // Keep off the sideline.
  const edge = FIELD.halfWidth - 3;
  if (Math.abs(a.z) > edge) dir.z -= Math.sign(a.z) * (Math.abs(a.z) - edge) * 0.6;
  const toGoal = Math.abs(goalX - a.x);
  const hit = defendersOf(m, a).some((d) => dist2(d, a) < 2);
  if (toGoal < 2.5 && hit) startDive(m, a);
  runDir(a, dir);
}

/** A receiver runs the route, or, with the ball in the air to them, goes to meet it. */
export function runRoute(m: Match, a: Athlete): void {
  const pass = m.ball.pass;
  if (m.ball.state === "pass" && pass && pass.to === a.id) return headFor(a, pass.spot, 0.6);
  const route = a.bot.route;
  if (route.length === 0) return headFor(a, a, 1);
  while (a.bot.leg < route.length && dist2(a, route[a.bot.leg]!) < 1.3) a.bot.leg++;
  if (a.bot.leg < route.length) return headFor(a, route[a.bot.leg]!, 0.5);
  const last = route[route.length - 1]!;
  if (a.bot.stop) return headFor(a, last, 1.5);
  const prev = route[route.length - 2] ?? a;
  runDir(a, { x: last.x - prev.x, z: last.z - prev.z });
}

/** Teammates of the ball carrier get in the way of the nearest tackler. */
export function escort(m: Match, a: Athlete, carrier: Athlete): void {
  const threats = defendersOf(m, carrier);
  if (threats.length === 0) return runDir(a, { x: attackSign(a.team), z: 0 });
  const t = threats.reduce((n, d) => (dist2(d, carrier) < dist2(n, carrier) ? d : n));
  headFor(a, { x: (t.x + carrier.x) / 2, z: (t.z + carrier.z) / 2 }, 0.8);
}
