import { inContact } from "./dribble-path";
import { updateDribbleStyle } from "./dribble-style";
import type { Match } from "./match";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/** How close a defender has to be before the dribbler shields the ball from them. */
const PRESSURE = 3;
/** A crossover takes about one bounce; the side changes this fast, in body widths per second. */
const CROSS_RATE = 5;
const CROSS_COOLDOWN = 0.9;

/**
 * Which hand the ball is dribbled with. Ball handlers keep it on the
 * side away from their nearest defender, and when the defender switches
 * sides they cross it over in front of them on the next bounce. With
 * nobody close, a hard run sideways takes the ball to that side.
 */
export function updateDribbleHand(m: Match, a: Athlete, dt: number): void {
  a.crossCd = Math.max(0, a.crossCd - dt);
  if (m.ball.holder === a.id && m.ball.mode === "held") updateDribbleStyle(m, a, dt);
  if (m.ball.holder === a.id && m.ball.mode === "held" && a.action.kind === "none") {
    const rx = -Math.cos(a.yaw);
    const rz = Math.sin(a.yaw);
    let want = a.dribbleHand;
    let nearest = PRESSURE;
    for (const o of m.opponents(a.team)) {
      const d = Math.hypot(o.x - a.x, o.z - a.z);
      if (d >= nearest) continue;
      nearest = d;
      const across = (o.x - a.x) * rx + (o.z - a.z) * rz;
      if (Math.abs(across) > 0.3) want = across > 0 ? -1 : 1;
    }
    if (nearest >= PRESSURE) {
      const lateral = a.vx * rx + a.vz * rz;
      if (Math.abs(lateral) > 2.2) want = lateral > 0 ? 1 : -1;
    }
    // Only while the hand has the ball, so it is pushed across on its way to the floor.
    if (want !== a.dribbleHand && a.crossCd <= 0 && inContact(a.dribble)) switchHands(a, want);
  }
  // The ball only goes across once it has been pushed down from the old hand, and a move takes it across quicker.
  const rate = a.action.kind === "move" ? CROSS_RATE * 1.5 : CROSS_RATE;
  if (a.crossArmed) a.dribbleSide += clamp(a.dribbleHand - a.dribbleSide, -rate * dt, rate * dt);
}

/**
 * Changes the dribbling hand. With the ball in the hand it goes across
 * on this push; otherwise it comes back up into the old hand first.
 */
export function switchHands(a: Athlete, hand: 1 | -1): void {
  if (hand === a.dribbleHand) return;
  a.dribbleHand = hand;
  a.crossCd = CROSS_COOLDOWN;
  a.crossArmed = inContact(a.dribble) || a.pocket > 0;
}
