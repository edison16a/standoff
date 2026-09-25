import { planCheck, placeForCheck, freshPossession, handTo, type CheckPlan } from "./check-plan";
import { holdAtChest, returnToss, startToss, stepToss, type Toss } from "./check-toss";
import { clampToCourt, outOfBounds } from "./court";
import type { Match } from "./match";
import { CHECK } from "./tuning";
import type { Athlete, TeamId } from "./types";
import { dist2, type V2 } from "./vec";

/**
 * The break after a basket or a turnover, ending in a check up at the
 * top of the key. While the ball is dead the scorer celebrates, someone
 * from the other team picks the ball up and gets it to the checker, and
 * everyone walks to their spot. Then the check: the checker bounces it
 * to their defender, who bounces it back, and play is live. The shot
 * clock is stopped throughout and the sticks and buttons do nothing.
 */

export interface CheckUp {
  plan: CheckPlan;
  team: TeamId;
  /** Who goes to pick the ball up, once the celebration is over. */
  fetcher: number | null;
  heldFor: number;
  toss: Toss | null;
  /** How many of the two check passes have been thrown. */
  passes: number;
}

export function startDead(m: Match, next: TeamId): void {
  const b = m.ball;
  // A pass in the air when the clock ran out just drops.
  if (b.mode === "flight" && b.flightKind === "pass") {
    b.mode = "loose";
    b.flight = null;
    b.flightKind = null;
    b.passTo = null;
  }
  m.phase = "dead";
  m.phaseT = 0;
  m.nextOffence = next;
  m.checkUp = { plan: planCheck(m, next), team: next, fetcher: null, heldFor: 0, toss: null, passes: 0 };
}

/**
 * Walks a player to a point, slowing as they arrive so nobody overshoots
 * or jitters on the spot, and stepping round anyone in the way, since
 * the checker and their defender often have to pass each other.
 */
export function walkTo(m: Match, a: Athlete, to: V2, pace: number): number {
  const dx = to.x - a.x;
  const dz = to.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d <= 0.12) {
    a.move = { x: 0, z: 0 };
    return d;
  }
  const ux = dx / d;
  const uz = dz / d;
  let side = 0;
  for (const o of m.athletes) {
    const ox = o.x - a.x;
    const oz = o.z - a.z;
    const ahead = ox * ux + oz * uz;
    const across = ox * -uz + oz * ux;
    if (o === a || ahead <= 0 || ahead > Math.min(d, 1.3) || Math.abs(across) > 0.9) continue;
    // Step to whichever side they are not on; head on, the lower id keeps right.
    side += (Math.abs(across) < 0.05 ? (a.id < o.id ? 1 : -1) : -Math.sign(across)) * (1 - ahead / 1.3);
  }
  const speed = pace * Math.min(1, d / 1.4);
  const mx = ux - uz * side * 1.2;
  const mz = uz + ux * side * 1.2;
  const l = Math.hypot(mx, mz);
  a.move = { x: (mx / l) * speed, z: (mz / l) * speed };
  return d;
}

/** The nearest player on the team getting the ball goes for it. */
function chooseFetcher(m: Match, c: CheckUp): number {
  let best = c.plan.checker;
  let bestD = Infinity;
  for (const a of m.athletes) {
    const d = dist2(a, m.ball.pos);
    if (a.team === c.team && d < bestD) {
      bestD = d;
      best = a.id;
    }
  }
  return best;
}

/** The ball is dead: celebrate, fetch it, get it to the checker, and line up. */
export function updateDead(m: Match, dt: number): void {
  const c = m.checkUp;
  if (!c) return;
  const b = m.ball;
  const calm = m.phaseT < CHECK.fetchAt;
  if (!calm && c.fetcher === null) c.fetcher = chooseFetcher(m, c);
  const fetcher = c.fetcher === null ? null : m.athletes[c.fetcher]!;
  let settled = true;
  for (const a of m.athletes) {
    const spot = c.plan.spots.get(a.id)!;
    if (calm) {
      a.move = { x: 0, z: 0 };
      continue;
    }
    const chasing = a === fetcher && b.mode !== "held" && !c.toss;
    const d = walkTo(m, a, chasing ? clampToCourt(b.pos, 0.5) : spot, chasing ? 1 : CHECK.walk);
    if (chasing || d > CHECK.onSpot) settled = false;
  }
  // The fetcher scoops the ball up once it is low enough to reach.
  if (fetcher && b.mode === "loose" && b.pos.y < 1.3 && dist2(fetcher, b.pos) < 0.75) {
    handTo(m, fetcher.id);
    fetcher.dribble = 0.5;
    m.emit({ type: "catch", id: fetcher.id });
  }
  // A ball that got away into the stands is thrown back to the checker instead.
  if (fetcher && b.mode === "loose" && !c.toss && m.phaseT > CHECK.giveUp && outOfBounds(b.pos)) c.toss = returnToss(m, m.athletes[c.plan.checker]!);
  if (b.mode === "held" && b.holder !== c.plan.checker && !c.toss) {
    c.heldFor += dt;
    const holder = m.holder!;
    if (c.heldFor > CHECK.outletAfter) c.toss = startToss(m, holder, m.athletes[c.plan.checker]!, false);
  }
  const ready = settled && b.holder === c.plan.checker && m.phaseT > CHECK.minDead;
  if (ready && m.checkBeat) return startCheck(m, c);
  if (m.phaseT > (m.checkBeat ? CHECK.maxDead : CHECK.quick)) {
    // Something kept the ball away, like a ball in the stands: hurry everyone into place.
    placeForCheck(m, c.team, c.plan);
    if (m.checkBeat) return startCheck(m, c);
    goLive(m, c);
  }
}

function startCheck(m: Match, c: CheckUp): void {
  m.phase = "check";
  m.phaseT = 0;
  c.toss = null;
  freshPossession(m, c.team);
  m.emit({ type: "checkUp", team: c.team, id: c.plan.checker, defender: c.plan.defender });
}

/** The check itself: checker to defender, a beat, and back. Then play is live. */
export function updateCheck(m: Match): void {
  const c = m.checkUp;
  if (!c) return;
  for (const a of m.athletes) a.move = { x: 0, z: 0 };
  const checker = m.athletes[c.plan.checker]!;
  const defender = m.athletes[c.plan.defender]!;
  if (c.passes === 0 && m.phaseT >= CHECK.firstPass) {
    c.passes = 1;
    c.toss = startToss(m, checker, defender, true);
  } else if (c.passes === 1 && !c.toss && m.phaseT >= CHECK.secondPass) {
    c.passes = 2;
    c.toss = startToss(m, defender, checker, true);
  }
  if (c.passes < 2 || c.toss || m.phaseT < CHECK.beat) return;
  handTo(m, checker.id);
  goLive(m, c);
}

function goLive(m: Match, c: CheckUp): void {
  const checker = m.athletes[c.plan.checker]!;
  freshPossession(m, c.team);
  m.phase = "live";
  m.phaseT = 0;
  m.checkUp = null;
  m.emit({ type: "check", team: c.team, id: checker.id });
}

/**
 * Moves the ball while it is part of a check: in the air between hands,
 * or held at the chest during the check itself. Returns false when the
 * ball is left to the normal game, dribbled or bouncing free.
 */
export function stepCheckBall(m: Match, dt: number): boolean {
  const c = m.checkUp;
  if (!c) return false;
  if (c.toss) {
    if (stepToss(m, c.toss, dt)) {
      if (c.toss.to === c.plan.checker) m.emit({ type: "catch", id: c.toss.to });
      c.toss = null;
    }
    return true;
  }
  if (m.phase !== "check") return false;
  holdAtChest(m);
  return true;
}
