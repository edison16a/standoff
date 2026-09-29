import * as THREE from "three";
import type { Ceremony } from "../../engine/ceremony";
import type { AthleteView } from "../athlete-view";
import { ceremonyCamera } from "./ceremony-camera";
import { CeremonyScene } from "./ceremony-scene";

/** What one player does in the ceremony, for their animation. */
export interface CeremonyRole {
  role: "captain" | "mate" | "loser";
  /** Seconds since the cut. */
  t: number;
  /** A per player offset, so teammates clap and jump out of step. */
  phase: number;
}

const left = new THREE.Vector3();
const right = new THREE.Vector3();

/**
 * Ties the ceremony to the court's renderer: who plays which part, the
 * set with the trophy in the captain's hands, and the camera's shot.
 * The ceremony itself is run by the host (`engine/ceremony.ts`); this
 * only reads it.
 */
export class CeremonyStage {
  readonly scene = new CeremonyScene();
  /** The camera's shot this frame, while the ceremony runs. */
  readonly camera = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 34 };
  private run: Ceremony | null = null;

  get active(): boolean {
    return this.run !== null;
  }

  set(run: Ceremony | null): void {
    this.run = run;
  }

  roleOf(id: number): CeremonyRole | null {
    const run = this.run;
    if (!run) return null;
    if (id === run.captain) return { role: "captain", t: run.t, phase: 0 };
    const mate = run.mates.indexOf(id);
    if (mate >= 0) return { role: "mate", t: run.t, phase: mate + 1 };
    return { role: "loser", t: run.t, phase: id };
  }

  /** After the players have been posed: the trophy into the captain's hands, the lights, the confetti and the shot. */
  update(views: readonly AthleteView[], dt: number, time: number): void {
    const run = this.run;
    const captain = run && run.captain !== null ? views[run.captain] : undefined;
    const l = captain ? captain.hand("L", left) : null;
    const r = captain ? captain.hand("R", right) : null;
    this.scene.update(run ? { t: run.t, team: run.team } : null, l, r, dt, time);
    if (!run) return;
    const shot = ceremonyCamera(run.t);
    this.camera.pos.set(shot.pos.x, shot.pos.y, shot.pos.z);
    this.camera.look.set(shot.look.x, shot.look.y, shot.look.z);
    this.camera.fov = shot.fov;
  }

  dispose(): void {
    this.scene.dispose();
  }
}
