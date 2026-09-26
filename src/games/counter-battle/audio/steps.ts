import type { Battle } from "../engine/battle";
import { place, type Ear } from "./mix";
import type { Sfx } from "./sfx";

/** Metres between footfalls at a run, and the slowest pace that still makes a sound. */
const STRIDE = 0.85;
const MOVING = 0.7;
/** Other fighters' feet are heard only this close to a player. */
const EARSHOT = 12;

/**
 * Footsteps on the turf for every fighter on the move: a footfall each
 * stride, loud for a player's own fighter and for anyone running close
 * by, so a flanker can be heard coming.
 */
export class Footsteps {
  private readonly walked = new Map<number, number>();

  constructor(private readonly sfx: Sfx) {}

  update(b: Battle, ears: readonly Ear[], dt: number): void {
    if (b.match.phase !== "fight") return;
    for (const f of b.fighters) {
      const speed = Math.hypot(f.vel.x, f.vel.z);
      if (!f.alive || speed < MOVING) {
        this.walked.set(f.id, STRIDE * 0.6);
        continue;
      }
      const walked = (this.walked.get(f.id) ?? 0) + speed * dt;
      if (walked < STRIDE) {
        this.walked.set(f.id, walked);
        continue;
      }
      this.walked.set(f.id, walked - STRIDE);
      const p = place(f.pos, ears, b.fighters, f.id);
      if (p.own || p.distance < EARSHOT) this.sfx.step(p, speed > 3);
    }
  }
}
