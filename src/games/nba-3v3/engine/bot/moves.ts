import { charOf } from "../athlete";
import { rimDistance } from "../court";
import type { Match } from "../match";
import { basketDir, nearestDefender, rightOf, sideOf } from "../move-pick";
import type { Athlete } from "../types";
import type { V2 } from "../vec";
import type { BotState } from "./util";

/** A defender this close, and in front, is worth a move. */
const CLOSE = 1.7;
/** Past this much heat a computer player waits, so it never spams its way into a turnover. */
const MAX_HEAT = 1.1;

/**
 * A computer ball handler with a defender square in front of it tries
 * to shake them. Shooters step back into their jumper, strong drivers
 * spin, everyone crosses over away from the defender, and now and then
 * a hesitation. It pushes the stick the same way a person would, so the
 * move is picked by the same rules. Returns true when it made a move.
 */
export function tryMove(m: Match, a: Athlete, s: BotState, jumper: number): boolean {
  if (a.moveCd > 0 || a.moveHeat > MAX_HEAT) return false;
  const d = nearestDefender(m, a, CLOSE);
  if (!d) return false;
  const f = basketDir(a);
  const ahead = (d.x - a.x) * f.x + (d.z - a.z) * f.z;
  if (ahead < 0.2) return false;
  const st = charOf(a).stats;
  const roll = m.rng();
  const away = -sideOf(a, d);
  const r = rightOf(f);
  let aim: V2 | null;
  if (st.shooting >= 8 && rimDistance(a) > 5.2 && jumper > 1.2 && roll < 0.5) {
    aim = { x: -f.x, z: -f.z };
    s.afterMove = "shoot";
  } else if (st.strength >= 7 && rimDistance(a) < 6 && roll < 0.35) {
    aim = f;
    s.afterMove = "drive";
  } else if (roll < 0.8) {
    aim = { x: r.x * away, z: r.z * away };
    s.afterMove = "drive";
  } else {
    aim = null;
    s.afterMove = "drive";
  }
  m.press(a.id, "defend", aim);
  return a.action.kind === "move";
}

