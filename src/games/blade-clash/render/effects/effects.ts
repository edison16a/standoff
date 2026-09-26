import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { otherSlot, type Slot } from "@/games/blade-clash/players";
import { seeded } from "../kit/textures";
import { PLAYER_COLOURS } from "../player-colours";
import { BladeTrail } from "./blade-trail";
import { Confetti } from "./confetti";
import { Impacts } from "./impact";
import { Sparks } from "./sparks";

/** Where the fighters' blades are this frame, in the world. */
export interface Blades {
  tip: Record<Slot, THREE.Vector3>;
  mid: Record<Slot, THREE.Vector3>;
  /** Where each fighter's chest is, for the final burst when the hit point is gone. */
  chest: Record<Slot, THREE.Vector3>;
}

/**
 * Every effect in the hall, fed by the game's event stream: the blade
 * trails, sparks where blades clash, a flash where a hit lands, the big
 * burst after the final hit and confetti for the winner. Fight effects run
 * on the game clock and slow down with it. Confetti keeps the wall clock.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly trails: Record<Slot, BladeTrail> = { 1: new BladeTrail(PLAYER_COLOURS[1]), 2: new BladeTrail(PLAYER_COLOURS[2]) };
  private readonly sparks: Sparks;
  private readonly impacts = new Impacts();
  private readonly confetti: Confetti;
  /** Where the last hit landed, kept for the final burst. */
  contact: THREE.Vector3 | null = null;

  constructor(seed = 7) {
    const random = seeded(seed);
    this.sparks = new Sparks(random);
    this.confetti = new Confetti(random);
    this.group.add(this.trails[1].mesh, this.trails[2].mesh, this.sparks.mesh, this.impacts.group, this.confetti.mesh);
  }

  /** Called every frame with the blades, on the game clock `t`. */
  track(blades: Blades, visible: Record<Slot, boolean>, t: number): void {
    for (const slot of [1, 2] as const) {
      if (visible[slot]) this.trails[slot].add(blades.tip[slot], blades.mid[slot], t);
      else this.trails[slot].clear();
    }
  }

  /**
   * Starts whatever the event calls for. `floor` lifts engine points, which
   * stand on the floor, onto the podium. Returns the point it happened at,
   * for the lights, when it has one.
   */
  react(event: GameEvent, blades: Blades, t: number, wallNow: number, floor: number): THREE.Vector3 | null {
    switch (event.type) {
      case "clash": {
        const at = new THREE.Vector3(event.at.x, event.at.y + floor, event.at.z);
        this.sparks.burst(at, t, { count: Math.round(70 + 150 * event.strength), speed: 3.5 + 4 * event.strength, lifeMs: 560 });
        this.impacts.fire(at, t, { size: 0.3 + 0.3 * event.strength, lifeMs: 240, colour: 0xffd27a });
        return at;
      }
      case "hit": {
        const at = new THREE.Vector3(event.at.x, event.at.y + floor, event.at.z);
        this.contact = at;
        this.sparks.burst(at, t, { count: 40, speed: 2.2, lifeMs: 800, colour: PLAYER_COLOURS[event.attacker] });
        this.impacts.fire(at, t, { size: event.final ? 0.5 : 0.34, lifeMs: 380, colour: PLAYER_COLOURS[event.attacker] });
        return at;
      }
      case "finish": {
        const at = this.contact ?? blades.chest[otherSlot(event.winner)].clone();
        this.contact = null;
        this.sparks.burst(at, t, { count: 220, speed: 7.5, lifeMs: 700 });
        this.sparks.burst(at, t, { count: 80, speed: 3.5, lifeMs: 900, colour: PLAYER_COLOURS[event.winner] });
        this.impacts.fire(at, t, { size: 0.75, lifeMs: 560, colour: PLAYER_COLOURS[event.winner] });
        return at;
      }
      case "matchWon":
        this.confetti.launch(blades.chest[event.winner].x, wallNow);
        return null;
      default:
        return null;
    }
  }

  update(t: number, wallNow: number, camera: THREE.Camera): void {
    this.trails[1].update(t);
    this.trails[2].update(t);
    this.sparks.update(t);
    this.impacts.update(t, camera);
    this.confetti.update(wallNow);
  }

  /** Drops the trails and shockwave rings, which read as smears in a frozen frame. */
  freeze(): void {
    this.trails[1].clear();
    this.trails[2].clear();
    this.impacts.hideRings();
  }

  /** A new match: nothing from the last one carries over. */
  reset(): void {
    this.trails[1].clear();
    this.trails[2].clear();
    this.sparks.clear();
    this.impacts.clear();
    this.confetti.clear();
    this.contact = null;
  }

  dispose(): void {
    this.trails[1].dispose();
    this.trails[2].dispose();
    this.sparks.dispose();
    this.impacts.dispose();
    this.confetti.dispose();
  }
}
