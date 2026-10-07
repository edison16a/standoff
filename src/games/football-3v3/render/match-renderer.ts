import * as THREE from "three";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { focusBand, lookFor } from "./broadcast-look";
import { CameraDirector } from "./camera/director";
import { CeremonyScene } from "./ceremony/ceremony-scene";
import { BallTrace, type TracePoint } from "./effects/ball-trace";
import { ScrimmageLines } from "./field/scrimmage-lines";
import { Stadium } from "./field/stadium";
import { Squad } from "./figures/squad";
import { NameTags, type TagOf } from "./figures/tags";
import { ContactShadows } from "./lighting/contact-shadows";
import { Floodlights } from "./lighting/floodlights";
import { stadiumEnvironment } from "./lighting/stadium-env";
import { AthleteMaterials } from "./materials/athlete-materials";
import { AthleteShapes } from "./models/athlete-shapes";
import { Picture, type Quality } from "./picture";

export interface RendererOptions {
  /** "high" for a real card, "film" for the showcase capture (fixed quality), "low" for software drawing in browser tests. */
  quality?: Quality;
  /** Draws at this share of the screen's resolution. */
  scale?: number;
}

/**
 * Draws a football match under the lights: the stadium and field, the
 * broadcast lines, the players and the ball, filmed by the director's
 * camera and finished like a broadcast. It only reads match views, so
 * live play and slow motion replays go through the same drawing.
 */
export class MatchRenderer {
  readonly director = new CameraDirector();
  readonly squad: Squad;
  /** The replay's traced ball path. */
  readonly trace = new BallTrace();
  /** The world drawn; the showcase adds its film lights to it. */
  readonly scene = new THREE.Scene();
  /** Drawn over the graded picture: the name tags. */
  private readonly overlay = new THREE.Scene();
  readonly picture: Picture;
  readonly floods: Floodlights;
  private readonly tags = new NameTags();
  private tagOf: TagOf | null = null;
  private traceAt: number | null = null;
  private readonly stadium: Stadium;
  private readonly lines = new ScrimmageLines();
  private readonly contacts = new ContactShadows();
  /** The trophy, lights and confetti of the presentation at the end. */
  private readonly ceremony = new CeremonyScene();
  private readonly handL = new THREE.Vector3();
  private readonly handR = new THREE.Vector3();
  /** The stadium as everything shiny sees it, and the soft light from all round. */
  private readonly environment: THREE.Texture;
  private readonly materials: AthleteMaterials;
  private readonly shapes: AthleteShapes;
  private readonly low: boolean;
  private readonly scale: number;
  private last = 0;
  private excitement = 0.1;
  private graded = false;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    const quality = options.quality ?? "high";
    this.low = quality === "low";
    this.scale = options.scale ?? 1;
    this.picture = new Picture(canvas, quality);
    const renderer = this.picture.renderer;
    this.environment = stadiumEnvironment(renderer);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 1;
    this.materials = new AthleteMaterials(this.low ? "low" : "high", this.environment);
    // Software drawing gets the light bodies only; a real card swaps by distance.
    this.shapes = new AthleteShapes(!this.low);
    this.squad = new Squad({ materials: this.materials, shapes: this.shapes });
    // The night air holds a little haze: far stands fade toward the sky's glow.
    this.scene.fog = new THREE.FogExp2("#141a2c", 0.0028);
    this.floods = new Floodlights(!this.low);
    this.picture.governor.onTier((tier) => this.floods.setTier(tier));
    this.stadium = new Stadium(this.low, renderer.capabilities.getMaxAnisotropy());
    this.picture.governor.onTier((tier) => this.stadium.crowd?.setFull(tier.fullCrowd));
    this.scene.add(this.floods.group, this.stadium.group, this.lines.group, this.contacts.mesh, this.squad.group, this.trace.group, this.ceremony.group);
    this.overlay.add(this.tags.group);
  }

  /** What the last frame drew, every pass included: draw calls, triangles, and the geometries and textures held. */
  get info(): { calls: number; triangles: number; geometries: number; textures: number; rung: number; gpuMs: number | null } {
    const i = this.picture.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, rung: this.picture.governor.rung, gpuMs: this.picture.governor.gpuMs };
  }

  resize(width: number, height: number, dpr: number): void {
    this.picture.resize(width, height, (this.low ? 0.6 : Math.min(dpr, 1.5)) * this.scale);
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
    this.picture.draw(this.scene, this.director.camera, this.overlay);
  }

  /** Everything a frame does except drawing it. */
  update(view: MatchView, nowMs: number): void {
    const dt = this.last ? Math.min(0.1, Math.max(0, nowMs - this.last) / 1000) : 1 / 60;
    this.last = nowMs;
    const time = nowMs / 1000;
    const camera = this.director.camera;
    this.squad.update(view, dt, time, camera);
    this.lines.update(view, dt);
    const cut = this.director.update(view, dt, time);
    this.trace.update(this.traceAt);
    const holding = this.captainHands(view);
    this.ceremony.update(view.ceremony, holding ? this.handL : null, holding ? this.handR : null, dt, time);
    this.tags.update(view, this.tagOf, this.squad, camera.fov);
    // Broadcast graphics like the tags: the showcase's film has neither.
    this.contacts.update(view, this.squad);
    this.stadium.update(view, time, dt, view.phase === "over" ? 0.8 : this.excitement);
    // The floods dim for the presentation so its spotlights carry the scene.
    this.floods.dim(view.ceremony ? 0.5 : 1);
    this.floods.update(dt);
    this.stadium.lamps.setLevel(this.floods.brightness);
    this.scene.environmentIntensity = 0.45 + 0.55 * this.floods.brightness;
    this.floods.follow(view.ball.x, view.ball.z);
    this.grade(view, dt, cut);
  }

  /** Eases the picture's grade toward the moment's look, focusing the lens on the replay's subject. */
  private grade(view: MatchView, dt: number, cut: boolean): void {
    const replay = this.director.replayShot;
    this.picture.grade(lookFor(view, replay), dt, cut || !this.graded);
    this.graded = true;
    const band = focusBand(view, replay, this.director.camera.position);
    if (band) this.picture.focus(band.distance, band.range);
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
    this.ceremony.dispose();
    this.trace.dispose();
    this.tags.dispose();
    this.lines.dispose();
    this.contacts.dispose();
    this.floods.dispose();
    this.stadium.dispose();
    this.environment.dispose();
    this.picture.dispose();
  }
}
