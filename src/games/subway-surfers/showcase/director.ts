import * as THREE from "three";
import type { Run } from "../engine/run";
import type { RunScene } from "../render/run-scene";
import { ShowRun } from "./show-run";

type Angle = "chase" | "front" | "side";

export interface Shot {
  seed: number;
  look: number;
  /** Seconds played before the showcase starts, to reach speed and a good stretch of yard. */
  warmup: number;
  /** Plays on from the warmup until this is true, for a still of just the right moment. */
  moment?: (run: Run) => boolean;
  /** Power ups to start with, for the look of them. */
  powers?: readonly ("hoverboard" | "boots" | "magnet")[];
  /** Which camera, by seconds into the showcase. */
  cuts: readonly (readonly [number, Angle])[];
  /** Time runs this fast. Stills barely move, so every pose has settled when the picture is taken. */
  pace: number;
}

export const SHOTS: Record<"loop" | "icon" | "poster", Shot> = {
  loop: { seed: 7, look: 0, warmup: 40, powers: ["boots"], cuts: [[0, "chase"], [3.4, "side"], [6, "chase"]], pace: 1 },
  poster: {
    seed: 11,
    look: 1,
    warmup: 30,
    moment: (run) => !run.runner.grounded && run.runner.airTime > 0.25 && Math.abs(run.runner.vy) < 2.5,
    cuts: [[0, "front"]],
    pace: 0.02,
  },
  icon: {
    seed: 11,
    look: 0,
    warmup: 22,
    powers: ["hoverboard"],
    moment: (run) => !run.runner.grounded && run.runner.airTime > 0.2 && Math.abs(run.runner.vy) < 2,
    cuts: [[0, "front"]],
    pace: 0.02,
  },
};

/**
 * Plays the showcase run and films it: the chase camera like the game,
 * or a camera running alongside or ahead, looking back at the runner.
 */
export class Director {
  private readonly show: ShowRun;
  private readonly own = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  private readonly look = new THREE.Vector3();
  private angle: Angle = "chase";

  constructor(
    private readonly shot: Shot,
    private readonly scene: RunScene,
  ) {
    this.show = new ShowRun(shot.seed, shot.warmup, (run) => shot.powers?.forEach((kind) => run.powers.start(kind)));
    if (shot.moment) for (let i = 0; i < 3600 && !shot.moment(this.show.run); i++) this.show.advance(1 / 60);
    this.show.run.drain();
    scene.setRun(this.show.run);
  }

  frame(dt: number, elapsed: number): void {
    for (const event of this.show.advance(dt * this.shot.pace)) this.scene.onEvent(event);
    for (const [at, angle] of this.shot.cuts) if (elapsed >= at) this.angle = angle;
    // Poses ease at the real frame rate, so a still settles while the run barely moves.
    this.scene.update(dt, elapsed);
  }

  camera(aspect: number): THREE.PerspectiveCamera {
    if (this.angle === "chase") {
      this.scene.chase.setAspect(aspect);
      return this.scene.chase.camera;
    }
    const s = this.show.run.runner;
    const x = s.x;
    const y = s.y;
    const z = -s.distance;
    const cam = this.own;
    cam.aspect = aspect;
    if (this.angle === "front") {
      // Ahead and low, looking back at the runner's face with the yard behind them.
      cam.fov = aspect < 1.2 ? 46 : 40;
      cam.position.set(x - 2.2, y + 1.1, z - 5.2);
      this.look.set(x - 0.3, y + 1.05, z);
    } else {
      cam.fov = 48;
      cam.position.set(x + 4.2, y + 1.8, z - 3.5);
      this.look.set(x, y + 1.1, z - 1.5);
    }
    cam.updateProjectionMatrix();
    cam.lookAt(this.look);
    return cam;
  }
}
