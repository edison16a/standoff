import { inFieldGoalRange, toGo } from "../downs";
import type { Match } from "../match";
import { RULES } from "../tuning";
import type { ConversionCall, PlayCall } from "../types";

/**
 * A computer QB's pick before a play. It throws on early downs and
 * kicks on fourth: a field goal in range, a punt otherwise, except on
 * fourth and short past midfield, where it goes for it. Late in the game
 * and down by three or less, it takes the points.
 */
export function botPlayCall(m: Match): PlayCall {
  const d = m.drive;
  const lead = m.score[d.offense] - m.score[m.defense];
  const late = m.quarter >= RULES.quarters && m.clock < 25;
  if (late && lead <= 0 && lead >= -3 && inFieldGoalRange(d)) return "kick";
  if (d.down < 4) return "throw";
  if (inFieldGoalRange(d) && toGo(d) > 2) return "kick";
  if (toGo(d) <= 2 && d.los >= 45) return "throw";
  // Late and behind by more than a score's worth of kicks, a punt gives up; keep throwing.
  if (late && lead < -3) return "throw";
  return "kick";
}

/** After a touchdown the bot kicks, unless two points wins it and one does not. */
export function botConversion(m: Match): ConversionCall {
  const mine = m.score[m.drive.offense];
  return mine + 2 >= m.target && mine + 1 < m.target ? "two" : "kick";
}
