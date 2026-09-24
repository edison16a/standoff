import * as THREE from "three";
import type { Seat } from "@/platform/protocol";
import { Effects } from "./effects/effects";
import { gunSpot } from "./gun-layout";
import { GunRig } from "./gun-rig";
import { addLights } from "./lights";
import { QualityGovernor } from "./quality";
import { createBooth } from "./models/booth";
import { createCanopy } from "./models/canopy";
import type { Bulbs } from "./models/bulbs";
import { createWaves } from "./models/waves";
import type { Shooter, StageEvent, StageSource } from "./stage-source";
import { TargetViews } from "./target-views";

/** The most pixels per CSS pixel drawn. Past this a laptop spends its frame budget on detail nobody sees. */
const MAX_PIXEL_RATIO = 1.75;

/**
 * Draws the booth with three.js: the fixed set, every target, each
 * player's gun and laser, and the effects. The session hands it the
 * state each frame and tells it about shots as they happen.
 */
export class GalleryRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly targets = new TargetViews();
  private readonly effects = new Effects();
  private readonly bulbs: Bulbs;
  private readonly rigs = new Map<Seat, { rig: GunRig; finish: string }>();
  private readonly releaseLights: () => void;
  private readonly unlisten: () => void;
  private readonly aim = new THREE.Vector3();
  private readonly quality = new QualityGovernor(MAX_PIXEL_RATIO);
  private lastNow = 0;
  private flashUntil = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly source: StageSource,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color("#140b10");
    this.releaseLights = addLights(this.scene, this.renderer);
    const canopy = createCanopy();
    this.bulbs = canopy.bulbs;
    this.scene.add(createBooth(), canopy.object, createWaves(), this.targets.object, this.effects.object);
    this.unlisten = source.listen((event) => this.react(event));
  }

  resize(width: number, height: number, dpr: number): void {
    this.quality.setMax(Math.min(dpr, MAX_PIXEL_RATIO));
    this.renderer.setPixelRatio(this.quality.ratio);
    this.renderer.setSize(width, height, false);
    this.source.camera.resize(width / Math.max(1, height));
  }

  /** One frame. `nowMs` is the animation frame's timestamp. */
  render(nowMs: number): void {
    this.source.tick(nowMs);
    const now = nowMs / 1000;
    const dt = Math.min(0.05, Math.max(0, now - (this.lastNow || now)));
    if (this.lastNow && this.quality.frame((now - this.lastNow) * 1000)) this.renderer.setPixelRatio(this.quality.ratio);
    this.lastNow = now;
    const round = this.source.round();
    this.targets.update(round.targets, round.time);
    const phase = this.source.phase();
    this.updateGuns(this.source.shooters(), phase === "lobby", now, dt);
    this.bulbs.update(now, now < this.flashUntil ? "flash" : phase === "lobby" || phase === "results" ? "chase" : "steady");
    this.effects.update(now, dt);
    this.renderer.render(this.scene, this.source.camera.camera);
  }

  dispose(): void {
    this.unlisten();
    for (const { rig } of this.rigs.values()) rig.dispose();
    this.releaseLights();
    // Free everything on the graphics card, so opening another room starts clean.
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
    this.renderer.dispose();
  }

  private react(event: StageEvent): void {
    const now = performance.now() / 1000;
    if (event.type === "phase") {
      if (event.phase === "results") {
        this.flashUntil = now + 1.6;
        this.effects.confetti.start(now, event.winnerColours);
      } else if (event.phase === "lobby" || event.phase === "countdown") this.effects.confetti.stop();
      return;
    }
    const entry = this.rigs.get(event.shot.seat);
    if (!entry) return;
    entry.rig.fire(now);
    const from = entry.rig.muzzle(new THREE.Vector3());
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(entry.rig.object.quaternion);
    const to = new THREE.Vector3(event.shot.point.x, event.shot.point.y, event.shot.point.z);
    this.effects.shot({ from, forward, to, colour: event.colour, kind: event.shot.kind, points: event.shot.points, bull: event.shot.bull }, now);
  }

  /** Adds, removes and moves the guns so there is exactly one per shooter. */
  private updateGuns(shooters: readonly Shooter[], lobby: boolean, now: number, dt: number): void {
    const wanted = new Set(shooters.map((s) => s.seat));
    for (const [seat, { rig }] of this.rigs) {
      if (wanted.has(seat)) continue;
      this.scene.remove(rig.object, rig.laser.object);
      rig.dispose();
      this.rigs.delete(seat);
    }
    shooters.forEach((shooter, index) => {
      let entry = this.rigs.get(shooter.seat);
      if (!entry) {
        entry = { rig: new GunRig(shooter.finish, shooter.colour), finish: shooter.finish };
        this.rigs.set(shooter.seat, entry);
        this.scene.add(entry.rig.object, entry.rig.laser.object);
      }
      if (entry.finish !== shooter.finish) {
        entry.rig.gun.setFinish(shooter.finish);
        entry.finish = shooter.finish;
      }
      entry.rig.place(gunSpot(index, shooters.length, lobby));
      const aim = shooter.aim ? this.aim.set(shooter.aim.x, shooter.aim.y, shooter.aim.z) : null;
      entry.rig.update(now, dt, aim);
    });
  }
}
