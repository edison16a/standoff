import * as THREE from "three";
import { PAPER_COLOURS, StageLights, VictoryConfetti } from "@/games/kit/victory";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";
import type { TeamId } from "../../engine/types";
import { TEAMS } from "../../roster";
import { TrophyGrip } from "./trophy-grip";

/** Where the confetti cannons stand, round behind the team and off its flanks, from the spot. */
const CANNONS: readonly { x: number; z: number }[] = [
  { x: -4.4, z: -1.4 },
  { x: 4.4, z: -1.4 },
  { x: -2.6, z: -3.6 },
  { x: 2.6, z: -3.6 },
  { x: 0, z: -4.6 },
];

/** Where the spotlights point, from the spot: the captain's chest, where the trophy starts. */
const AIM = new THREE.Vector3(0, 1.3, 0);

/** What the scene needs to know of the ceremony each frame. */
export interface CeremonyFrame {
  t: number;
  team: TeamId;
}

/**
 * The ceremony's set on the court, from the victory kit's pieces: the
 * championship trophy in the captain's hands, spotlights that fade up as
 * the picture cuts in and flare as the trophy goes up, and confetti in
 * the winners' colours from cannons round the team, then a rain that
 * lasts as long as the ceremony. `dim` says how far to bring the arena's
 * own lights down, so the spotlights own the picture.
 */
export class CeremonyScene {
  readonly group = new THREE.Group();
  private readonly grip = new TrophyGrip();
  private readonly lights: StageLights;
  private confetti: VictoryConfetti | null = null;
  private active = false;
  private fired = false;
  dim = 0;

  constructor() {
    this.lights = new StageLights({ count: 6, colours: ["#fff3dc", "#ffd27a", "#fff3dc"], radius: 6, height: 12, intensity: 1500, angle: 0.2, beamStrength: 0.24, sweep: 0.35 });
    this.lights.object.position.set(CEREMONY_SPOT.x, 0, CEREMONY_SPOT.z);
    this.lights.aimAt(AIM);
    this.lights.setLevel(0);
    // Hidden lamps drop out of every shader, so the game never pays for spotlights it is not using.
    this.lights.object.visible = false;
    this.group.add(this.grip.object, this.lights.object);
  }

  /** Every frame. `left` and `right` are the captain's hands in the world, or null with no captain. */
  update(frame: CeremonyFrame | null, left: THREE.Vector3 | null, right: THREE.Vector3 | null, dt: number, time: number): void {
    if (!frame) {
      if (this.active) this.stop();
      return;
    }
    if (!this.active) this.start(frame.team);
    const t = frame.t;
    if (!this.fired && t >= CEREMONY.up - 0.05) this.fire();
    // Up with the cut, and a flare as the trophy goes over his head.
    const flare = Math.max(0, 1 - Math.abs(t - CEREMONY.up) / 0.6);
    this.lights.setLevel(Math.min(1, t / 1.2) * (0.8 + 0.5 * flare));
    this.lights.update(time, dt);
    this.dim = Math.min(1, t / 1.2) * 0.55;
    this.confetti?.update(dt);
    const lift = Math.max(0, Math.min(1, (t - CEREMONY.raise) / (CEREMONY.up - CEREMONY.raise)));
    if (left && right) this.grip.hold(left, right, t, lift * lift * (3 - 2 * lift));
    this.grip.object.visible = !!(left && right);
  }

  private start(team: TeamId): void {
    this.active = true;
    this.fired = false;
    const side = TEAMS[team];
    this.confetti = new VictoryConfetti({ count: 2400, size: 0.055, colours: [side.color, side.trim, side.dark, "#ffd166", ...PAPER_COLOURS.slice(0, 2)], foil: 0.3, physics: { floorY: 0 }, seed: 23 });
    this.group.add(this.confetti.object);
    this.lights.object.visible = true;
    // A little already drifting down as the scene opens, so the air is never empty.
    this.confetti.startRain({ x: CEREMONY_SPOT.x, y: 9, z: CEREMONY_SPOT.z }, 4.5, 30);
  }

  /**
   * The trophy is up: every cannon at once, and the rain gets heavy. The
   * cannons stand behind the team and off to its flanks, angled up and
   * in over it, so none fires across the cameras in front.
   */
  private fire(): void {
    this.fired = true;
    const confetti = this.confetti;
    if (!confetti) return;
    for (const c of CANNONS) {
      const at = { x: CEREMONY_SPOT.x + c.x, y: 0.2, z: CEREMONY_SPOT.z + c.z };
      confetti.burst(at, { direction: { x: -c.x * 0.09, y: 1, z: -c.z * 0.06 + 0.12 }, count: 300, speed: 14, spread: 0.3 });
    }
    confetti.startRain({ x: CEREMONY_SPOT.x, y: 10, z: CEREMONY_SPOT.z - 0.5 }, 5, 110);
  }

  private stop(): void {
    this.active = false;
    this.dim = 0;
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
