import * as THREE from "three";
import type { Run } from "../engine/run";
import { launchSpeed } from "../engine/motion";
import { JUMP } from "../engine/tuning";
import { frontAt, type PowerKind } from "../engine/types";
import type { RunScene } from "../render/run-scene";
import { ShowRun } from "./show-run";

type Angle = "chase" | "front" | "side" | "hero" | "pursuit" | "pursuitWide" | "cover";

export interface Shot {
  seed: number;
  look: number;
  /** Seconds played before the showcase starts, to reach speed and a good stretch of yard. */
  warmup: number;
  /** Plays on from the warmup until this is true, for a still of just the right moment. */
  moment?: (run: Run) => boolean;
  /** Sets up a still by hand once the moment comes: a pose in the air, coins round the runner. */
  stage?: (run: Run) => void;
  /** What every power up on the course becomes, or null for none. See ShowRun. */
  pickups: PowerKind | null;
  /** Cuts each power up short, so it shows for part of the clip. */
  powerSeconds?: number;
  /** Which camera, by seconds into the showcase. */
  cuts: readonly (readonly [number, Angle])[];
  /** Time runs this fast. Stills barely move, so every pose has settled when the picture is taken. */
  pace: number;
}

/** A train rolling toward the runner in another lane, its lamps lit, a little way ahead. */
function trainComing(run: Run): boolean {
  const d = run.runner.distance;
  return run.course.obstacles.some((o) => o.drift > 0 && o.lane !== run.runner.lane && frontAt(o, d) - d > 18 && frontAt(o, d) - d < 45);
}

/** Nothing standing in the runner's lane within a few metres, where a camera close by would end up inside it. */
function laneClear(run: Run): boolean {
  const d = run.runner.distance;
  return !run.course.obstacles.some((o) => {
    const front = frontAt(o, d);
    return o.lane === run.runner.lane && front < d + 12 && front + o.length > d - 8;
  });
}

/** The top of a jump, with a line of coins arcing on ahead. */
function leap(run: Run): void {
  const s = run.runner;
  s.y = 1.5;
  s.vy = 0.3;
  s.grounded = false;
  s.airTime = 0.4;
  s.rollLeft = 0;
  for (let i = 0; i < 8; i++) run.course.addCoin(s.x, 0.95 + Math.max(0, 1.6 - i * 0.3), s.distance + 7 + i * 3);
}

/** The cover's backdrop: the runner's lane clear, and a train on the next track from beside them back. */
function trainBeside(run: Run): boolean {
  const d = run.runner.distance;
  return laneClear(run) && run.course.obstacles.some((o) => o.kind === "train" && o.lane === 1 && frontAt(o, d) < d - 1 && frontAt(o, d) > d - 10);
}

/** The cover's leap: up on the hoverboard, the inspector and his dog right behind. */
function boardLeap(run: Run): void {
  chasedLeap(run);
  run.powers.start("hoverboard");
  run.chase.gap = 2.0;
  run.runner.y = 2.0;
  // Still rising fast, so the pose flings the arms up and tucks a knee: a burst, not a float.
  run.runner.vy = launchSpeed(JUMP.height) * 0.9;
}

/** A leap with the inspector and his dog close behind, and a line of coins arcing on ahead. */
function chasedLeap(run: Run): void {
  leap(run);
  run.chase.gap = 2.3;
  run.runner.y = 1.8;
}

export const SHOTS: Record<"loop" | "icon" | "poster", Shot> = {
  // The loop is the trailer's cuts (see trailer.ts). This only dresses its scene.
  loop: { seed: 7, look: 0, warmup: 0, pickups: null, cuts: [[0, "chase"]], pace: 1 },
  // Seed 7 meets a train rolling in on the next track at about 23 seconds. The runner leaps as it comes, chased.
  poster: { seed: 7, look: 0, warmup: 20, moment: (run) => run.runner.grounded && trainComing(run), stage: chasedLeap, pickups: null, cuts: [[0, "pursuitWide"]], pace: 0.005 },
  // Seed 11 in the open yard, with nothing standing close: the runner leaps high over the lens, the inspector and dog behind.
  icon: { seed: 11, look: 0, warmup: 14, moment: (run) => run.runner.grounded && run.runner.lane === 0 && trainBeside(run), stage: boardLeap, pickups: null, cuts: [[0, "cover"]], pace: 0.005 },
};

/** Where each camera sits and looks, from the runner's feet: [x, y, z] then the point it looks at. */
const PLACES: Record<Exclude<Angle, "chase">, { at: [number, number, number]; look: [number, number, number]; fov: number }> = {
  // Ahead and low, looking back at the runner's face with the yard behind them.
  front: { at: [-1.9, 1.5, -4.4], look: [-0.2, 1.05, 0], fov: 42 },
  // Running alongside, a little ahead.
  side: { at: [4.2, 1.8, -3.5], look: [0, 1.1, -1.5], fov: 48 },
  // Close and below, so the runner towers over the lens. It looks low, so the runner rides high above the icon's logo.
  hero: { at: [1.5, 0.45, -3.1], look: [0.1, 0.5, 0], fov: 52 },
  // Low ahead, looking back up at a leap, with whoever chases it in the frame behind.
  pursuit: { at: [1.2, -1.25, -2.9], look: [-0.3, 0.1, 2], fov: 68 },
  // Straight ahead and a little low, so the runner bursts out at the viewer with the chase behind.
  cover: { at: [-0.8, -0.5, -3.1], look: [0.3, 0.7, 4], fov: 60 },
  // The same, pulled back and wider for the poster.
  pursuitWide: { at: [-1.8, 0.35, -4.4], look: [0.2, 1.2, 2.5], fov: 52 },
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
    this.show = new ShowRun(shot.seed, shot.warmup, { pickups: shot.pickups, powerSeconds: shot.powerSeconds });
    if (shot.moment) {
      // Up to a minute and a half on, staying in the first zone's sunny yard.
      const run = this.show.run;
      for (let i = 0; i < 5400 && run.runner.distance < 660 && !shot.moment(run); i++) this.show.advance(1 / 60);
      clearLens(run);
      shot.stage?.(run);
    }
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
    const place = PLACES[this.angle];
    const cam = this.own;
    const z = -s.distance;
    cam.aspect = aspect;
    cam.fov = aspect < 1.2 ? place.fov + 6 : place.fov;
    cam.position.set(s.x + place.at[0], s.y + place.at[1], z + place.at[2]);
    this.look.set(s.x + place.look[0], s.y + place.look[1], z + place.look[2]);
    cam.updateProjectionMatrix();
    cam.lookAt(this.look);
    return cam;
  }
}

/** Takes away coins right in front of a still's camera, which would fill the frame. */
export function clearLens(run: Run): void {
  const d = run.runner.distance;
  const coins = run.course.coins;
  for (let i = coins.length - 1; i >= 0; i--) if (coins[i]!.z > d - 1 && coins[i]!.z < d + 6) coins.splice(i, 1);
}
