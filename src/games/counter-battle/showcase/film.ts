import * as THREE from "three";
import type { Battle } from "../engine/battle";
import { eyeOf } from "../engine/fighter";
import { dirOf } from "../engine/vec";
import type { BattleEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import type { BattleRenderer } from "../render/battle-renderer";
import type { Pane } from "../render/layout";
import type { FilmLights } from "./film-lights";
import { lensShot } from "./lenses";
import { filmAt, SHOTS } from "./trailer";

const FULL = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Plays the trailer through the real renderer: moves the fight on to
 * the moment each filmed frame shows, one or two engine steps a frame,
 * and points the camera for its shot. A cut that skips ahead runs the
 * fight through the gap unseen, animations and all, so the next shot
 * opens on a settled scene.
 */
export class TrailerFilm {
  private wall = 0;
  private readonly from = new THREE.Vector3();
  private readonly at = new THREE.Vector3();

  constructor(
    private readonly battle: Battle,
    private readonly renderer: BattleRenderer,
    private readonly lights: FilmLights,
  ) {
    // The fight is run up to the first shot before anything is filmed.
    this.runTo(SHOTS[0]!.from, []);
  }

  /** Draws the film `t` seconds in. `real` is the page's time since the last frame, for the crowd and the flags. */
  frame(t: number, real: number): void {
    const spot = filmAt(t);
    const panes = this.panes(spot.shot.camera.kind === "shoulder" ? spot.shot.camera.fighter : null);
    const before = this.battle.time;
    const events: BattleEvent[] = [];
    // A jump of more than a frame's worth is a cut forward: run through it unseen.
    if (spot.time - before > 0.1) this.runTo(spot.time - STEP, panes);
    while (this.battle.time < spot.time - STEP / 2) events.push(...this.battle.step());
    this.renderer.onEvents(events);
    const cam = spot.shot.camera;
    if (cam.kind === "lens") {
      const shot = lensShot(cam.lens, this.battle.fighters, spot.u);
      this.from.set(shot.from.x, shot.from.y, shot.from.z);
      this.at.set(shot.at.x, shot.at.y, shot.at.z);
      this.renderer.show.fixed = { from: this.from, at: this.at, fov: shot.fov };
    } else {
      // Over a shoulder the lights follow the fighter's own look.
      const f = this.battle.fighters[cam.fighter]!;
      const eye = eyeOf(f);
      const d = dirOf(f.look);
      this.from.set(eye.x - d.x * 3, eye.y + 0.5, eye.z - d.z * 3);
      this.at.set(eye.x + d.x * 8, eye.y, eye.z + d.z * 8);
    }
    this.lights.aim(this.from, this.at);
    this.wall += real;
    this.renderer.render(panes, Math.max(0, this.battle.time - before) || STEP * spot.shot.rate, this.wall);
  }

  /** Steps the fight to `time` without drawing, keeping every animation and effect in time with it. */
  private runTo(time: number, panes: Pane[]): void {
    while (this.battle.time < time) {
      this.renderer.onEvents(this.battle.step());
      this.wall += STEP;
      this.renderer.animate(STEP, this.wall, panes);
    }
  }

  private panes(fighter: number | null): Pane[] {
    return [{ fighter, rect: FULL }];
  }
}
