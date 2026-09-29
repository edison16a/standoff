import * as THREE from "three";
import { PAPER_COLOURS, StageLights, VictoryConfetti } from "@/games/kit/victory";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";
import type { CeremonyView } from "../../engine/view";
import { TEAMS } from "../../teams";
import { TrophyGrip } from "./trophy-grip";

/** Where the cannons stand round the side, behind it and off its flanks. */
const CANNONS: readonly { x: number; z: number }[] = [
  { x: -5, z: -1.4 },
  { x: 5, z: -1.4 },
  { x: -3, z: -3.8 },
  { x: 3, z: -3.8 },
  { x: 0, z: -4.6 },
];

/** Where the spotlights point: the captain's chest, where the trophy starts. */
const AIM = new THREE.Vector3(CEREMONY_SPOT.x, 1.3, CEREMONY_SPOT.z - 0.4);

/**
 * The presentation's set on the field, from the victory kit: the trophy
 * in the captain's hands, spotlights that fade up with the cut and flare
 * as it goes up, and confetti in the winners' colours fired from cannons
 * round the side, then raining down for as long as the scene lasts.
 */
export class CeremonyScene {
  readonly group = new THREE.Group();
  private readonly grip = new TrophyGrip();
  private readonly lights: StageLights;
  private confetti: VictoryConfetti | null = null;
  private active = false;
  private fired = false;

  constructor() {
    this.lights = new StageLights({ count: 5, colours: ["#fff3dc", "#dfe8ff", "#fff3dc"], radius: 7, height: 13, intensity: 1500, angle: 0.22, beamStrength: 0.22, sweep: 0.3 });
    this.lights.aimAt(AIM);
    this.lights.setLevel(0);
    // Hidden lamps drop out of every shader, so a game never pays for spotlights it does not use.
    this.lights.object.visible = false;
    this.group.add(this.grip.object, this.lights.object);
  }

  /** Every frame. `left` and `right` are the captain's hands in the world, or null with no captain. */
  update(ceremony: CeremonyView | null, left: THREE.Vector3 | null, right: THREE.Vector3 | null, dt: number, time: number): void {
    if (!ceremony) {
      if (this.active) this.stop();
      return;
    }
    if (!this.active) this.start(ceremony);
    const t = ceremony.t;
    if (!this.fired && t >= CEREMONY.up - 0.05) this.fire();
    // Up with the cut, and a flare as the trophy goes over his head.
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
    const colours = [team.color, team.trim, team.color, "#ffffff", "#ffd166", ...PAPER_COLOURS.slice(0, 2)];
    this.confetti = new VictoryConfetti({ count: 2400, size: 0.06, colours, foil: 0.3, physics: { floorY: 0 }, seed: 17 });
    this.group.add(this.confetti.object);
    this.lights.object.visible = true;
    // A little already drifting down as the scene opens, so the air is never empty.
    this.confetti.startRain({ x: CEREMONY_SPOT.x, y: 10, z: CEREMONY_SPOT.z }, 5, 30);
  }

  /**
   * The trophy is up: every cannon at once, and the rain gets heavy. The
   * cannons stand behind the side and off to its flanks, angled up and in
   * over it, so none fires across the cameras in front.
   */
  private fire(): void {
    this.fired = true;
    const confetti = this.confetti;
    if (!confetti) return;
    for (const c of CANNONS) {
      const at = { x: CEREMONY_SPOT.x + c.x, y: 0.2, z: CEREMONY_SPOT.z + c.z };
      confetti.burst(at, { direction: { x: -c.x * 0.09, y: 1, z: -c.z * 0.06 + 0.12 }, count: 300, speed: 15, spread: 0.3 });
    }
    confetti.startRain({ x: CEREMONY_SPOT.x, y: 11, z: CEREMONY_SPOT.z - 0.5 }, 5.5, 110);
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
