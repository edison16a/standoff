import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { otherSlot, SLOTS, type Slot } from "@/games/blade-clash/players";
import type { TrailStyle } from "../fighter/characters";
import { seeded } from "../kit/textures";
import { PLAYER_COLOURS } from "../player-colours";
import { BladeTrail } from "./blade-trail";
import { Confetti } from "./confetti";
import { Impacts } from "./impact";
import { Sparks } from "./sparks";

/** Where the fighters' blades are this frame, in the world, and how each one streaks. */
export interface Blades {
  tip: Record<Slot, THREE.Vector3>;
  mid: Record<Slot, THREE.Vector3>;
  /** Where each fighter's chest is, for the final burst when the hit point is gone. */
  chest: Record<Slot, THREE.Vector3>;
  style: Record<Slot, TrailStyle | null>;
}

/** Sparks off a clash take the blades' own colours: hot steel is gold, a blade of light throws its own colour. */
function clashColour(blades: Blades): [number, number] {
  const tint = (slot: Slot) => {
    const style = blades.style[slot];
    if (!style) return 0xffc34d;
    if (style.colour === null) return PLAYER_COLOURS[slot];
    return style.pixel ? style.colour : 0xffc34d;
  };
  return [tint(1), tint(2)];
}

/**
 * Every effect in the arena, fed by the game's event stream: the blade
 * trails, a shower of sparks where blades clash, a flash where a hit
 * lands, the big burst after the final hit and confetti for the winner.
 * Fight effects run on the game clock and slow down with it. Confetti
 * keeps the wall clock.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly trails: Record<Slot, BladeTrail> = { 1: new BladeTrail(PLAYER_COLOURS[1]), 2: new BladeTrail(PLAYER_COLOURS[2]) };
  private readonly sparks: Sparks;
  private readonly impacts = new Impacts();
  private readonly confetti: Confetti;
  /** Where the last hit landed, kept for the final burst. */
  private contact: THREE.Vector3 | null = null;

  constructor(seed = 7) {
    const random = seeded(seed);
    this.sparks = new Sparks(random);
    this.confetti = new Confetti(random);
    this.group.add(this.trails[1].mesh, this.trails[2].mesh, this.sparks.mesh, this.impacts.group, this.confetti.mesh);
  }

  /** Called every frame with the blades, on the game clock `t`. */
  track(blades: Blades, visible: Record<Slot, boolean>, t: number): void {
    for (const slot of SLOTS) {
      this.trails[slot].setStyle(blades.style[slot]);
      if (visible[slot]) this.trails[slot].add(blades.tip[slot], blades.mid[slot], t);
      else this.trails[slot].clear();
    }
  }

  /** Starts whatever the event calls for. `floor` lifts engine points, which stand on the floor, onto the dais. */
  react(event: GameEvent, blades: Blades, t: number, wallNow: number, floor: number): void {
    switch (event.type) {
      case "clash": {
        const at = new THREE.Vector3(event.at.x, event.at.y + floor, event.at.z);
        const s = event.strength;
        const [a, b] = clashColour(blades);
        // A fast spray of hot streaks, a slower fall of embers, both in the blades' colours.
        this.sparks.burst(at, t, { count: Math.round(60 + 120 * s), speed: 3.5 + 4.5 * s, lifeMs: 460, colour: a });
        this.sparks.burst(at, t, { count: Math.round(30 + 70 * s), speed: 2.5 + 3 * s, lifeMs: 600, colour: b });
        this.sparks.burst(at, t, { count: Math.round(16 + 30 * s), speed: 1.1, lifeMs: 1000, colour: 0xffe7a8 });
        this.impacts.fire(at, t, { size: 0.16 + 0.2 * s, lifeMs: 160, colour: 0xfff1c0, ring: false });
        return;
      }
      case "hit": {
        const at = new THREE.Vector3(event.at.x, event.at.y + floor, event.at.z);
        this.contact = at;
        const colour = PLAYER_COLOURS[event.attacker];
        this.sparks.burst(at, t, { count: 60, speed: 2.6, lifeMs: 700, colour });
        this.sparks.burst(at, t, { count: 30, speed: 4.5, lifeMs: 340, colour: 0xffffff });
        this.impacts.fire(at, t, { size: event.final ? 0.4 : 0.26, lifeMs: 360, colour });
        return;
      }
      case "finish": {
        const at = this.contact ?? blades.chest[otherSlot(event.winner)].clone();
        this.contact = null;
        this.sparks.burst(at, t, { count: 180, speed: 7, lifeMs: 700 });
        this.sparks.burst(at, t, { count: 90, speed: 3.2, lifeMs: 950, colour: PLAYER_COLOURS[event.winner] });
        this.impacts.fire(at, t, { size: 0.42, lifeMs: 520, colour: PLAYER_COLOURS[event.winner] });
        return;
      }
      case "matchWon":
        this.confetti.launch(blades.chest[event.winner].x, wallNow);
        return;
    }
  }

  /** Moves everything on, once a frame: `t` on the game clock, `wallNow` on the page's. */
  update(t: number, wallNow: number): void {
    this.trails[1].update(t);
    this.trails[2].update(t);
    this.sparks.update(t);
    this.impacts.update(t);
    this.confetti.update(wallNow);
  }

  /** Turns what faces the camera toward the view about to be drawn. */
  face(camera: THREE.Camera): void {
    this.impacts.face(camera);
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
