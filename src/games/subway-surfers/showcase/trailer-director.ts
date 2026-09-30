import * as THREE from "three";
import type { RunScene } from "../render/run-scene";
import { clearLens } from "./director";
import { ShowRun } from "./show-run";
import { continues, placeAt, spotAt, type Cut } from "./timeline";
import { unblock } from "./unblock";

/** Half the width of open track, in metres. Platforms start at 5.4 and walls near 6. */
const CORRIDOR = 4.8;

/**
 * Cuts seeded runs together like a trailer. Each hard cut plays a fresh
 * run up to its moment unseen, then films it from its angle, at its
 * speed. The cuts repeat, and poses and sparkle move on run time, so
 * the same moment of the loop always looks the same.
 */
export class TrailerDirector {
  private readonly own = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  private readonly target = new THREE.Vector3();
  private show: ShowRun | null = null;
  private on = "";
  private cut: Cut;
  private progress = 0;
  private runTime = 0;
  private aspect = 16 / 9;
  private readonly middle = new THREE.Vector3();

  constructor(
    private readonly cuts: readonly Cut[],
    private readonly scene: RunScene,
  ) {
    this.cut = cuts[0]!;
  }

  frame(elapsed: number): void {
    const spot = spotAt(this.cuts, elapsed);
    const cycle = Math.floor(elapsed / this.cuts.reduce((sum, cut) => sum + cut.seconds, 0));
    const on = `${cycle}:${spot.index}`;
    if (on !== this.on) {
      const prev = this.cuts[spot.index - 1];
      const carryOn = this.show !== null && prev !== undefined && this.on.endsWith(`:${spot.index - 1}`) && continues(prev, spot.cut);
      this.on = on;
      if (!carryOn) this.enter(spot.cut);
    }
    this.cut = spot.cut;
    this.progress = spot.progress;
    const dt = Math.max(0, spot.runTime - this.runTime);
    this.runTime = spot.runTime;
    for (const event of this.show!.advance(dt)) this.scene.onEvent(event);
    if (spot.cut.clearLens) clearLens(this.show!.run);
    this.scene.coinScale = this.unblocker();
    this.scene.update(dt, spot.runTime);
  }

  camera(aspect: number): THREE.PerspectiveCamera {
    this.aspect = aspect;
    const place = placeAt(this.cut, this.progress);
    if (!place) {
      this.scene.chase.setAspect(aspect);
      return this.scene.chase.camera;
    }
    const s = this.show!.run.runner;
    const z = -s.distance;
    const cam = this.own;
    cam.aspect = aspect;
    cam.fov = place.fov;
    // Kept between the station platforms and walls, so a camera beside an outer lane never ends up inside them.
    cam.position.set(THREE.MathUtils.clamp(s.x + place.at[0], -CORRIDOR, CORRIDOR), s.y + place.at[1], z + place.at[2]);
    this.target.set(s.x + place.look[0], s.y + place.look[1], z + place.look[2]);
    cam.updateProjectionMatrix();
    cam.lookAt(this.target);
    return cam;
  }

  /**
   * Keeps coins off the runner and out of the lens for a placed camera, in the drawing only.
   * The chase camera sits behind and above, as in play, so it needs none.
   */
  private unblocker() {
    if (this.cut.angle === "chase") return null;
    const s = this.show!.run.runner;
    return unblock(this.camera(this.aspect), this.middle.set(s.x, s.y + 1, -s.distance));
  }

  /** A hard cut: the run from scratch, played unseen up to the cut's moment, with a moment more for the camera to settle. */
  private enter(cut: Cut): void {
    const settle = Math.min(0.6, cut.from);
    this.show = new ShowRun(cut.seed, cut.from - settle, { pickups: cut.pickups ?? null });
    this.scene.setRun(this.show.run);
    this.runTime = cut.from - settle;
    for (let t = 0; t < settle - 1e-6; t += 1 / 30) {
      const dt = Math.min(1 / 30, settle - t);
      this.runTime += dt;
      for (const event of this.show.advance(dt)) this.scene.onEvent(event);
      if (cut.clearLens) clearLens(this.show.run);
      this.scene.update(dt, this.runTime);
    }
    this.runTime = cut.from;
  }
}
