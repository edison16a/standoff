import { footPoint } from "./athlete";
import { heavyTouch, takeRange } from "./build-effects";
import { firstTime } from "./buttons";
import { touch } from "./dribble";
import { BOOT_REACH, ready } from "./reach";
import { TOUCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist } from "./vec";

/**
 * The ball near a player's feet is brought under control by the nearest
 * one who can play it: on his feet, close enough (long legs reach
 * further) and, for a ball just struck, quick enough to have reacted. A
 * dribbled ball is the dribbler's while it is at his boot; between his
 * touches an opponent who gets there first takes it off him. A player
 * who pressed Shoot as it arrived hits it first time.
 */
export function tryControl(state: MatchState): void {
  const ball = state.ball;
  const shotLive = state.flight !== null && !state.flight.resolved;
  if (shotLive || ball.inGoal !== null || ball.pos.y > 0.95 || ball.owner?.kind === "keeper") return;
  const owner = ball.owner?.kind === "athlete" ? state.athletes[ball.owner.id] : undefined;
  if (owner && owner.action !== "free" && owner.action !== "hurdle") return;
  const ownerGap = owner ? dist(footPoint(owner), ball.pos) : Infinity;
  let best: Athlete | null = null;
  let bestD = Infinity;
  for (const a of state.athletes) {
    if (a === owner || (owner && a.team === owner.team) || a.action === "header" || !ready(state, a)) continue;
    const d = dist(footPoint(a), ball.pos);
    if (d > TOUCH.controlRange + takeRange(a) || d >= bestD) continue;
    // Off a dribbler only once it has run out of his reach and he is clearly beaten to it; within it, it is a challenge (tackle.ts).
    if (owner && (ownerGap < BOOT_REACH || d > ownerGap - 0.2)) continue;
    best = a;
    bestD = d;
  }
  if (!best) return;
  if (owner) {
    best.stats.tackles++;
    owner.noTouch = 0.35;
    state.events.push({ type: "tackle", athlete: best.id, victim: owner.id, won: true });
  }
  receive(state, best);
}

/**
 * The first touch. It takes the pace off the ball, more of it for a
 * good touch, and plays it on into the player's stride the way he is
 * going. What the touch cannot kill stays in the ball: a hard pass to
 * a poor touch runs away from him, and a really heavy one cannons off
 * the boot and is nobody's.
 */
function receive(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const rng = state.rng;
  const rx = ball.vel.x - a.vel.x;
  const rz = ball.vel.z - a.vel.z;
  const rel = Math.hypot(rx, ball.vel.y, rz);
  const flat = Math.max(1e-6, Math.hypot(rx, rz));
  const left = rel * heavyTouch(a) * 0.7 + 0.18 * Math.max(0, rel - 14);
  const from = ball.lastTouch?.team ?? null;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.passTo = null;
  if (left > 3.5) {
    // A heavy touch: the ball cannons off the boot.
    ball.owner = null;
    ball.vel = { x: a.vel.x + (rx / flat) * left + rng.gauss(), y: Math.abs(rng.gauss()) * 0.8, z: a.vel.z + (rz / flat) * left + rng.gauss() };
    ball.struckAt = state.time;
    a.noTouch = 0.3;
    return;
  }
  ball.owner = { kind: "athlete", id: a.id };
  ball.heldFor = 0;
  a.brain.carried = 0;
  touch(state, a, "push");
  // What the touch did not kill carries on the way the ball was going.
  ball.vel.x += (rx / flat) * left * 0.6 + rng.gauss() * left * 0.25;
  ball.vel.z += (rz / flat) * left * 0.6 + rng.gauss() * left * 0.25;
  state.events.push({ type: "control", athlete: a.id, team: a.team, from });
  // A first time kick, aimed the way the stick pointed when Shoot/Pass was pressed.
  firstTime(state, a);
}
