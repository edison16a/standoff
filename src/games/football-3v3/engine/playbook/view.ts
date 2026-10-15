import type { Match } from "../match";
import type { V2 } from "../vec";

/** How much of each runner's route the big screen draws before the snap, metres. */
export const ARROW_LENGTH = 7;

/** One runner of the play on the big screen: his number (1 to 4, his colour) and the start of his route. */
export interface PlayRunnerView {
  id: number;
  n: number;
  /** The first few metres of his route from where he stands, before the snap; null while the QB is still picking. */
  arrow: V2[] | null;
}

/**
 * The four runners marked on the big screen for a person's QB, so he
 * knows who is who on his card: from the page of plays, through the line
 * up with each route's first steps drawn, and on into the play while he
 * can still throw. Null when there is nothing to mark.
 */
export interface PlaybookView {
  stage: "picking" | "set" | "live";
  runners: PlayRunnerView[];
}

/** The start of a route: from where he stands along the waypoints, cut at ARROW_LENGTH metres. */
export function arrowOf(from: V2, route: readonly V2[], length = ARROW_LENGTH): V2[] {
  const out: V2[] = [{ x: from.x, z: from.z }];
  let left = length;
  let at = from;
  for (const p of route) {
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    if (d < 1e-6) continue;
    if (d >= left) {
      out.push({ x: at.x + ((p.x - at.x) * left) / d, z: at.z + ((p.z - at.z) * left) / d });
      return out;
    }
    out.push({ x: p.x, z: p.z });
    left -= d;
    at = p;
  }
  return out;
}

export function playbookView(m: Match): PlaybookView | null {
  const qb = m.qbOf(m.offense);
  if (m.filmed || qb.auto) return null;
  if (m.huddle) return { stage: "picking", runners: m.huddle.runners.map((id, i) => ({ id, n: i + 1, arrow: null })) };
  const play = m.play;
  if (!play?.design || play.runners.length === 0) return null;
  if (m.phase === "presnap") {
    // A blocker on a run gets no arrow: he only steps up into his man.
    const arrow = (id: number, i: number) => (play.design!.routes[i] === "block" && id !== play.back ? null : arrowOf(m.athletes[id]!, m.athletes[id]!.bot.route));
    return { stage: "set", runners: play.runners.map((id, i) => ({ id, n: i + 1, arrow: arrow(id, i) })) };
  }
  // Into the play the rings stay while the ball is still his to throw, then they get out of the way.
  if (m.phase !== "live" || play.passed || play.qbRun || play.pitched || m.carrier()?.id !== qb.id) return null;
  return { stage: "live", runners: play.runners.map((id, i) => ({ id, n: i + 1, arrow: null })) };
}
