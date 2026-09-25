import * as THREE from "three";
import type { StageDef } from "../../engine/stages";
import { fit, frameBox } from "./framing";

const FOV = 30;
/** The camera looks a little down on the stage, so platform tops read as floors. */
const TILT = 0.1;

export interface Subject {
  x: number;
  y: number;
}

/**
 * The side on camera. It frames every fighter still in play and zooms
 * smoothly as they spread out or bunch up. It opens wide and swoops in
 * for the countdown, closes in on the winner at the end, and shakes on
 * big hits and KOs with a trauma that fades out.
 */
export class FrameCamera {
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 400);
  private readonly at = new THREE.Vector3(0, 2, 0);
  private distance = 30;
  private aspect = 16 / 9;
  private trauma = 0;
  private time = 0;
  private readonly punchAt = new THREE.Vector2();
  private punchPower = 0;
  /** The share of the screen's height the HUD covers along the bottom, kept clear of fighters. */
  hidden = 0;
  /** A fixed shot for the showcase's hero frames, or null to follow the fight. */
  fixed: { x: number; y: number; distance: number } | null = null;

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Adds screen shake, 0 to 1. Shakes add up but never past full. */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A quick push in toward a heavy hit, easing back out. */
  punch(x: number, y: number, amount: number): void {
    this.punchAt.set(x, y);
    this.punchPower = Math.min(0.2, Math.max(this.punchPower, amount));
  }

  /**
   * Follows the subjects. `zoom` above 1 pulls back (the opening swoop);
   * `close` narrows the minimum width, for the winner's close up.
   */
  update(stage: StageDef, subjects: readonly Subject[], dt: number, opts: { zoom?: number; close?: boolean; snap?: boolean } = {}): void {
    this.time += dt;
    const want = this.fixed ?? fit(frameBox(subjects, stage, opts.close ? 7 : undefined), FOV, this.aspect, this.hidden);
    const distance = this.fixed ? want.distance : want.distance * (opts.zoom ?? 1);
    const k = opts.snap ? 1 : 1 - Math.exp(-(opts.close ? 1.6 : 2.6) * dt);
    this.at.x += (want.x - this.at.x) * k;
    this.at.y += (want.y - this.at.y) * k;
    this.distance += (distance - this.distance) * k;
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    this.punchPower = Math.max(0, this.punchPower - dt * 0.6);
    const p = this.punchPower;
    const lookX = this.at.x + (this.punchAt.x - this.at.x) * p;
    const lookY = this.at.y + (this.punchAt.y - this.at.y) * p;
    const dist = this.distance * (1 - p);
    const shake = this.trauma * this.trauma;
    const t = this.time;
    const sx = (Math.sin(t * 73) + Math.sin(t * 131) * 0.5) * shake * 0.5;
    const sy = (Math.cos(t * 67) + Math.sin(t * 117) * 0.5) * shake * 0.5;
    this.camera.position.set(lookX + sx, lookY + dist * TILT + sy, dist);
    this.camera.lookAt(lookX + sx * 0.5, lookY + sy * 0.5, 0);
    this.camera.rotateZ(Math.sin(t * 41) * shake * 0.02);
  }
}
