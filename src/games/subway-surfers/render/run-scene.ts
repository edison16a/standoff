import * as THREE from "three";
import type { RunEvent } from "../engine/events";
import type { Run } from "../engine/run";
import { GuardView } from "./actors/guard-view";
import { RunnerView, type Mood } from "./actors/runner-view";
import { ChaseCamera } from "./chase-camera";
import { RunEffects } from "./effects/run-effects";
import { CollectibleView } from "./world/collectibles";
import { ObstacleView } from "./world/obstacle-view";
import { Scenery } from "./world/scenery";
import { Sky } from "./world/sky";
import { lightAt, newLight } from "./world/themes";

const FOG_NEAR = 45;
const FOG_FAR = 185;

/**
 * Everything one player sees: their own copy of the yard, their runner,
 * the guard, the sparks and the camera behind them. Two players get two
 * of these, drawn side by side, sharing every model and material.
 */
export class RunScene {
  readonly scene = new THREE.Scene();
  readonly chase = new ChaseCamera();
  readonly runner: RunnerView;
  readonly effects = new RunEffects();
  private readonly guard = new GuardView();
  private readonly scenery: Scenery;
  private readonly obstacles = new ObstacleView();
  private readonly collectibles = new CollectibleView();
  private readonly sky = new Sky();
  private readonly sun = new THREE.DirectionalLight(0xffffff, 2.5);
  private readonly hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1.2);
  private readonly fog = new THREE.Fog(0xffffff, FOG_NEAR, FOG_FAR);
  private readonly light = newLight();
  private dark = 0;
  run: Run | null = null;

  constructor(
    readonly seed: number,
    look: number,
    environment: THREE.Texture | null,
  ) {
    this.scenery = new Scenery(seed);
    this.runner = new RunnerView(look);
    this.scene.fog = this.fog;
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.55;
    this.sun.position.set(6, 12, 4);
    this.scene.add(this.sky.mesh, this.sun, this.sun.target, this.hemi);
    this.scene.add(this.scenery.group, this.obstacles.group, this.collectibles.group, this.runner.root, this.guard.root, this.effects.group);
  }

  setRun(run: Run): void {
    this.run = run;
    this.obstacles.clear();
    this.collectibles.clear();
    this.effects.clear();
    this.chase.reset(run);
  }

  onEvent(event: RunEvent): void {
    if (!this.run) return;
    this.effects.onEvent(event, this.run);
    if (event.type === "crash") this.chase.bump(1.4);
    if (event.type === "stumble") this.chase.bump(0.6);
    if (event.type === "saved") this.chase.bump(0.9);
    if (event.type === "land" && event.speed > 12) this.chase.bump(0.3);
  }

  /** Moves everything to where the run is now. `mood` poses a runner with no run going. */
  update(dt: number, time: number, mood: Mood = "run"): void {
    const run = this.run;
    if (!run) return;
    const d = run.runner.distance;
    this.scenery.update(d);
    this.obstacles.update(run.course, d, dt);
    this.collectibles.update(run.course, d, time);
    this.runner.update(run, dt, time, mood);
    this.guard.update(run, dt, time);
    this.effects.frame(run, dt, time);
    this.chase.update(run, dt, time);
    this.relight(d, dt);
    this.sky.follow(this.chase.camera);
    // The sun keeps pace with the runner so its light falls the same way all along the track.
    this.sun.position.set(run.runner.x + 8, 14, -d + 6);
    this.sun.target.position.set(run.runner.x, 0, -d - 6);
  }

  private relight(distance: number, dt: number): void {
    const l = lightAt(distance, this.light);
    const inside = this.scenery.tunnelAt(distance + 2) ? 1 : 0;
    this.dark += (inside - this.dark) * (1 - Math.exp(-5 * dt));
    const k = 1 - 0.55 * this.dark;
    this.sky.set(l.skyTop, l.skyHorizon, l.sun);
    this.sky.tintClouds(CLOUD.copy(l.skyHorizon).lerp(WHITE, 0.55));
    this.fog.color.copy(l.fog).lerp(TUNNEL_FOG, this.dark * 0.8);
    this.sun.color.copy(l.sun);
    this.sun.intensity = l.sunIntensity * k;
    this.hemi.color.copy(l.hemiSky);
    this.hemi.groundColor.copy(l.hemiGround);
    this.hemi.intensity = 1.25 * (1 - 0.35 * this.dark);
  }

  dispose(): void {
    this.runner.dispose();
    this.guard.dispose();
    this.effects.dispose();
    this.collectibles.dispose();
    this.scenery.dispose();
    this.sky.dispose();
    this.scene.clear();
  }
}

const TUNNEL_FOG = new THREE.Color(0x1a1a24);
const WHITE = new THREE.Color(0xffffff);
const CLOUD = new THREE.Color();
