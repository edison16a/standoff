import type { Match } from "../match";
import { callRoutes, routePoints, STOPS } from "../routes";
import type { Athlete } from "../types";
import { dist2 } from "../vec";
import { botSkill } from "./skill";

/**
 * The play call before the snap. Every receiver gets a route (a person
 * who drops out mid play runs it too), the QB a moment to throw, and the
 * computer defenders a man to cover, nearest first. A defender left over
 * rushes the QB.
 */
export function planPlay(m: Match): void {
  const receivers = m.athletes.filter((a) => a.team === m.offense && a.role === "runner");
  const routes = callRoutes(m.rng, receivers.length);
  receivers.forEach((r, i) => {
    const kind = routes[i]!;
    r.bot.route = routePoints(kind, r, m.sign);
    r.bot.leg = 0;
    r.bot.stop = STOPS.has(kind);
  });
  const skill = botSkill(m.level);
  const qb = m.qbOf(m.offense);
  // Sharper QBs read the field sooner.
  qb.bot.readAt = m.rng.range(1.3, 2.4) + (1 - skill.accuracy) * 0.8;
  assignCoverage(m, receivers);
  for (const a of m.athletes) a.bot.wait = 0;
}

function assignCoverage(m: Match, receivers: readonly Athlete[]): void {
  const defenders = m.athletes.filter((a) => a.team === m.defense && a.role !== "lineman");
  for (const d of defenders) {
    d.bot.cover = null;
    // A spare defender blitzes about half the time and otherwise sits deep as a safety.
    d.bot.rush = m.rng.chance(0.5);
  }
  // Runners cover first; the defensive QB covers only when a receiver is left.
  const pool = [...defenders].sort((a, b) => (a.role === b.role ? a.slot - b.slot : a.role === "runner" ? -1 : 1));
  const taken = new Set<number>();
  for (const r of receivers) {
    let best: Athlete | null = null;
    for (const d of pool) {
      if (taken.has(d.id)) continue;
      if (!best || (d.role === "runner" && best.role !== "runner") || (d.role === best.role && dist2(d, r) < dist2(best, r))) best = d;
    }
    if (!best) break;
    best.bot.cover = r.id;
    taken.add(best.id);
  }
}
