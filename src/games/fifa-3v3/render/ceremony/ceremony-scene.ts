import * as THREE from "three";
import { PAPER_COLOURS, StageLights, VictoryConfetti } from "@/games/kit/victory";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";
import type { CeremonyView } from "../../engine/view";
import { TEAMS } from "../../teams";
import { TrophyGrip } from "./trophy-grip";

/** Where the spotlights point: the captain's chest, where the cup starts. */
const AIM = new THREE.Vector3(CEREMONY_SPOT.x, 1.2, CEREMONY_SPOT.z);

/**
 * The trophy ceremony's set on the pitch, from the kit's pieces: the
 * World Cup style trophy in the captain's hands, spotlights that fade up
 * as the scene cuts in and flare as the cup goes up, and confetti in the
 * winners' colours fired from cannons round the side, then raining down
 * for as long as the ceremony lasts.
 */
export class CeremonyScene {
  readonly group = new THREE.Group();
  private readonly grip = new TrophyGrip();
  private readonly lights: StageLights;
  private confetti: VictoryConfetti | null = null;
  private active = false;
  private fired = false;

  constructor() {
    this.lights = new StageLights({ count: 5, colours: ["#fff3dc", "#ffd27a", "#fff3dc"], radius: 6, height: 12, intensity: 1400, angle: 0.2, beamStrength: 0.22, sweep: 0.3 });
    this.lights.aimAt(AIM);
    this.lights.setLevel(0);
    // Hidden lamps drop out of every shader, so the match never pays for spotlights it does not use.
    this.lights.object.visible = false;
    this.group.add(this.grip.object, this.lights.object);
  }

  /**
   * Every frame. `left` and `right` are the captain's hands in the world,
   * or null when there is no captain to hold the cup.
   */
  update(ceremony: CeremonyView | null, left: THREE.Vector3 | null, right: THREE.Vector3 | null, dt: number, time: number): void {
    if (!ceremony) {
      if (this.active) this.stop();
      return;
    }
    if (!this.active) this.start(ceremony);
    const t = ceremony.t;
    if (!this.fired && t >= CEREMONY.up - 0.05) this.fire();
    // Up with the cut, and a flare as the cup goes over his head.
    const flare = Math.max(0, 1 - Math.abs(t - CEREMONY.up) / 0.6);
    this.lights.setLevel(Math.min(1, t / 1.2) * (0.8 + 0.5 * flare));
    this.lights.update(time, dt);
    this.confetti?.update(dt);
    if (left && right) this.grip.hold(left, right, t);
    this.grip.object.visible = !!(left && right);
  }

  private start(ceremony: CeremonyView): void {
    this.active = true;
    this.fired = false;
    const team = TEAMS[ceremony.team];
    this.confetti = new VictoryConfetti({ count: 2600, size: 0.07, colours: [team.kit.shirt, team.kit.trim, team.color, "#ffd166", ...PAPER_COLOURS.slice(0, 2)], foil: 0.3, physics: { floorY: 0 }, seed: 11 });
    this.group.add(this.confetti.object);
    this.lights.object.visible = true;
    this.lights.aimAt(AIM);
    // A little already drifting down as the scene opens, so the air is never empty.
    this.confetti.startRain({ x: CEREMONY_SPOT.x, y: 9, z: CEREMONY_SPOT.z }, 4.5, 30);
  }

  /** The cup is up: every cannon at once, and the rain gets heavy. */
  private fire(): void {
    this.fired = true;
    const at = { x: CEREMONY_SPOT.x, y: 0.2, z: CEREMONY_SPOT.z - 0.4 };
    this.confetti?.cannons(at, { ring: 4.2, cannons: 6, count: 300, speed: 14 });
    this.confetti?.startRain({ x: CEREMONY_SPOT.x, y: 10, z: CEREMONY_SPOT.z }, 5, 140);
  }

  private stop(): void {
    this.active = false;
    this.lights.setLevel(0);
    this.lights.object.visible = false;
    this.grip.object.visible = false;
    if (this.confetti) {
      this.group.remove(this.confetti.object);
      this.confetti.dispose();
      this.confetti = null;
    }
  }

  dispose(): void {
    this.stop();
    this.lights.dispose();
    this.grip.dispose();
  }
}
