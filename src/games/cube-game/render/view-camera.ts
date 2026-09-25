import * as THREE from "three";
import type { PlayerState } from "../engine/player";

const FOV = 26;
/** The camera sits a little left of the play, so blocks show their sides. */
const YAW = THREE.MathUtils.degToRad(7);
/**
 * Its eye is this far below the middle of the view, looking slightly up,
 * which puts the horizon low: a band of floor grid under a big sky.
 */
const EYE_DROP = 1.6;

/**
 * One view's camera: a long lens looking at the level from the side, so
 * the game plays as flat as the original while the blocks keep their
 * depth. It leads the player so there is room to see what comes, rises
 * when the player climbs high, and can shake and punch in.
 */
/** How a showcase shot frames the player: blocks of level from bottom to top, where across the view they sit, and how far below them the floor is. */
export interface Framing {
  height: number;
  across: number;
  floor: number;
}

export class ViewCamera {
  /** Set for showcase shots, which frame the action closer than play does. */
  framing: Framing | null = null;
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 600);
  /** Blocks of level visible from the bottom of the view to the top. */
  height = 11;
  private x = 0;
  private y = 4;
  private shakeLeft = 0;
  private punchLeft = 0;
  private ready = false;

  get distance(): number {
    return this.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    // A wide half of a split screen shows fewer blocks up and down, so each looks as big as in one player.
    this.height = this.framing?.height ?? (aspect > 2.4 ? 8.6 : 11);
    this.camera.updateProjectionMatrix();
  }

  shake(amount = 1): void {
    this.shakeLeft = Math.max(this.shakeLeft, 0.35 * amount);
  }

  punch(): void {
    this.punchLeft = 0.4;
  }

  /** Jumps straight to the player, for a new attempt. */
  snap(state: PlayerState): void {
    this.ready = false;
    this.follow(state, 0, 0);
  }

  follow(state: PlayerState | null, dt: number, time: number): void {
    const width = this.height * this.camera.aspect;
    const bottom = this.framing?.floor ?? 1.4;
    const floorView = this.height / 2 - bottom;
    const px = state?.x ?? this.x - width * 0.2;
    const py = state?.y ?? 0.5;
    const targetX = px + width * (0.5 - (this.framing?.across ?? 0.3));
    // Stay put near the floor, and follow only when the player climbs into the top part of the view.
    const targetY = Math.max(floorView, py - this.height * 0.18);
    if (!this.ready) {
      this.x = targetX;
      this.y = targetY;
      this.ready = true;
    } else {
      this.x = targetX;
      this.y += (targetY - this.y) * Math.min(1, dt * 3.5);
    }
    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    this.punchLeft = Math.max(0, this.punchLeft - dt);
    const shake = this.shakeLeft * this.shakeLeft * 3;
    const punch = Math.sin((this.punchLeft / 0.4) * Math.PI) * 0.05;
    const d = this.distance * (1 - punch);
    const jitterX = Math.sin(time * 71) * shake;
    const jitterY = Math.cos(time * 53) * shake;
    this.camera.position.set(this.x - d * Math.tan(YAW) + jitterX, this.y - EYE_DROP + jitterY, d);
    this.camera.lookAt(this.x + jitterX, this.y + jitterY, 0);
  }

  get centerX(): number {
    return this.x;
  }

  /** Where the floor's far edge meets the sky, as a height on a backdrop this far behind the play. */
  horizonAt(depth: number, floorReach: number): number {
    const { y, z } = this.camera.position;
    return y + (0 - y) * ((z + depth) / (z + floorReach));
  }
}
