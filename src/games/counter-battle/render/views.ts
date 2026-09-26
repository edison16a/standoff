import * as THREE from "three";
import type { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import type { TeamId } from "../engine/fighter";
import { dirOf } from "../engine/vec";
import { FighterView, type Label } from "./fighter-view";

/**
 * The fighters' views for one battle, and the moments they react to: who
 * is celebrating a win, and which way a killing shot pushed each body.
 */
export class FighterViews {
  readonly views = new Map<number, FighterView>();
  private readonly wonAt = new Map<TeamId, number>();
  private readonly push = new Map<number, { x: number; z: number }>();
  private round = 0;

  constructor(readonly battle: Battle, label: (id: number) => Label, scene: THREE.Object3D) {
    for (const f of battle.fighters) this.views.set(f.id, new FighterView(f.id, f, label(f.id), scene));
    this.round = battle.match.round;
  }

  /** True once when a new round has begun, so the field can be cleaned up. */
  newRound(): boolean {
    if (this.battle.match.round === this.round) return false;
    this.round = this.battle.match.round;
    this.wonAt.clear();
    this.push.clear();
    return true;
  }

  onEvent(e: BattleEvent): void {
    const b = this.battle;
    if (e.type === "round-end" && e.winner !== null) this.wonAt.set(e.winner, b.time);
    if (e.type === "match-end") this.wonAt.set(e.winner, this.wonAt.get(e.winner) ?? b.time);
    if (e.type === "kill") {
      const victim = b.fighters[e.victim];
      const killer = b.fighters[e.killer];
      if (!victim || !killer) return;
      // The shot's direction, in the victim's own frame: x to their left, z ahead.
      const dx = victim.pos.x - killer.pos.x;
      const dz = victim.pos.z - killer.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      const fwd = dirOf(victim.look);
      this.push.set(e.victim, { x: (dx * fwd.z - dz * fwd.x) / l, z: (dx * fwd.x + dz * fwd.z) / l });
    }
  }

  update(dt: number): void {
    const b = this.battle;
    for (const f of b.fighters) {
      const won = this.wonAt.get(f.team);
      this.views.get(f.id)?.update(f, b.time, b.match, won ?? null, dt, this.push.get(f.id) ?? { x: 0, z: -1 });
    }
  }

  dispose(): void {
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
  }
}
