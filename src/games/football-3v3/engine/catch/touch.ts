import type { PassInfo } from "../ball";
import { isDown, statsOf } from "../body";
import { swatFactor } from "../build-effects";
import { botSkill } from "../bots/skill";
import type { Match } from "../match";
import type { Athlete } from "../types";
import type { V3 } from "../vec";
import { bobble, swat } from "./deflect";
import { catchOdds } from "./odds";
import { holdChance } from "../pass-meter";
import { caught, intercepted } from "./outcome";
import { playFor } from "./eligible";
import { noteCatch } from "./plan";
import { tracePath } from "./path";
import { meetHands, reachOf } from "./reach";

/**
 * Hands meeting the ball. Every sub step the ball's short path is
 * checked against every player's reach; the first hands it passes
 * through get their go, and the odds come from how it arrived there.
 */

/** A player gets one go at the ball, then another only after it has been knocked about. */
const AGAIN = 0.3;
/** A defender's hands are not a receiver's: picks are harder than catches. */
const PICK = 0.8;
/** Into the chest: this close to the body the hands take it at once. */
const NEAR = 0.25;

/** How close another player's hands came to the ball: they fight for it. */
function contest(m: Match, a: Athlete, ball: V3): number {
  let best = Infinity;
  for (const o of m.athletes) {
    if (o.team === a.team || o.role === "lineman" || isDown(o)) continue;
    best = Math.min(best, Math.hypot(o.x - ball.x, o.z - ball.z) - 0.3);
  }
  return Math.max(0, best);
}

function odds(m: Match, a: Athlete, ball: V3, gap: number, radius: number): number {
  const f = m.ball.flight!;
  const s = Math.hypot(f.vel.x, f.vel.z) || 1;
  // The ball coming at his face is +1: his facing against the ball's way across the ground.
  const facing = -(Math.sin(a.yaw) * f.vel.x + Math.cos(a.yaw) * f.vel.z) / s;
  const speed = Math.hypot(f.vel.x - a.vx, f.vel.y, f.vel.z - a.vz);
  // A pitch is a soft toss into hands that see it all the way.
  const pitch = m.ball.pass?.pitch ?? false;
  const stretch = (gap / radius) * (pitch ? 0.5 : 1);
  return catchOdds({ stretch, speed, facing: pitch ? 1 : facing, contest: contest(m, a, ball), diving: a.action.kind === "dive", hands: statsOf(a).hands });
}

/** The ball was knocked about: anyone may go again, and the readers read its new path. */
/** Is the ball still getting nearer the hands, against the player's own run? */
function closing(vel: V3, a: Athlete, near: { ball: V3; hand: V3 }): boolean {
  const dx = near.ball.x - near.hand.x;
  const dy = near.ball.y - near.hand.y;
  const dz = near.ball.z - near.hand.z;
  return dx * (vel.x - a.vx) + dy * vel.y + dz * (vel.z - a.vz) < 0;
}

function knocked(m: Match, pass: PassInfo): void {
  pass.tipped = true;
  pass.path = tracePath(m.ball.flight!, m.time);
}

/**
 * Checks the hands along the ball's last sub step, from `from` to where
 * it is now. Returns true once someone holds it.
 */
export function touchBall(m: Match, from: V3): boolean {
  const pass = m.ball.pass;
  const f = m.ball.flight;
  if (!pass || !f) return false;
  for (const a of m.athletes) {
    const play = playFor(m, a, pass);
    if (!play || (pass.tried[a.id] ?? -Infinity) > m.time - AGAIN) continue;
    const reach = reachOf(a);
    const near = meetHands(from, f.pos, reach);
    if (near.gap > reach.radius) continue;
    // The hands take it at its nearest: while it is still coming in, let it come.
    if (closing(f.vel, a, near) && near.gap > reach.radius * NEAR) continue;
    pass.tried[a.id] = m.time;
    if (play === "swat") {
      // A bad ball is easier to get a hand on; a perfect one is past him.
      const chance = Math.min(0.9, botSkill(m.level).accuracy * 0.45 * swatFactor(statsOf(a)) * pass.quality.pick);
      if (!m.rng.chance(chance)) continue;
      swat(f, a, near.hand, m.rng);
      knocked(m, pass);
      noteCatch(m, a, "swatted", play);
      m.emit({ type: "breakUp", id: a.id });
      continue;
    }
    // The defender who read the throw is set for it; anyone else picking it off is reacting.
    const base = odds(m, a, near.ball, near.gap, reach.radius);
    // The throw meter's timing: a good ball sticks, a hot one pops out, a floater hangs for the defence.
    const p = play === "catch" ? holdChance(base, pass.quality) : Math.min(0.98, base * pass.quality.pick * (a.id !== pass.interceptor ? PICK : 1));
    if (m.rng.chance(p)) {
      if (play === "catch") caught(m, a);
      else intercepted(m, a, pass.from);
      // Caught out of bounds is no catch: the move finishes empty handed.
      noteCatch(m, a, m.ball.holder === a.id ? "held" : "dropped", play);
      return true;
    }
    bobble(f, a, near.hand, m.rng);
    knocked(m, pass);
    noteCatch(m, a, "dropped", play);
    m.emit({ type: "tip", id: a.id });
  }
  return false;
}
