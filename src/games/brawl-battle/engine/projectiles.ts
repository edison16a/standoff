import { applyStrike, hittable, touches } from "./combat";
import { mainSurface } from "./stages";
import type { MatchState, Projectile } from "./types";

/**
 * Bolts, slashes and shockwaves: they fly straight, fizzle after a while, break on the
 * main platform, and vanish on the first fighter they touch.
 */
export function stepProjectiles(state: MatchState, dt: number): void {
  const { blast } = state.stage;
  const main = mainSurface(state.stage);
  state.projectiles = state.projectiles.filter((p) => {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.life--;
    if (p.life <= 0) return false;
    if (p.pos.x < blast.left || p.pos.x > blast.right || p.pos.y < blast.bottom || p.pos.y > blast.top) return false;
    if (main.bottom !== null && p.pos.x > main.x1 && p.pos.x < main.x2 && p.pos.y < main.top && p.pos.y > main.bottom) return false;
    return !strikeFirst(state, p);
  });
}

/** Hits the first fighter the bolt touches. True if it hit and is spent. */
function strikeFirst(state: MatchState, p: Projectile): boolean {
  const owner = state.fighters[p.owner];
  if (!owner) return true;
  for (const target of state.fighters) {
    if (target === owner || !hittable(target) || !touches(target, p.pos.x, p.pos.y, p.r)) continue;
    const side = (p.vel.x === 0 ? (target.pos.x >= p.pos.x ? 1 : -1) : Math.sign(p.vel.x)) as 1 | -1;
    applyStrike(state, owner, target, {
      hit: p.hit,
      sound: p.sound,
      heavy: p.hit.damage >= 12,
      unblockable: false,
      side,
      x: p.pos.x,
      y: p.pos.y,
      ult: false,
      ranged: true,
    });
    return true;
  }
  return false;
}
