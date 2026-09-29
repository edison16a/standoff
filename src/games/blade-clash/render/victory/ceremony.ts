import * as THREE from "three";
import { OrbitCamera, PAPER_COLOURS, StageLights, VictoryConfetti } from "@/games/kit/victory";
import type { Slot } from "@/games/blade-clash/players";
import { PLAYER_COLOURS } from "../player-colours";
import { SHOT, stageCeremony, type Placement, type Staging } from "./staging";

/** Seconds for the spotlights to come up. */
const FADE_S = 1.2;
const GOLD = ["#ffd76a", "#fff3c4", "#f2b53a"];

const hex = (colour: number) => `#${colour.toString(16).padStart(6, "0")}`;

/**
 * The winner's ceremony on the dais once the match is won: a cut to one
 * full screen shot circling the champion, sword held high under
 * spotlights, with confetti in their colour and gold coming down, and
 * the loser on one knee behind them. It says where each fighter stands
 * and drives the camera; the fighters' poses come from the engine.
 */
export class Ceremony {
  readonly group = new THREE.Group();
  readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 150);
  private readonly lights: StageLights;
  private readonly orbit: OrbitCamera;
  private confetti: VictoryConfetti | null = null;
  private staging: Staging | null = null;
  private winner: Slot | null = null;
  private level = 0;
  private time = 0;

  constructor() {
    this.lights = new StageLights({ count: 4, colours: ["#fff1d6", "#ffd27a"], radius: 4.4, height: 9, intensity: 140, angle: 0.2, beamStrength: 0.16, sweep: 0.25 });
    this.lights.setLevel(0);
    // Hidden lamps drop out of every shader, so the duel never pays for four spotlights it does not use.
    this.lights.object.visible = false;
    this.group.add(this.lights.object);
    this.orbit = new OrbitCamera(this.camera, SHOT);
  }

  get active(): boolean {
    return this.staging !== null;
  }

  /** Cuts to the ceremony for `winner`, on a dais whose top is `floor` high. */
  start(winner: Slot, floor: number): void {
    const staging = stageCeremony(winner);
    this.staging = staging;
    const confetti = this.confettiFor(winner, floor);
    this.winner = winner;
    this.level = 0;
    this.lights.object.position.y = floor;
    this.lights.aimAt(new THREE.Vector3(0, 0, 0));
    this.lights.setLevel(0);
    this.lights.object.visible = true;
    this.orbit.play({ centre: { x: 0, y: floor, z: 0 }, startAngle: staging.startAngle });
    // Cannons in a ring round the champion, then a steady fall over the dais for as long as the ceremony lasts.
    confetti.cannons({ x: 0, y: floor, z: 0 }, { ring: 3.4, cannons: 4, count: 240, speed: 12 });
    confetti.startRain({ x: 0, y: floor + 8, z: 0 }, 4, 110);
  }

  stop(): void {
    this.staging = null;
    this.lights.object.visible = false;
    this.lights.setLevel(0);
    this.confetti?.clear();
  }

  /** Where the ceremony stands a fighter, or null outside it. */
  place(slot: Slot): Placement | null {
    if (!this.staging || this.winner === null) return null;
    return slot === this.winner ? this.staging.winner : this.staging.loser;
  }

  /** Every frame, in seconds: the lights fade up and sweep, the confetti falls and the camera circles. */
  update(dt: number): void {
    this.time += dt;
    if (!this.staging) return;
    this.level = Math.min(1, this.level + dt / FADE_S);
    this.lights.setLevel(this.level);
    this.lights.update(this.time, dt);
    this.confetti?.update(dt);
    this.orbit.update(dt);
  }

  dispose(): void {
    this.lights.dispose();
    this.confetti?.dispose();
  }

  /** Confetti in the champion's colour. It is built for each winner, since its colours are fixed when made. */
  private confettiFor(winner: Slot, floor: number): VictoryConfetti {
    if (this.confetti && this.winner === winner) {
      this.confetti.clear();
      return this.confetti;
    }
    if (this.confetti) {
      this.group.remove(this.confetti.object);
      this.confetti.dispose();
    }
    const own = hex(PLAYER_COLOURS[winner]);
    const colours = [own, ...GOLD, own, "#ffffff", ...PAPER_COLOURS.slice(0, 3)];
    this.confetti = new VictoryConfetti({ count: 1600, size: 0.06, colours, foil: 0.25, physics: { floorY: floor }, seed: 9 });
    this.group.add(this.confetti.object);
    return this.confetti;
  }
}
