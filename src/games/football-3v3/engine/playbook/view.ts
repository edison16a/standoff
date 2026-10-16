import { YARD, yardToX } from "../field";
import type { Match } from "../match";
import { hotRunner } from "../throw-highlight";
import type { V2 } from "../vec";
import { CARD } from "./card";

/** One runner of the play on the big screen: his number (1 to 4, his colour) and his route. */
export interface PlayRunnerView {
  id: number;
  n: number;
  /** His whole route from where he stands, as far downfield as the card shows, before the snap; null while the QB is still picking. */
  arrow: V2[] | null;
  /** The QB's finger rests on his throw button: he lights up, the rest step back. */
  hot: boolean;
}

/**
 * The four runners marked on the big screen for a person's QB, so he
 * knows who is who on his card: from the page of plays, through the line
 * up with each route drawn on the turf, and on into the play while he
 * can still throw. Null when there is nothing to mark.
 */
export interface PlaybookView {
  stage: "picking" | "set" | "live";
  runners: PlayRunnerView[];
}

/**
 * A runner's whole route from where he stands, every leg and cut of it,
 * cut where it passes `limit` on x going `sign` (the top edge of the
 * card), so the turf shows what the card shows. Pure.
 */
export function routeArrow(from: V2, route: readonly V2[], limit: number, sign: 1 | -1): V2[] {
  const out: V2[] = [{ x: from.x, z: from.z }];
  let at = from;
  for (const p of route) {
    if ((p.x - limit) * sign > 0) {
      const span = (p.x - at.x) * sign;
      const k = span > 1e-6 ? Math.max(0, (limit - at.x) * sign) / span : 0;
      out.push({ x: at.x + (p.x - at.x) * k, z: at.z + (p.z - at.z) * k });
      return out;
    }
    out.push({ x: p.x, z: p.z });
    at = p;
  }
  return out;
}

export function playbookView(m: Match): PlaybookView | null {
  const qb = m.qbOf(m.offense);
  if (m.filmed || qb.auto) return null;
  if (m.huddle) return { stage: "picking", runners: m.huddle.runners.map((id, i) => ({ id, n: i + 1, arrow: null, hot: false })) };
  const play = m.play;
  if (!play?.design || play.runners.length === 0) return null;
  const limit = yardToX(m.offense, m.drive.los) + m.sign * CARD.ahead * YARD;
  if (m.phase === "presnap") {
    // A blocker on a run gets no arrow: he only steps up into his man.
    const arrow = (id: number, i: number) => (play.design!.routes[i] === "block" && id !== play.back ? null : routeArrow(m.athletes[id]!, m.athletes[id]!.bot.route, limit, m.sign));
    return { stage: "set", runners: play.runners.map((id, i) => ({ id, n: i + 1, arrow: arrow(id, i), hot: false })) };
  }
  // Into the play the rings stay while the ball is still his to throw, then they get out of the way.
  if (m.phase !== "live" || play.passed || play.qbRun || play.pitched || m.carrier()?.id !== qb.id) return null;
  const hot = hotRunner(m);
  // The lit runner shows what is left of his route, when the computer runs it; a person's route is wherever he steers.
  const rest = (id: number) => {
    const a = m.athletes[id]!;
    return id === hot && a.auto ? routeArrow(a, a.bot.route.slice(a.bot.leg), limit, m.sign) : null;
  };
  return { stage: "live", runners: play.runners.map((id, i) => ({ id, n: i + 1, arrow: rest(id), hot: id === hot })) };
}
