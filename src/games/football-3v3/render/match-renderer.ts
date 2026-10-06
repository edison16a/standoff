import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { CameraDirector } from "./camera/director";
import { CeremonyScene } from "./ceremony/ceremony-scene";
import { BallTrace, type TracePoint } from "./effects/ball-trace";
import { ScrimmageLines } from "./field/scrimmage-lines";
import { Stadium } from "./field/stadium";
import { Squad } from "./figures/squad";
import { NameTags, type TagOf } from "./figures/tags";
import { AthleteMaterials } from "./materials/athlete-materials";
import { glossEnvironment } from "./materials/gloss-env";
import { AthleteShapes } from "./models/athlete-shapes";

export interface RendererOptions {
  /**
   * "low" drops shadows, antialiasing and the crowd and draws at a lower
   * resolution, for software graphics in browser tests. "film" is "high"
   * without antialiasing, for the showcase capture.
   */
  quality?: "high" | "low" | "film";
  /** Draws at this share of the screen's resolution. */
  scale?: number;
}

/**
 * Draws a football match under the lights: the stadium and field, the
 * broadcast lines, the players and the ball, filmed by the director's
 * camera. It only reads match views, so live play and slow motion
 * replays go through the same drawing.
 */
export class MatchRenderer {
  readonly director = new CameraDirector();
  readonly squad: Squad;
  /** The replay's traced ball path. */
  readonly trace = new BallTrace();
  private readonly tags = new NameTags();
  private tagOf: TagOf | null = null;
  private traceAt: number | null = null;
  private readonly renderer: THREE.WebGLRenderer;
  /** The world drawn; the showcase adds its film lights to it. */
  readonly scene = new THREE.Scene();
  private readonly stadium: Stadium;
  private readonly lines = new ScrimmageLines();
  /** The trophy, lights and confetti of the presentation at the end. */
  private readonly ceremony = new CeremonyScene();
  private readonly handL = new THREE.Vector3();
  private readonly handR = new THREE.Vector3();
  private readonly sun: THREE.DirectionalLight;
  private readonly environment: THREE.Texture;
  /** What helmets and visors mirror: the floodlights against the night. */
  private readonly gloss: THREE.Texture;
  private readonly materials: AthleteMaterials;
  private readonly shapes: AthleteShapes;
  private readonly low: boolean;
  private readonly scale: number;
  private last = 0;
  private excitement = 0.1;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.low = options.quality === "low";
    this.scale = options.scale ?? 1;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: options.quality === "high" || options.quality === undefined, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.3;
    this.gloss = glossEnvironment(this.renderer);
    this.materials = new AthleteMaterials(this.low ? "low" : "high", this.gloss);
    // Software drawing gets the light bodies only; a real card swaps by distance.
    this.shapes = new AthleteShapes(!this.low);
    this.squad = new Squad({ materials: this.materials, shapes: this.shapes });
    this.scene.fog = new THREE.Fog("#0b1330", 140, 420);
    // Stadium lights from high above: a cool fill from the sky and one strong key that casts the shadows.
    this.scene.add(new THREE.HemisphereLight("#c9d8ff", "#1f3a1f", 1.1));
    this.sun = new THREE.DirectionalLight("#fff6e0", 2.4);
    this.sun.castShadow = !this.low;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -30;
    sc.right = 30;
    sc.top = 30;
    sc.bottom = -30;
    sc.near = 10;
    sc.far = 120;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);
    this.stadium = new Stadium(this.low, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.stadium.group, this.lines.group, this.squad.group, this.trace.group, this.tags.group, this.ceremony.group);
  }

  /** What the last frame drew: draw calls, triangles, and the geometries and textures held. */
  get info(): { calls: number; triangles: number; geometries: number; textures: number } {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures };
  }

  resize(width: number, height: number, dpr: number): void {
    const ratio = (this.low ? 0.6 : Math.min(dpr, 1.5)) * this.scale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.director.setAspect(width / Math.max(1, height));
  }

  /** Who gets a name tag over their helmet: the players people control. */
  setTags(tagOf: TagOf | null): void {
    this.tagOf = tagOf;
  }

  /** The replay's ball path and the match time the replay is at, or null outside a replay. */
  setTrace(points: readonly TracePoint[] | null, time: number | null): void {
    this.trace.set(points);
    this.traceAt = time;
  }

  onEvent(event: MatchEvent): void {
    switch (event.type) {
      case "tackle":
        this.director.bump(event.sack ? 0.7 : 0.45);
        break;
      case "pads":
        if (event.power > 0.7) this.director.bump(0.2);
        break;
      case "touchdown":
        this.excitement = 1;
        break;
      case "lineUp":
        this.excitement = 0.1;
        break;
      case "fieldGoal":
        if (event.good) this.excitement = 0.8;
        break;
      default:
        break;
    }
  }

  draw(view: MatchView, nowMs: number): void {
    this.update(view, nowMs);
    this.renderer.render(this.scene, this.director.camera);
  }

  /** Everything a frame does except drawing it. */
  update(view: MatchView, nowMs: number): void {
    const dt = this.last ? Math.min(0.1, Math.max(0, nowMs - this.last) / 1000) : 1 / 60;
    this.last = nowMs;
    const time = nowMs / 1000;
    this.squad.update(view, dt, time, this.director.camera);
    this.lines.update(view, dt);
    this.director.update(view, dt, time);
    this.trace.update(this.traceAt);
    const holding = this.captainHands(view);
    this.ceremony.update(view.ceremony, holding ? this.handL : null, holding ? this.handR : null, dt, time);
    this.tags.update(view, this.tagOf, this.squad, this.director.camera.fov);
    this.stadium.crowd?.setExcitement(view.phase === "over" ? 0.8 : this.excitement);
    this.stadium.update(time, dt, view.ball.goal, view.kick !== null);
    // The shadow box follows the action so its detail is spent where the camera looks.
    const at = view.ball;
    this.sun.target.position.set(at.x, 0, at.z);
    this.sun.position.set(at.x - 25, 60, at.z + 30);
  }

  /** Where the captain's hands are, into handL and handR, while he has the trophy. */
  private captainHands(view: MatchView): boolean {
    const id = view.ceremony?.captain ?? null;
    const figure = id !== null ? this.squad.figure(id) : null;
    if (!figure) return false;
    figure.rig.handL.getWorldPosition(this.handL);
    figure.rig.handR.getWorldPosition(this.handR);
    return true;
  }

  /** Plays a frozen moment forward without drawing, so eased poses settle before a still. */
  settle(view: MatchView, nowMs: number, seconds: number): void {
    for (let t = 0; t < seconds; t += 1 / 30) this.squad.update(view, 1 / 30, (nowMs - (seconds - t) * 1000) / 1000);
  }

  dispose(): void {
    this.squad.dispose();
    this.materials.dispose();
    this.shapes.dispose();
    this.gloss.dispose();
    this.ceremony.dispose();
    this.trace.dispose();
    this.tags.dispose();
    this.lines.dispose();
    this.stadium.dispose();
    this.environment.dispose();
    this.renderer.dispose();
  }
}
