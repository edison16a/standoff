import * as THREE from "three";
import type { MatchState } from "../../engine/types";
import type { Effects } from "../effects/effects";
import { Shot, ShotKit } from "./shot";

const POOL = 10;

/**
 * Everything in flight: bolts, orbs, flying slashes, floor waves and
 * falling stars, each with its own look (see shot.ts) in its owner's
 * colour. Drawn from a small pool, blended between engine steps like the
 * fighters.
 */
export class ProjectileView {
  readonly group = new THREE.Group();
  private readonly kit = new ShotKit();
  private readonly shots: Shot[] = [];

  constructor(private readonly fx: Effects) {
    for (let i = 0; i < POOL; i++) {
      const shot = new Shot(this.kit);
      this.shots.push(shot);
      this.group.add(shot.group);
    }
  }

  /** Called before each engine step, so shots can blend between steps. */
  remember(state: MatchState): void {
    for (const shot of this.shots) {
      const p = state.projectiles.find((q) => q.id === shot.id);
      if (p) shot.prev.set(p.pos.x, p.pos.y);
    }
  }

  update(state: MatchState, alpha: number, time: number): void {
    const live = new Set(state.projectiles.map((p) => p.id));
    for (const shot of this.shots) if (shot.id !== -1 && !live.has(shot.id)) shot.hide();
    for (const p of state.projectiles) {
      let shot = this.shots.find((s) => s.id === p.id);
      const colour = this.fx.colourOf(p.owner);
      if (!shot) {
        shot = this.shots.find((s) => s.id === -1);
        if (!shot) continue;
        shot.begin(p, colour);
      }
      const x = shot.prev.x + (p.pos.x - shot.prev.x) * alpha;
      const y = shot.prev.y + (p.pos.y - shot.prev.y) * alpha;
      shot.group.visible = true;
      shot.place(p, x, y, time, this.fx, colour, this.kit.roll);
    }
  }

  dispose(): void {
    for (const shot of this.shots) shot.dispose();
    this.kit.dispose();
  }
}
