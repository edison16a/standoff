import type { Match } from "../match";
import { callRoutes, deepRoute, routePoints, STOPS } from "../routes";
import { sweepRoute } from "../run-play";
import type { Athlete } from "../types";
import { dist2 } from "../vec";
import { defenseJob } from "../support/roster";
import { botSkill } from "./skill";

/**
 * The play call before the snap. Every receiver gets a route (a person
 * who drops out mid play runs it too), the deep threat his go route, the
 * QB a moment to throw or pitch, the back on a run call a sweep, and the
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
  for (const d of m.athletes) {
    if (d.team !== m.offense || !d.deep) continue;
    d.bot.route = deepRoute(d, m.sign);
    d.bot.leg = 0;
    d.bot.stop = false;
  }
  const skill = botSkill(m.level);
  const qb = m.qbOf(m.offense);
  // Sharper QBs read the field sooner.
  qb.bot.readAt = m.rng.range(1.3, 2.4) + (1 - skill.accuracy) * 0.8;
  // Only a match with a deep threat rolls for him, so one without plays the same from the same seed.
  const threat = m.athletes.some((a) => a.team === m.offense && a.deep);
  // Only some calls have a shot for him in them; on the rest the QB looks elsewhere.
  qb.bot.key = threat && m.rng.chance(DEEP_LOOK);
  const back = m.play?.call === "run" ? m.athlete(m.play.back ?? -1) : null;
  if (back) {
    // On a run call the back sweeps wide and the QB pitches soon after the snap.
    back.bot.route = sweepRoute(back, qb, m.sign);
    back.bot.stop = false;
    qb.bot.readAt = m.rng.range(0.6, 0.9);
  }
  assignCoverage(m, receivers, threat);
  for (const a of m.athletes) a.bot.wait = 0;
}

/** How often the deep man keys the deep threat; on the other plays he takes whoever goes deepest. */
const DEEP_KEY = 0.7;

/** How often a computer QB's call has a deep shot for the deep threat in it. */
const DEEP_LOOK = 0.5;

function assignCoverage(m: Match, receivers: readonly Athlete[], threat: boolean): void {
  // Support players have their own jobs (support-defense.ts), and start every play with nobody to block.
  for (const a of m.athletes) if (a.role === "support") a.bot.cover = null;
  for (const a of m.athletes) {
    if (a.role === "support" && a.team === m.defense) a.bot.key = threat && defenseJob(a.slot) === "deep" && m.rng.chance(DEEP_KEY);
  }
  const defenders = m.athletes.filter((a) => a.team === m.defense && (a.role === "qb" || a.role === "runner"));
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
