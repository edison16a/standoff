import { advance, knockDown, setAction } from "./athlete";
import { gain } from "./field";
import { evading } from "./juke";
import { TACKLE } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { add, clamp, dist, len, norm, scale, sub, v3 } from "./vec";

/** The player with the ball, if the ball is in someone's hands. */
export function carrierOf(state: MatchState): Athlete | null {
  const id = state.play.carrier;
  return id === null ? null : (state.athletes[id] ?? null);
}

/**
 * A tackle press. Close enough to the carrier, the defender lunges at
 * where the carrier is going; too far, nothing happens but a short wait
 * so the button cannot be mashed.
 */
export function pressTackle(state: MatchState, a: Athlete): boolean {
  if (a.tackleWait > 0 || a.action !== "free") return false;
  const c = carrierOf(state);
  if (!c || c.team === a.team || c.action === "down" || dist(c.pos, a.pos) > TACKLE.range) {
    a.tackleWait = TACKLE.idleWait;
    return false;
  }
  const lead = add(c.pos, c.vel, TACKLE.lunge * 0.5);
  setAction(a, "lunge", TACKLE.lunge);
  a.actionDir = norm(sub(lead, a.pos));
  a.tackleWait = TACKLE.lunge + TACKLE.idleWait;
  state.events.push({ type: "lunge", athlete: a.id });
  return true;
}

/** The lunge itself: a burst at the carrier that either wraps him up or ends face down in the grass. */
export function stepLunge(state: MatchState, a: Athlete, dt: number): void {
  const c = carrierOf(state);
  // Arms and shoulders track the carrier early in the lunge; once committed, the body flies on.
  if (c && c.team !== a.team && a.actionT < a.actionLen * TACKLE.homing) {
    const want = norm(sub(add(c.pos, c.vel, 0.08), a.pos));
    a.actionDir = norm(add(a.actionDir, want, Math.min(1, dt * 12)));
  }
  a.vel = scale(a.actionDir, Math.max(len(a.vel), TACKLE.lungeSpeed));
  advance(a, dt);
  if (c && !state.play.end && c.team !== a.team && c.action !== "down" && dist(c.pos, a.pos) < TACKLE.reach) {
    resolveTackle(state, a, c);
    return;
  }
  if (a.actionT >= a.actionLen) {
    knockDown(a, "missed", TACKLE.missDown);
    if (c && c.team !== a.team) state.events.push({ type: "tackle", athlete: a.id, carrier: c.id, result: "missed" });
  }
}

/** The chance a carrier shrugs off a clean hit: strength against strength, a little more at full tilt. */
export function breakChance(tackler: Athlete, carrier: Athlete): number {
  const momentum = (len(carrier.vel) * carrier.mass) / (10 * 100);
  return clamp(TACKLE.breakBase + TACKLE.breakStrength * (carrier.strength - tackler.strength) + 0.1 * momentum, 0.02, 0.45);
}

/**
 * Contact. A carrier in the middle of a juke makes it whiff and the
 * tackler goes down; otherwise it is a tackle, unless the carrier breaks
 * it. A tackled quarterback behind the line is a sack.
 */
export function resolveTackle(state: MatchState, tackler: Athlete, carrier: Athlete): void {
  const at = v3((tackler.pos.x + carrier.pos.x) / 2, 1, (tackler.pos.z + carrier.pos.z) / 2);
  if (evading(carrier)) {
    knockDown(tackler, "missed", TACKLE.missDown);
    state.events.push({ type: "tackle", athlete: tackler.id, carrier: carrier.id, result: "missed" });
    return;
  }
  state.events.push({ type: "pads", at, hard: true });
  if (state.rng.chance(breakChance(tackler, carrier))) {
    knockDown(tackler, "broken", TACKLE.brokenDown);
    carrier.vel = scale(carrier.vel, 0.55);
    state.events.push({ type: "tackle", athlete: tackler.id, carrier: carrier.id, result: "broken" });
    return;
  }
  tackler.stats.tackles++;
  state.events.push({ type: "tackle", athlete: tackler.id, carrier: carrier.id, result: "made" });
  const play = state.play;
  if (carrier.role === "qb" && !play.thrown && carrier.team === state.drive.offense && gain(state.drive.offense, state.drive.los, carrier.pos.x) < 0) {
    tackler.stats.sacks++;
    state.events.push({ type: "sack", athlete: tackler.id, qb: carrier.id });
  }
  // Both go down together, the carrier driven a little further by the hit.
  const push = scale(tackler.actionDir, 0.3);
  carrier.pos = add(carrier.pos, push);
  knockDown(carrier, "tackled", 1.3);
  knockDown(tackler, "tackled", 1.1);
  tackler.downKind = "tackled";
  carrier.vel = scale(add(carrier.vel, tackler.vel), 0.25);
  tackler.vel = scale(carrier.vel, 1);
  state.play.end = "tackle";
  state.play.spot = { ...carrier.pos };
}
