import type { BrainWorld } from "./brain";
import type { Fighter } from "./fighter";
import { pathBlocked, sightBlocked } from "./geometry";
import { canPeek, peekPoints } from "./plan";
import { STYLES } from "./tactics";
import { BODY } from "./tuning";
import { dist, type V2 } from "./vec";

export function nearest(p: V2, fighters: readonly Fighter[]): Fighter | null {
  let best: Fighter | null = null;
  for (const o of fighters) if (!best || dist(p, o.pos) < dist(p, best.pos)) best = o;
  return best;
}

/**
 * Comes up out of cover to look for a shot: stands up behind low cover,
 * or steps out round tall cover to the side that sees the enemy.
 */
export function startPeek(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  const spot = w.graph.spots[b.spot]!;
  const target = nearest(f.pos, w.enemies);
  const style = STYLES[f.gun.id];
  b.stance = "peek";
  b.out = 0;
  b.timer = w.rng.range(...style.peek);
  b.peekAt = null;
  // Stopped out in the open, there is no cover to look round: up where they are.
  if (!target || b.anchor) return;
  // Out of this gun's reach a look is only a glance, and the spot gets old fast, so the fighter moves up.
  if (dist(f.pos, target.pos) > style.range + style.band * 1.5) {
    b.timer = Math.min(b.timer, 0.6);
    b.held += 1.5;
  }
  const eye = (p: V2) => ({ x: p.x, y: BODY.standEye, z: p.z });
  const chest = { x: target.pos.x, y: BODY.standTop * 0.7, z: target.pos.z };
  const options = peekPoints(spot, target.pos).filter((p) => p === spot.pos || !pathBlocked(spot.pos, p, w.pieces, BODY.radius));
  const clear = options.find((p) => !sightBlocked(eye(p), chest, w.pieces));
  const pick = clear ?? options[0] ?? spot.pos;
  b.peekAt = pick === spot.pos ? null : pick;
  // Nothing to see from here at all: this spot is done, look for a better one.
  if (!clear && !canPeek(spot, target.pos, w.pieces)) b.held += 3;
}

/** How near its peek point a fighter must be to count as out from behind tall cover, metres. */
const OUT_BY = 0.15;

/**
 * Whether a fighter is still stepping out from behind tall cover to the
 * side they peek from. A shot fired now would only paint the wall.
 */
export function steppingOut(f: Fighter): boolean {
  const b = f.brain;
  return b.stance === "peek" && b.peekAt !== null && dist(f.pos, b.peekAt) > OUT_BY;
}

/** Back down behind cover for a while, as after a burst or to reload. */
export function duckDown(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  if (b.stance === "move") return;
  b.stance = "hide";
  b.timer = w.rng.range(...STYLES[f.gun.id].hide);
}
