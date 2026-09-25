import type { PlayerState } from "./player";
import { CORE_HALF, HALF, HAZARD_HALF, SNAP, SPIKE_HALF_WIDTH, SPIKE_HEIGHT } from "./tuning";
import type { Solid } from "./types";
import type { World } from "./world";

function overlaps(x: number, y: number, half: number, left: number, bottom: number, right: number, top: number): boolean {
  return x + half > left && x - half < right && y + half > bottom && y - half < top;
}

/** How a solid met the player this step. */
type Contact = "land" | "bump" | "side" | null;

/**
 * Which face of a solid the player hit, judged from where they were a step
 * ago. Coming from above (on the gravity side) is a landing, even a little
 * below the top, which forgives a late camera jump. From the other side it
 * is a bump. Anything else is the side.
 */
function contact(p: PlayerState, prevY: number, s: Solid): Contact {
  if (!overlaps(p.x, p.y, HALF, s.x, s.y, s.x + s.w, s.y + s.h)) return null;
  const top = s.y + s.h;
  const snap = SNAP + Math.abs(p.vy) * 0.02;
  const fromAbove = prevY - HALF >= top - snap && p.vy <= 0;
  const fromBelow = prevY + HALF <= s.y + snap && p.vy >= 0;
  if (p.gravity === 1) return fromAbove ? "land" : fromBelow ? "bump" : "side";
  return fromBelow ? "land" : fromAbove ? "bump" : "side";
}

/**
 * Pushes the player out of floors, ceilings and blocks. Returns false if
 * a block killed them: a cube running into a side or hitting its head,
 * or any mode running into a side.
 */
export function resolveSolids(p: PlayerState, prevY: number, world: World): boolean {
  const near = world.solidsNear(p.x);
  const sides: Solid[] = [];
  for (const s of near) {
    const hit = contact(p, prevY, s);
    if (hit === "side") sides.push(s);
    if (hit === "land" || hit === "bump") {
      const onTop = (hit === "land") === (p.gravity === 1);
      if (hit === "bump" && p.mode === "cube") return false;
      p.y = onTop ? s.y + s.h + HALF : s.y - HALF;
      p.vy = 0;
      if (hit === "land") p.grounded = true;
    }
  }
  // Sides are judged after every landing, so walking across a seam between two blocks is safe.
  for (const s of sides) {
    if (overlaps(p.x, p.y, CORE_HALF, s.x, s.y, s.x + s.w, s.y + s.h)) return false;
  }
  return true;
}

/** Whether the player is on a spike's sharp part. Only the middle of each counts. */
export function touchesSpike(p: PlayerState, world: World): boolean {
  for (const s of world.spikesNear(p.x)) {
    const mid = s.x + 0.5;
    const bottom = s.dir === 1 ? s.y : s.y - SPIKE_HEIGHT;
    if (overlaps(p.x, p.y, HAZARD_HALF, mid - SPIKE_HALF_WIDTH, bottom, mid + SPIKE_HALF_WIDTH, bottom + SPIKE_HEIGHT)) return true;
  }
  return false;
}

/** An unused pad the player is touching, and the direction it launches. */
export function padUnder(p: PlayerState, world: World): { x: number; y: number; dir: 1 | -1 } | null {
  for (const pad of world.padsNear(p.x)) {
    if (p.usedPads.has(pad)) continue;
    const bottom = pad.dir === 1 ? pad.y : pad.y - 0.3;
    if (overlaps(p.x, p.y, HALF, pad.x + 0.1, bottom, pad.x + 0.9, bottom + 0.3)) {
      p.usedPads.add(pad);
      return pad;
    }
  }
  return null;
}

/** An unused orb within reach of the player's middle. */
export function orbInReach(p: PlayerState, world: World, reach: number): { x: number; y: number } | null {
  for (const orb of world.orbsNear(p.x)) {
    if (p.usedOrbs.has(orb)) continue;
    if (Math.abs(p.x - orb.x) < reach && Math.abs(p.y - orb.y) < reach) {
      p.usedOrbs.add(orb);
      return orb;
    }
  }
  return null;
}
