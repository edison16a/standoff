import type { Match } from "./match";

/**
 * A phone takes over a teammate, as when it passes to a computer player
 * and becomes the receiver. The player it leaves is played by the
 * computer from here, with nothing held, and the new one starts from
 * a still stick. Returns false when the switch makes no sense.
 */
export function handOver(m: Match, from: number, to: number): boolean {
  const a = m.athletes[from];
  const b = m.athletes[to];
  if (!a || !b || a === b || a.team !== b.team || a.auto || !b.auto) return false;
  m.setAuto(from, true);
  m.setAuto(to, false);
  b.move = { x: 0, z: 0 };
  return true;
}
